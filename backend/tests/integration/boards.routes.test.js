const request = require('supertest');
const app = require('../../app');
const { sequelize, User, Role, Permission, Denuncia } = require('../../models/rel');

describe('Boards pessoais e analíticos', () => {
  let citizen, analyst, other;
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
    const [permission, publicPermission] = await Promise.all([
      Permission.create({ key: 'dashboard.full.view', description: 'Consultar painel completo' }),
      Permission.create({ key: 'dashboard.public.view', description: 'Consultar indicadores públicos' })
    ]);
    const role = await Role.create({ name: 'ANALYST', description: 'Analista' });
    await role.addPermission(permission);
    await (await User.findByPk(analyst.id)).addRole(role);
    const citizenRole = await Role.findOne({ where: { name: 'CITIZEN' } });
    await citizenRole.addPermission(publicPermission);
    await Denuncia.bulkCreate([
      ...Array.from({ length: 3 }, (_, i) => ({ titulo: `Minha aberta ${i}`, status: 'aprovada', resolucaoStatus: 'aberta', userId: citizen.id })),
      { titulo: 'Minha resolvida', status: 'aprovada', resolucaoStatus: 'resolvida', userId: citizen.id },
      { titulo: 'Minha pendente', status: 'pendente', userId: citizen.id },
      { titulo: 'Privada de outro autor', status: 'rejeitada', userId: other.id }
    ].map(report => ({ descricao: 'Descrição pública', localizacao: 'Cotia', categoria: 'Outros', setorResponsavel: 'Defesa Civil', tituloOriginal: 'Texto reservado para censura', ...report })));
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
  });
  test('board comunitário mostra somente denúncias aprovadas e indicadores agregados', async () => {
    const response = await get('/boards/public', citizen);
    expect(response.status).toBe(200);
    expect(response.body.scope).toBe('public');
    expect(response.body.summary).toMatchObject({ total: 4, aberta: 3, resolvida: 1, pendente: 0, rejeitada: 0 });
    expect(response.body.columns.map(column => column.key)).toEqual(['aberta', 'em_andamento', 'resolvida']);
    expect(response.body.breakdown.locations).toEqual([{ label: 'Cotia', total: 4 }]);
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
    expect(response.body.columns.find(item => item.key === 'rejeitada').reports[0].titulo).toBe('Privada de outro autor');
    expect(JSON.stringify(response.body)).not.toContain('Texto reservado para censura');
  });
  test('filtros afetam os totais e entradas inválidas são rejeitadas', async () => {
    expect((await get('/boards/analytics', analyst, { categoria: 'Inexistente' })).body.summary.total).toBe(0);
    for (const query of [{ page: 'abc' }, { limit: 0 }, { limit: 100 }, { column: 'qualquer' }, { categoria: ['a', 'b'] }]) {
      expect((await get('/boards/mine', citizen, query)).status).toBe(400);
    }
  });
});
