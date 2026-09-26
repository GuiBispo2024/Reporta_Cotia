const { sequelize, User, Denuncia, DenunciaHistorico } = require('../../models/rel');
const DenunciaService = require('../../services/DenunciaService');
const UserService = require('../../services/UserService');
let owner;
beforeAll(async () => {
  await sequelize.sync({ force: true });
  owner = await UserService.register({ username: 'integrity', email: 'integrity@example.com', password: '123456' });
});
afterAll(() => sequelize.close());
afterEach(() => jest.restoreAllMocks());
const report = overrides => Denuncia.create({ titulo: 'Teste', descricao: 'Descrição', localizacao: 'Rua A', userId: owner.id, ...overrides });

test('rejects resolution before approval', async () => {
  const row = await report();
  await expect(DenunciaService.atualizarResolucao(row.id, 'resolvida', {}, owner.id)).rejects.toMatchObject({ statusCode: 409 });
  expect((await row.reload()).resolucaoStatus).toBe('aberta');
});

test('rolls back status when history persistence fails', async () => {
  const row = await report();
  jest.spyOn(DenunciaHistorico, 'create').mockRejectedValue(new Error('history unavailable'));
  await expect(DenunciaService.moderar(row.id, 'aprovada', null, owner.id)).rejects.toThrow('history unavailable');
  expect((await row.reload()).status).toBe('pendente');
});

test('repeated approval does not duplicate history', async () => {
  const row = await report();
  await DenunciaService.moderar(row.id, 'aprovada', null, owner.id);
  await DenunciaService.moderar(row.id, 'aprovada', null, owner.id);
  expect(await DenunciaHistorico.count({ where: { denunciaId: row.id } })).toBe(1);
});

test('rolls back resolution when history fails', async () => {
  const row = await report({ status: 'aprovada' });
  jest.spyOn(DenunciaHistorico, 'create').mockRejectedValue(new Error('history unavailable'));
  await expect(DenunciaService.atualizarResolucao(row.id, 'resolvida', {}, owner.id)).rejects.toThrow('history unavailable');
  expect((await row.reload()).resolucaoStatus).toBe('aberta');
});

test('account removal preserves approved reports without author association', async () => {
  const row = await report({ status: 'aprovada' });
  await UserService.delete(owner.id, '123456');
  expect(await User.findByPk(owner.id)).toBeNull();
  expect((await row.reload()).userId).toBeNull();
  expect(row.status).toBe('aprovada');
});
