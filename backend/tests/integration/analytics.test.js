const request = require('supertest');
const { DataTypes } = require('sequelize');
const app = require('../../app');
const { sequelize, Denuncia, DenunciaHistorico, AnalyticsFacts, AnalyticsAggregates, AnalyticsRuns, User, Role, Permission } = require('../../models/rel');
const AnalyticsService = require('../../services/AnalyticsService');
const { refreshAnalytics } = require('../../analytics/process');
const migration = require('../../migrations/202609260001-create-analytics');
const analyst = { id: 1, permissions: ['dashboard.full.view'] };
const citizen = { id: 2, permissions: ['dashboard.public.view'] };
const input = overrides => ({ titulo: 'Título pessoal não analítico', descricao: 'Descrição reservada', localizacao: 'Rua Privada 123, Cotia', bairro: 'Jd. São José', categoria: 'Outros', status: 'aprovada', resolucaoStatus: 'aberta', setorResponsavel: 'Obras', createdAt: new Date('2026-01-01T12:00:00Z'), ...overrides });
let tokens;
const get = (path, token, query = {}) => request(app).get(path).set('Authorization', `Bearer ${token}`).query(query);

beforeAll(async () => {
  await sequelize.sync({ force: true });
  // Exercise the real migration as well as model definitions.
  await migration.down(sequelize.getQueryInterface());
  await migration.up(sequelize.getQueryInterface(), DataTypes);
  tokens = {};
  for (const name of ['citizen', 'analyst', 'admin', 'moderator']) {
    await request(app).post('/users').send({ username: `analytics-${name}`, email: `analytics-${name}@example.com`, password: '123456' });
    const response = await request(app).post('/users/login').send({ email: `analytics-${name}@example.com`, password: '123456' });
    tokens[name] = response.body.token;
    if (name !== 'citizen') {
      const [role] = await Role.findOrCreate({ where: { name: name.toUpperCase() }, defaults: { description: name } });
      const [permission] = await Permission.findOrCreate({ where: { key: name === 'moderator' ? 'moderation.view' : 'dashboard.full.view' }, defaults: { description: name } });
      await role.addPermission(permission);
      await (await User.findByPk(response.body.user.id)).addRole(role);
    }
  }
  const [publicPermission] = await Permission.findOrCreate({ where: { key: 'dashboard.public.view' }, defaults: { description: 'Público' } });
  await (await Role.findOne({ where: { name: 'CITIZEN' } })).addPermission(publicPermission);
});
afterAll(() => sequelize.close());

test('sem primeira carga informa indisponibilidade sem confundir com atualização', async () => {
  const result = await AnalyticsService.indicators(analyst);
  expect(result).toMatchObject({ status: 'not_processed', lastUpdatedAt: null, summary: { total: 0 }, metrics: { averageResolutionHours: null } });
});

test('carga reconcilia fatos, médias ponderadas, normalização e dados inválidos', async () => {
  const first = await Denuncia.create(input({ resolucaoStatus: 'resolvida' }));
  const second = await Denuncia.create(input({ bairro: ' JARDIM SAO JOSE ', resolucaoStatus: 'resolvida' }));
  await Denuncia.bulkCreate([
    input({ status: 'pendente', bairro: null, categoria: '', localizacao: 'Cotia' }),
    input({ status: 'rejeitada', bairro: 'Centro', createdAt: new Date('2026-02-01') }),
    input({ createdAt: new Date('2099-01-01') })
  ]);
  await DenunciaHistorico.bulkCreate([
    { denunciaId: first.id, tipo: 'moderacao', statusNovo: 'aprovada', createdAt: new Date('2026-01-02T12:00:00Z') },
    { denunciaId: first.id, tipo: 'resolucao', statusNovo: 'resolvida', createdAt: new Date('2026-01-04T12:00:00Z') },
    { denunciaId: first.id, tipo: 'resolucao', statusNovo: 'resolvida', createdAt: new Date('2026-01-05T12:00:00Z') },
    { denunciaId: second.id, tipo: 'moderacao', statusNovo: 'aprovada', createdAt: new Date('2026-01-04T12:00:00Z') },
    { denunciaId: second.id, tipo: 'resolucao', statusNovo: 'resolvida', createdAt: new Date('2026-01-08T12:00:00Z') }
  ]);
  await refreshAnalytics();
  const result = await AnalyticsService.indicators(analyst);
  expect(await AnalyticsFacts.count()).toBe(5);
  expect(result.summary).toMatchObject({ total: 4, approved: 2, resolvida: 2, pendente: 1, rejeitada: 1, resolutionRate: 100 });
  expect(result.metrics).toEqual({ averageModerationHours: 48, averageResolutionHours: 72, moderationSampleSize: 2, resolutionSampleSize: 2 });
  expect(result.breakdown.neighborhoods).toEqual([{ label: 'Jardim Sao Jose', total: 2 }, { label: 'Centro', total: 1 }]);
  expect(result.breakdown.categories).toEqual([{ label: 'Outros', total: 3 }]);
  expect(result.quality).toMatchObject({ sourceCount: 5, validCount: 4, excludedCount: 1, issueCount: 3 });
  const publicResult = await AnalyticsService.indicators(citizen, {}, 'public');
  expect(publicResult.summary.total).toBe(2);
  expect(publicResult).not.toHaveProperty('quality');
  for (const data of [result, publicResult, await AnalyticsFacts.findAll(), await AnalyticsAggregates.findAll()]) {
    expect(JSON.stringify(data)).not.toMatch(/Título pessoal|Descrição reservada|Rua Privada|userId|latitude|longitude/);
  }
});

test('reprocessamento é idempotente e a leitura não consulta a origem', async () => {
  const before = await AnalyticsService.indicators(analyst);
  await refreshAnalytics();
  const sourceSpy = jest.spyOn(Denuncia, 'findAll').mockRejectedValue(new Error('não consultar origem'));
  try {
    const after = await AnalyticsService.indicators(analyst);
    expect(after.summary).toEqual(before.summary);
    expect(after.metrics).toEqual(before.metrics);
    expect(await AnalyticsFacts.count()).toBe(5);
    expect(sourceSpy).not.toHaveBeenCalled();
  } finally { sourceSpy.mockRestore(); }
});

test('filtros combinados, período inclusivo e bairro normalizado respeitam o recorte', async () => {
  const result = await AnalyticsService.indicators(analyst, { bairro: 'jd. são josé', categoria: 'Outros', setorResponsavel: 'Obras', dataInicio: '2026-01-01', dataFim: '2026-01-01' });
  expect(result.summary.total).toBe(2);
  expect(result.comparison.previous.total).toBe(0);
  expect(result.comparison.changes.totalPercent).toBeNull();
  expect((await AnalyticsService.indicators(analyst, { categoria: 'Inexistente' })).summary.total).toBe(0);
  const board = await get('/boards/analytics', tokens.analyst, { bairro: 'Jardim Sao Jose', dataInicio: '2026-01-01', dataFim: '2026-01-01' });
  expect(board.status).toBe(200);
  expect(board.body.summary.total).toBe(2);
  expect(board.body.columns.find(column => column.key === 'resolvida').reports).toHaveLength(2);
  const empty = await get('/boards/analytics', tokens.analyst, { bairro: "x' OR 1=1 --" });
  expect(empty.status).toBe(200);
  expect(empty.body.columns.every(column => column.total === 0)).toBe(true);
});

test('qualidade é paginada e fornece totais do recorte sem conteúdo livre', async () => {
  const response = await get('/boards/analytics/quality', tokens.analyst, { limit: '1' });
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ total: 3, page: 1, totalPages: 3, summary: { sourceCount: 5, excludedCount: 1 } });
  expect(response.body.data).toHaveLength(1);
  expect(Object.keys(response.body.data[0]).sort()).toEqual(['denunciaId', 'eligible', 'issues']);
  const next = await get('/boards/analytics/quality', tokens.analyst, { page: '2', limit: '1' });
  expect(next.body.data[0].denunciaId).not.toBe(response.body.data[0].denunciaId);
  const filtered = await get('/boards/analytics/quality', tokens.analyst, { bairro: 'Centro' });
  expect(filtered.body.total).toBe(1);
});

test('endpoints protegem dados restritos e validam filtros', async () => {
  for (const path of ['/boards/analytics/indicators', '/boards/analytics/quality']) {
    expect((await request(app).get(path)).status).toBe(401);
    expect((await get(path, tokens.citizen)).status).toBe(403);
    expect((await get(path, tokens.moderator)).status).toBe(403);
    expect((await get(path, tokens.admin)).status).toBe(200);
    expect((await get(path, tokens.analyst)).status).toBe(200);
    for (const query of [{ dataInicio: '2026-02-30' }, { dataFim: 'inválida' }, { dataInicio: '2026-02-02', dataFim: '2026-01-01' }, { bairro: ['Centro', 'Outro'] }]) {
      expect((await get(path, tokens.analyst, query)).status).toBe(400);
    }
  }
  expect((await get('/boards/analytics/quality', tokens.analyst, { limit: '101' })).status).toBe(400);
  const publicResponse = await get('/boards/public/indicators', tokens.citizen);
  expect(publicResponse.status).toBe(200);
  expect(publicResponse.body.summary).toMatchObject({ total: 2, pendente: 0, rejeitada: 0 });
  expect(publicResponse.body).not.toHaveProperty('quality');
});

test('falha reverte publicação e permite reexecução sem duplicar', async () => {
  const before = await AnalyticsService.indicators(analyst);
  const failingWrite = jest.spyOn(AnalyticsAggregates, 'bulkCreate').mockRejectedValueOnce(new Error('SQL secreto'));
  await expect(refreshAnalytics()).rejects.toThrow('SQL secreto');
  failingWrite.mockRestore();
  const after = await AnalyticsService.indicators(analyst);
  expect(after.lastUpdatedAt).toEqual(before.lastUpdatedAt);
  expect(after.summary).toEqual(before.summary);
  expect(await AnalyticsFacts.count()).toBe(5);
  const failure = await AnalyticsRuns.findOne({ order: [['id', 'DESC']] });
  expect(failure).toMatchObject({ status: 'failed', errorCode: 'PROCESSING_FAILED' });
  const quality = await AnalyticsService.quality(analyst);
  expect(quality.lastAttempt.status).toBe('failed');
  expect(JSON.stringify(quality)).not.toContain('SQL secreto');
  await refreshAnalytics();
  expect((await AnalyticsService.indicators(analyst)).summary).toEqual(before.summary);
});

test('impede execuções simultâneas no processo', async () => {
  const first = refreshAnalytics();
  await expect(refreshAnalytics()).rejects.toMatchObject({ code: 'ANALYTICS_BUSY' });
  await first;
});

test('edições e exclusões só alteram indicadores após nova carga', async () => {
  const before = await AnalyticsService.indicators(analyst);
  const rejected = await Denuncia.findOne({ where: { status: 'rejeitada' } });
  await rejected.destroy();
  const approved = await Denuncia.findOne({ where: { status: 'aprovada' } });
  await approved.update({ categoria: 'Limpeza urbana' });
  expect((await AnalyticsService.indicators(analyst)).summary).toEqual(before.summary);
  await refreshAnalytics();
  const after = await AnalyticsService.indicators(analyst);
  expect(after.summary.total).toBe(3);
  expect(after.breakdown.categories).toContainEqual({ label: 'Limpeza urbana', total: 1 });
  expect(await AnalyticsFacts.count()).toBe(4);
});

test('médias combinam somas e amostras de grupos diferentes, sem média de médias', async () => {
  const reports = await Denuncia.bulkCreate([0, 1, 2].map(index => input({
    categoria: 'Saneamento', bairro: index === 2 ? 'Outro Bairro' : 'Centro',
    createdAt: new Date('2026-03-01T00:00:00Z'), resolucaoStatus: 'resolvida'
  })));
  for (const [index, report] of reports.entries()) {
    const approval = new Date(`2026-03-0${index === 2 ? 6 : 2}T00:00:00Z`);
    const resolution = new Date(approval.getTime() + 24 * 3600000);
    await DenunciaHistorico.bulkCreate([
      { denunciaId: report.id, tipo: 'moderacao', statusNovo: 'aprovada', createdAt: approval },
      { denunciaId: report.id, tipo: 'resolucao', statusNovo: 'resolvida', createdAt: resolution }
    ]);
  }
  await refreshAnalytics();
  const result = await AnalyticsService.indicators(analyst, { categoria: 'Saneamento' });
  expect(result.metrics).toMatchObject({ averageModerationHours: 56, moderationSampleSize: 3, averageResolutionHours: 24, resolutionSampleSize: 3 });
});

test('processa mais de um lote sem perder ou duplicar denúncias', async () => {
  await Denuncia.bulkCreate(Array.from({ length: 501 }, () => input({ categoria: 'Água e esgoto', status: 'pendente' })));
  const read = jest.spyOn(Denuncia, 'findAll');
  try {
    await refreshAnalytics();
    expect(read).toHaveBeenCalledTimes(3); // two batches plus the end-of-stream read
    const result = await AnalyticsService.indicators(analyst, { categoria: 'Água e esgoto' });
    expect(result.summary).toMatchObject({ total: 501, pendente: 501 });
    expect(await AnalyticsFacts.count({ where: { categoria: 'Água e esgoto' } })).toBe(501);
  } finally { read.mockRestore(); }
});
