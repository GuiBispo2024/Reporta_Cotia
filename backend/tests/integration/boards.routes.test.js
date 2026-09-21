const request = require('supertest');
const ExcelJS = require('exceljs');
const app = require('../../app');
const { sequelize, User, Role, Permission, Denuncia, DenunciaHistorico, Comment, BoardExportHistory } = require('../../models/rel');

describe('Boards pessoais e analíticos', () => {
  let citizen, analyst, other;
  const binaryParser = (response, callback) => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => callback(null, Buffer.concat(chunks)));
  };
  const account = async name => {
    await request(app).post('/users').send({ username: name, email: `${name}@example.com`, password: '123456' });
    const login = await request(app).post('/users/login').send({ email: `${name}@example.com`, password: '123456' });
    return { token: login.body.token, id: login.body.user.id };
  };
  const get = (path, user, query = {}) => request(app).get(path).set('Authorization', `Bearer ${user.token}`).query(query);
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    citizen = await account('board-citizen');
    other = await account('board-other');
    analyst = await account('board-analyst');
    const [permission, publicPermission, exportPermission] = await Promise.all([
      Permission.create({ key: 'dashboard.full.view', description: 'Consultar painel completo' }),
      Permission.create({ key: 'dashboard.public.view', description: 'Consultar indicadores públicos' }),
      Permission.create({ key: 'dashboard.export', description: 'Exportar painel completo' })
    ]);
    const role = await Role.create({ name: 'ANALYST', description: 'Analista' });
    await role.addPermissions([permission, exportPermission]);
    await (await User.findByPk(analyst.id)).addRole(role);
    const citizenRole = await Role.findOne({ where: { name: 'CITIZEN' } });
    await citizenRole.addPermission(publicPermission);
    await Denuncia.bulkCreate([
      ...Array.from({ length: 3 }, (_, i) => ({ titulo: `Minha aberta ${i}`, status: 'aprovada', resolucaoStatus: 'aberta', latitude: -23.60 - i * 0.01, longitude: -46.92 - i * 0.01, userId: citizen.id })),
      { titulo: 'Minha resolvida', bairro: 'Granja Viana', status: 'aprovada', resolucaoStatus: 'resolvida', latitude: -23.63, longitude: -46.95, createdAt: new Date('2026-01-15T12:00:00.000Z'), userId: citizen.id },
      { titulo: 'Minha pendente', status: 'pendente', latitude: -23.64, longitude: -46.96, userId: citizen.id },
      { titulo: 'Privada de outro autor', status: 'rejeitada', tituloCensurado: true, motivoRejeicao: 'Endereço insuficiente', latitude: -23.65, longitude: -46.97, userId: other.id }
    ].map(report => ({ descricao: 'Descrição pública', localizacao: 'Cotia', bairro: 'Centro', categoria: 'Outros', setorResponsavel: 'Defesa Civil', tituloOriginal: 'Texto reservado para censura', ...report })));
    const resolvedReport = await Denuncia.findOne({ where: { titulo: 'Minha resolvida' } });
    await Comment.create({ comentario: 'Conteúdo ocultado', censurado: true, denunciaId: resolvedReport.id, userId: citizen.id });
    await DenunciaHistorico.bulkCreate([
      { tipo: 'moderacao', statusAnterior: 'pendente', statusNovo: 'aprovada', denunciaId: resolvedReport.id, createdAt: new Date('2026-01-16T12:00:00.000Z') },
      { tipo: 'resolucao', statusAnterior: 'aberta', statusNovo: 'resolvida', denunciaId: resolvedReport.id, createdAt: new Date('2026-01-18T12:00:00.000Z') }
    ]);
  });
  afterAll(() => sequelize.close());

  test('exige login e impede que cidadão acesse o board analítico', async () => {
    expect((await request(app).get('/boards/mine')).status).toBe(401);
    expect((await get('/boards/analytics', citizen)).status).toBe(403);
  });
  test('board pessoal usa o autor autenticado, sem vazar registros ou contagens', async () => {
    const response = await get('/boards/mine', citizen, { userId: other.id });
    expect(response.status).toBe(200);
    expect(response.body.summary).toMatchObject({ total: 5, aberta: 3, resolvida: 1, pendente: 1, rejeitada: 0, resolutionRate: 25 });
    expect(JSON.stringify(response.body)).not.toContain('Privada de outro autor');
    expect(JSON.stringify(response.body)).not.toContain('tituloOriginal');
    expect(response.body).not.toHaveProperty('map');
    expect(response.body).not.toHaveProperty('moderation');
    expect(response.body).not.toHaveProperty('comparison');
    expect(response.body).not.toHaveProperty('categoryTrend');
  });
  test('board comunitário mostra somente denúncias aprovadas e indicadores agregados', async () => {
    const response = await get('/boards/public', citizen);
    expect(response.status).toBe(200);
    expect(response.body.scope).toBe('public');
    expect(Number.isNaN(Date.parse(response.body.generatedAt))).toBe(false);
    expect(response.body.summary).toMatchObject({ total: 4, aberta: 3, resolvida: 1, pendente: 0, rejeitada: 0 });
    expect(response.body.columns.map(column => column.key)).toEqual(['aberta', 'em_andamento', 'resolvida']);
    expect(response.body.breakdown.locations).toEqual([{ label: 'Cotia', total: 4 }]);
    expect(response.body.breakdown.neighborhoods).toEqual([{ label: 'Centro', total: 3 }, { label: 'Granja Viana', total: 1 }]);
    expect(response.body.map).toMatchObject({ total: 4, limit: 500, truncated: false });
    expect(response.body.map.points).toHaveLength(4);
    expect(response.body.map.points.every(point => point.status === 'aprovada')).toBe(true);
    expect(response.body).not.toHaveProperty('moderation');
    expect(response.body).not.toHaveProperty('comparison');
    expect(response.body).not.toHaveProperty('categoryTrend');
    expect(response.body.map.points[0]).toEqual(expect.objectContaining({ latitude: expect.anything(), longitude: expect.anything() }));
    expect(JSON.stringify(response.body)).not.toContain('Minha pendente');
    expect(JSON.stringify(response.body)).not.toContain('Privada de outro autor');
    expect((await get('/boards/public', citizen, { column: 'rejeitada' })).status).toBe(400);
  });
  test('pagina cada coluna sem alterar os indicadores gerais', async () => {
    const first = await get('/boards/mine', citizen, { column: 'aberta', limit: 2 });
    const next = await get('/boards/mine', citizen, { column: 'aberta', limit: 2, page: 2 });
    expect(first.body.columns).toHaveLength(1);
    expect(first.body.columns[0]).toMatchObject({ total: 3, totalPages: 2, page: 1 });
    expect(next.body.columns[0].reports).toHaveLength(1);
    expect(next.body.summary.total).toBe(5);
    expect(first.body.columns[0].reports.map(item => item.id)).not.toContain(next.body.columns[0].reports[0].id);
  });
  test('analista vê totais, distribuição e detalhes, sem originais censurados', async () => {
    const response = await get('/boards/analytics', analyst);
    expect(response.status).toBe(200);
    expect(response.body.summary.total).toBe(6);
    expect(response.body.breakdown.categories).toEqual([{ label: 'Outros', total: 6 }]);
    expect(response.body.breakdown.neighborhoods).toEqual([{ label: 'Centro', total: 5 }, { label: 'Granja Viana', total: 1 }]);
    expect(response.body.map).toMatchObject({ total: 6, truncated: false });
    expect(response.body.metrics).toEqual({
      averageModerationHours: 24,
      averageResolutionHours: 48,
      moderationSampleSize: 1,
      resolutionSampleSize: 1
    });
    expect(response.body.moderation).toEqual({
      pending: 1,
      approved: 4,
      rejected: 1,
      censoredReports: 1,
      censoredComments: 1,
      censoredTotal: 2,
      rejectionReasons: [{ label: 'Endereço insuficiente', total: 1 }]
    });
    expect(response.body).not.toHaveProperty('comparison');
    expect(response.body.trend.reduce((total, item) => total + item.total, 0)).toBe(6);
    expect(response.body.trend).toContainEqual({ period: '2026-01', total: 1 });
    const otherCategoryTrend = response.body.categoryTrend.series.find(item => item.label === 'Outros');
    const januaryIndex = response.body.categoryTrend.periods.indexOf('2026-01');
    expect(otherCategoryTrend.total).toBe(6);
    expect(otherCategoryTrend.values[januaryIndex]).toBe(1);
    expect(response.body.columns.find(item => item.key === 'rejeitada').reports[0].titulo).toBe('Privada de outro autor');
    expect(JSON.stringify(response.body)).not.toContain('Texto reservado para censura');
  });
  test('filtra indicadores, colunas e mapa pelo período inclusivo informado', async () => {
    const previousReport = await Denuncia.create({
      titulo: 'Denúncia do período anterior',
      descricao: 'Registro usado na comparação',
      localizacao: 'Cotia',
      bairro: 'Centro',
      categoria: 'Outros',
      setorResponsavel: 'Defesa Civil',
      status: 'aprovada',
      resolucaoStatus: 'aberta',
      createdAt: new Date('2025-12-15T12:00:00.000Z'),
      userId: citizen.id
    });
    const response = await get('/boards/analytics', analyst, { dataInicio: '2026-01-01', dataFim: '2026-01-31' });
    await previousReport.destroy();
    expect(response.status).toBe(200);
    expect(response.body.summary).toMatchObject({ total: 1, resolvida: 1 });
    expect(response.body.columns.find(item => item.key === 'resolvida').reports[0].titulo).toBe('Minha resolvida');
    expect(response.body.breakdown.categories).toEqual([{ label: 'Outros', total: 1 }]);
    expect(response.body.breakdown.neighborhoods).toEqual([{ label: 'Granja Viana', total: 1 }]);
    expect(response.body.map).toMatchObject({ total: 1 });
    expect(response.body.trend).toEqual([{ period: '2026-01', total: 1 }]);
    expect(response.body.categoryTrend).toEqual({
      periods: ['2026-01'],
      series: [{ label: 'Outros', total: 1, values: [1] }]
    });
    expect(response.body.filters).toMatchObject({ dataInicio: '2026-01-01', dataFim: '2026-01-31' });
    expect(response.body.moderation).toMatchObject({
      pending: 0,
      approved: 1,
      rejected: 0,
      censoredReports: 0,
      censoredComments: 1,
      censoredTotal: 1,
      rejectionReasons: []
    });
    expect(response.body.comparison).toEqual({
      current: expect.objectContaining({ dataInicio: '2026-01-01', dataFim: '2026-01-31', total: 1, approved: 1, resolvida: 1, resolutionRate: 100 }),
      previous: expect.objectContaining({ dataInicio: '2025-12-01', dataFim: '2025-12-31', total: 1, approved: 1, aberta: 1, resolutionRate: 0 }),
      changes: {
        totalPercent: 0,
        approvedPercent: 0,
        resolvedPercent: null,
        rejectedPercent: 0,
        resolutionRatePoints: 100
      }
    });
  });
  test('filtros afetam os totais e entradas inválidas são rejeitadas', async () => {
    expect((await get('/boards/analytics', analyst, { categoria: 'Inexistente' })).body.summary.total).toBe(0);
    const neighborhood = await get('/boards/analytics', analyst, { bairro: 'Granja Viana' });
    expect(neighborhood.body.summary.total).toBe(1);
    expect(neighborhood.body.filters.bairro).toBe('Granja Viana');
    for (const query of [{ page: 'abc' }, { limit: 0 }, { limit: 100 }, { column: 'qualquer' }, { categoria: ['a', 'b'] }, { bairro: ['a', 'b'] }, { dataInicio: '20/01/2026' }, { dataFim: '2026-02-30' }, { dataInicio: '2026-02-01', dataFim: '2026-01-01' }]) {
      expect((await get('/boards/mine', citizen, query)).status).toBe(400);
    }
  });
  test('exporta XLSX formatado com os mesmos filtros e exige permissão específica', async () => {
    expect((await get('/boards/analytics/export', citizen)).status).toBe(403);
    expect(await BoardExportHistory.count()).toBe(0);
    const response = await request(app)
      .get('/boards/analytics/export')
      .set('Authorization', `Bearer ${analyst.token}`)
      .query({ dataInicio: '2026-01-01', dataFim: '2026-01-31' })
      .buffer(true)
      .parse(binaryParser);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.headers['content-disposition']).toMatch(/reporta-cotia-denuncias-\d{4}-\d{2}-\d{2}\.xlsx/);
    expect(response.headers['x-total-count']).toBe('1');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body);
    const worksheet = workbook.getWorksheet('Denúncias');
    expect(worksheet.rowCount).toBe(2);
    expect(worksheet.getRow(1).values.slice(1, 5)).toEqual(['ID', 'Título', 'Categoria', 'Situação']);
    expect(worksheet.getCell('B2').value).toBe('Minha resolvida');
    expect(worksheet.getCell('G1').value).toBe('Bairro');
    expect(worksheet.getCell('G2').value).toBe('Granja Viana');
    expect(worksheet.getCell('H2').value).toEqual(new Date('2026-01-15T09:00:00.000Z'));
    expect(worksheet.getCell('H2').numFmt).toBe('dd/mm/yyyy hh:mm');
    expect(worksheet.getColumn(2).width).toBe(38);
    expect(worksheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(JSON.stringify(worksheet.getSheetValues())).not.toContain('Minha aberta 0');
    expect(JSON.stringify(worksheet.getSheetValues())).not.toContain('Texto reservado para censura');
    const audit = await BoardExportHistory.findOne();
    expect(audit).toMatchObject({
      userId: analyst.id,
      format: 'xlsx',
      recordCount: 1
    });
    expect(audit.filters).toEqual({
      categoria: null,
      setorResponsavel: null,
      bairro: null,
      dataInicio: '2026-01-01',
      dataFim: '2026-01-31'
    });
  });
});
