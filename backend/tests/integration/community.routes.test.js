const request = require('supertest');
const app = require('../../app');
const { sequelize, Denuncia, Permission, Role, User } = require('../../models/rel');
let owner, other, report;
const login = async name => {
  await request(app).post('/users').send({ username: name, email: `${name}@example.com`, password: '123456' });
  const response = await request(app).post('/users/login').send({ email: `${name}@example.com`, password: '123456' });
  return { id: response.body.user.id, token: response.body.token };
};
beforeAll(async () => {
  await sequelize.sync({ force: true });
  owner = await login('map-owner'); other = await login('map-other');
  const records = await Denuncia.bulkCreate([
    { titulo: 'Buraco junto casa 123', status: 'aprovada', resolucaoStatus: 'aberta' },
    { titulo: 'Sem GPS', status: 'aprovada', latitude: null, longitude: null },
    { titulo: 'GPS inválido', status: 'aprovada', latitude: 99 },
    { titulo: 'Andamento', status: 'aprovada', resolucaoStatus: 'em_andamento', userId: other.id },
    { titulo: 'Resolvida', status: 'aprovada', resolucaoStatus: 'resolvida', categoria: 'Iluminação pública', userId: other.id },
    { titulo: 'Segredo pendente', status: 'pendente' }, { titulo: 'Segredo rejeitado', status: 'rejeitada' },
  ].map(item => ({ userId: owner.id, descricao: 'Descrição', localizacao: 'Rua Particular 123', bairro: 'Casa 55', categoria: 'Outros', latitude: -23.612345, longitude: -46.923456, ...item })));
  report = records[0];
});
afterAll(() => sequelize.close());

test('visitante e conta recebem somente projeção mínima aprovada, com indicadores globais e limite explícito', async () => {
  const guest = await request(app).get('/community');
  const account = await request(app).get('/community').auth(owner.token, { type: 'bearer' });
  expect(guest.status).toBe(200); expect(guest.headers['cache-control']).toBe('no-store');
  expect(account.body.points).toEqual(guest.body.points);
  expect(guest.body).toMatchObject({ scope: 'community', summary: { total: 5, em_andamento: 1, resolvida: 1 }, total: 3, limit: 500, truncated: false, privacy: { coordinatePrecision: 2, approximate: true, addressIncluded: false } });
  expect(guest.body.categories.reduce((sum, item) => sum + item.total, 0)).toBe(5);
  for (const point of guest.body.points) expect(point).toMatchObject({ status: 'aprovada', latitude: -23.61, longitude: -46.92 });
  expect(JSON.stringify(guest.body)).not.toMatch(/Segredo|Rua Particular|userId|email|descricao|imageUrl|motivoRejeicao|Casa 55|612345/);
  expect(JSON.stringify(guest.body.points)).not.toMatch(/123|55/);
});

test('filtros de categoria/resolução são aplicados no servidor e dados inválidos são rejeitados', async () => {
  const filtered = await request(app).get('/community').query({ categoria: 'Iluminação pública', resolucaoStatus: 'resolvida' });
  expect(filtered.body.summary.total).toBe(1); expect(filtered.body.points[0].titulo).toBe('Resolvida');
  const empty = await request(app).get('/community').query({ categoria: 'Inexistente' });
  expect(empty.body.summary.total).toBe(0); expect(empty.body.points).toEqual([]);
  for (const query of [{ userId: other.id }, { status: 'pendente' }, { resolucaoStatus: 'pendente' }, { categoria: ['a', 'b'] }]) expect((await request(app).get('/community').query(query)).status).toBe(400);
});

test('consultas públicas antigas não permitem recuperar coordenadas/endereço originais; autor conserva acesso privado', async () => {
  for (const localizacao of ['Rua Particular 123', 'Latitude -23.612345', 'Rua Particular %', 'Rua Particular _']) {
    const probe = await request(app).get('/denuncia').query({ localizacao });
    expect(probe.status).toBe(400); expect(probe.body.code).toBe('PRIVATE_LOCATION_FILTER');
  }
  for (const url of ['/denuncia', '/denuncia?page=1', '/denuncia/filter?sort=likes', `/denuncia/public/user/${owner.id}`]) {
    const response = await request(app).get(url);
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toMatch(/Rua Particular|612345|923456|Casa 55/);
  }
  const guest = await request(app).get(`/denuncia/${report.id}`);
  expect(guest.body).toMatchObject({ latitude: -23.61, longitude: -46.92, locationApproximate: true });
  const outsider = await request(app).get(`/denuncia/${report.id}`).auth(other.token, { type: 'bearer' });
  expect(outsider.body.locationApproximate).toBe(true);
  const privateReport = await request(app).get(`/denuncia/${report.id}`).auth(owner.token, { type: 'bearer' });
  expect(Number(privateReport.body.latitude)).toBe(-23.612345); expect(privateReport.body.localizacao).toBe('Rua Particular 123');
  expect(Number((await report.reload()).latitude)).toBe(-23.612345);
});

test('routers de boards continuam protegidos e mapas públicos antigos também generalizam', async () => {
  for (const path of ['/boards/public', '/boards/public/indicators', '/boards/public/map-points', '/boards/analytics']) expect((await request(app).get(path)).status).toBe(401);
  expect((await request(app).get('/boards/analytics').auth(owner.token, { type: 'bearer' })).status).toBe(403);
  const [permission] = await Permission.findOrCreate({ where: { key: 'dashboard.public.view' }, defaults: { description: 'Comunidade' } });
  const role = await Role.findOne({ where: { name: 'CITIZEN' } }); await role.addPermission(permission);
  const points = await request(app).get('/boards/public/map-points').auth(owner.token, { type: 'bearer' });
  expect(points.status).toBe(200); expect(JSON.stringify(points.body)).not.toMatch(/Rua Particular|612345|923456|Casa 55/);
  const web = await request(app).get('/boards/public').auth(owner.token, { type: 'bearer' });
  const indicators = await request(app).get('/boards/public/indicators').auth(owner.token, { type: 'bearer' });
  expect(web.body.summary.total).toBe(5); expect(indicators.body.summary.total).toBe(5);
  expect(web.body.breakdown.categories).toEqual(indicators.body.breakdown.categories);
  await report.update({ status: 'rejeitada' });
  expect((await request(app).get('/community')).body.summary.total).toBe(4);
  expect((await request(app).get(`/denuncia/${report.id}`)).status).toBe(404);
  await report.update({ status: 'aprovada' });
});

test('grande volume permanece limitado e a resposta declara truncamento', async () => {
  const created = await Denuncia.bulkCreate(Array.from({ length: 501 }, () => ({ userId: owner.id, titulo: 'Ponto', descricao: 'Volume de teste', localizacao: 'Cotia', categoria: 'Outros', status: 'aprovada', latitude: -23.61, longitude: -46.92 })));
  try {
    const response = await request(app).get('/community');
    expect(response.status).toBe(200);
    expect(response.body.points).toHaveLength(500); expect(response.body.truncated).toBe(true); expect(response.body.total).toBe(504);
    expect(response.body.summary.total).toBe(506);
  } finally { await Denuncia.destroy({ where: { id: created.map(point => point.id) } }); }
});
