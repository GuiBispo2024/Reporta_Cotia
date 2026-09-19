const bcrypt = require('bcryptjs');
const runSeeds = require('../../seed/runSeeds');
const {
  sequelize, User, Denuncia, Comment, Like, Share, DenunciaHistorico,
  UserRoleHistory, Role, Permission, UserRole, RolePermission
} = require('../../models/rel');
const { CATEGORIAS } = require('../../utils/validateDenuncia');
const { PERMISSIONS } = require('../../constants/accessControl');
const UserService = require('../../services/UserService');
const DenunciaService = require('../../services/DenunciaService');

jest.setTimeout(30000);

beforeAll(async () => { await sequelize.sync({ force: true }); });
afterAll(async () => { await sequelize.close(); });

test('gera cenários coerentes e pode ser repetida preservando dados existentes', async () => {
  const unrelated = await User.create({ username: 'Conta existente', email: 'existente@example.com', password: 'hash-existente' });
  const { users, reports } = await runSeeds();

  expect(await User.count()).toBe(6);
  expect(await Role.count()).toBe(4);
  expect(await Permission.count()).toBe(Object.keys(PERMISSIONS).length);
  for (const [key, role] of Object.entries({ citizen: 'CITIZEN', neighbor: 'CITIZEN', moderator: 'MODERATOR', analyst: 'ANALYST', admin: 'ADMIN' })) {
    const login = await UserService.login({ email: users[key].email, password: 'ReportaCotia123!' });
    expect(login.user.roles).toEqual(expect.arrayContaining(['CITIZEN', role]));
    expect(login.user).not.toHaveProperty('password');
    expect(await bcrypt.compare('ReportaCotia123!', users[key].password)).toBe(true);
  }
  const analyst = await UserService.getMe(users.analyst.id);
  expect(analyst.permissions).toContain(PERMISSIONS.DASHBOARD_FULL_VIEW);
  expect(analyst.permissions).not.toContain(PERMISSIONS.MODERATION_REVIEW);
  expect(await UserRoleHistory.count()).toBe(2);

  const allReports = await Denuncia.findAll();
  expect(allReports).toHaveLength(10);
  expect(new Set(allReports.map(report => report.categoria))).toEqual(new Set(CATEGORIAS));
  expect(new Set(allReports.map(report => report.status))).toEqual(new Set(['pendente', 'aprovada', 'rejeitada']));
  expect(new Set(allReports.map(report => report.resolucaoStatus))).toEqual(new Set(['aberta', 'em_andamento', 'resolvida']));
  expect(reports.rejeitada.motivoRejeicao).toBeTruthy();
  expect(reports.censura.descricaoCensurada).toBe(true);
  expect(reports.censura.descricaoOriginal).toContain('merda');
  expect(reports.censura.descricao).not.toContain('merda');
  for (const report of allReports) {
    expect(report.imageUrl).toBeNull();
    expect(report.imageUrls).toEqual([]);
    const history = await DenunciaHistorico.findAll({ where: { denunciaId: report.id }, order: [['id', 'ASC']] });
    const moderation = history.filter(item => item.tipo === 'moderacao');
    expect(moderation).toHaveLength(report.status === 'pendente' ? 0 : 1);
    if (moderation.length) expect(moderation[0].statusNovo).toBe(report.status);
    const resolution = history.filter(item => item.tipo === 'resolucao');
    if (resolution.length) {
      const latest = resolution[resolution.length - 1];
      expect(latest.statusNovo).toBe(report.resolucaoStatus);
      expect(latest.responsavel).toBe(report.setorResponsavel);
      expect(report.resolucaoAtualizadaEm).not.toBeNull();
    }
    for (const item of history) expect(item.userId).toBe(users.moderator.id);
  }
  expect(await Comment.count()).toBe(3);
  expect(await Like.count()).toBe(10);
  expect(await Share.count()).toBe(2);
  for (const Model of [Comment, Like, Share]) {
    for (const item of await Model.findAll()) {
      expect((await Denuncia.findByPk(item.denunciaId)).status).toBe('aprovada');
      if (item.parentCommentId) {
        const parent = await Comment.findByPk(item.parentCommentId);
        expect(parent.denunciaId).toBe(item.denunciaId);
        expect(parent.parentCommentId).toBeNull();
      }
    }
  }
  expect(await Comment.count({ where: { censurado: true, censuraRevisada: false } })).toBe(1);

  const models = [User, Denuncia, Comment, Like, Share, DenunciaHistorico, UserRoleHistory, Role, Permission, UserRole, RolePermission];
  const counts = await Promise.all(models.map(model => model.count()));
  await runSeeds();
  expect(await Promise.all(models.map(model => model.count()))).toEqual(counts);
  expect((await unrelated.reload()).password).toBe('hash-existente');

  // Uma nova execução não deve desfazer moderação nem recriar interações privadas.
  await DenunciaService.moderar(reports.obras.id, 'rejeitada', 'Precisa corrigir o endereço.', users.moderator.id);
  await users.citizen.update({ password: 'senha-alterada' });
  await runSeeds();
  expect((await reports.obras.reload()).status).toBe('rejeitada');
  expect((await users.citizen.reload()).password).toBe('senha-alterada');
  for (const Model of [Like, Share]) {
    expect(await Model.count({ where: { denunciaId: reports.obras.id } })).toBe(0);
  }
  // O serviço preserva comentários antigos, mas a seed não insere novos.
  expect(await Comment.count({ where: { denunciaId: reports.obras.id } })).toBe(3);
});
