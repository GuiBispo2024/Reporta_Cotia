const request = require('supertest');
const { randomUUID } = require('crypto');
const app = require('../../app');
const { sequelize, Denuncia, PushDevice, PushPreference, NotificationEvent, NotificationDelivery, AuthSession } = require('../../models/rel');
const service = require('../../services/NotificationService');
const reports = require('../../services/DenunciaService');
const { runBatch } = require('../../notifications/worker');
const { ExpoPushProvider } = require('../../notifications/ExpoPushProvider');
describe('Push privado e outbox persistida', () => {
  let owner, other, report, device, provider, time;
  const account = async name => {
    await request(app).post('/users').send({ username: name, email: `${name}@example.com`, password: '123456' });
    const login = await request(app).post('/users/login').send({ email: `${name}@example.com`, password: '123456' });
    const session = await AuthSession.findOne({ where: { userId: login.body.user.id } });
    return { id: login.body.user.id, token: login.body.token, sessionId: session.id };
  };
  const input = () => ({ installationId: randomUUID(), expoPushToken: `ExpoPushToken[${randomUUID()}]`, platform: 'android', consent: true });
  const record = type => sequelize.transaction(tx => service.record(report, type, null, tx));
  const work = now => runBatch({ enabled: true, provider, now: now ?? time, log: jest.fn() });
  beforeAll(async () => { await sequelize.sync({ force: true }); owner = await account('push-owner'); other = await account('push-other'); });
  beforeEach(async () => {
    await NotificationDelivery.destroy({ where: {} }); await NotificationEvent.destroy({ where: {} }); await PushDevice.destroy({ where: {} }); await PushPreference.destroy({ where: {} }); await Denuncia.destroy({ where: {} });
    report = await Denuncia.create({ userId: owner.id, titulo: 'Informação privada', descricao: 'Endereço reservado 123', localizacao: 'Cotia', categoria: 'Outros', status: 'pendente' });
    device = await service.register(owner.id, owner.sessionId, input());
    provider = { send: jest.fn().mockResolvedValue([{ status: 'ok', id: 'ticket-1' }]), receipts: jest.fn().mockResolvedValue({ 'ticket-1': { status: 'ok' } }) };
    time = Date.now() + 1000;
  });
  afterAll(() => sequelize.close());
  test('endpoints exigem sessão e rejeitam proprietário fornecido pelo cliente', async () => {
    await expect(service.register(owner.id, owner.sessionId, { ...input(), expoPushToken: 'invalid' })).rejects.toMatchObject({ statusCode: 400 });
    expect((await request(app).get('/notifications/preferences')).status).toBe(401);
    expect((await request(app).post('/notifications/devices').set('Authorization', `Bearer ${owner.token}`).send({ ...input(), userId: other.id })).status).toBe(400);
    expect((await request(app).patch('/notifications/preferences').set('Authorization', `Bearer ${owner.token}`).set('X-Push-Account', String(other.id)).send({ enabled: false })).status).toBe(409);
    const response = await request(app).get('/notifications/preferences').set('Authorization', `Bearer ${owner.token}`);
    expect(response.status).toBe(200); expect(JSON.stringify(response.body)).not.toMatch(/expoPushToken|installationId|sessionId/);
  });
  test('registro idempotente, rotação e remoção protegida por versão e autoria', async () => {
    const stored = await PushDevice.findByPk(device.id);
    const body = { installationId: stored.installationId, expoPushToken: stored.expoPushToken, platform: 'android', consent: false };
    expect((await service.register(owner.id, owner.sessionId, body)).version).toBe(1);
    const rotated = await service.register(owner.id, owner.sessionId, { ...body, expoPushToken: input().expoPushToken });
    expect(rotated.version).toBe(2);
    await service.removeDevice(other.id, device.id); await service.removeDevice(owner.id, device.id, 1);
    expect(await PushDevice.findByPk(device.id)).not.toBeNull();
    await service.removeDevice(owner.id, device.id, 2); expect(await PushDevice.findByPk(device.id)).toBeNull();
  });
  test('troca de conta desativa instalação e cancela entrega antiga', async () => {
    await record('aprovada'); const stored = await PushDevice.findByPk(device.id);
    const moved = await service.register(other.id, other.sessionId, { installationId: stored.installationId, expoPushToken: stored.expoPushToken, platform: 'ios', consent: false });
    expect(moved.enabled).toBe(false); expect((await service.preferences(owner.id)).devices).toHaveLength(0);
    await service.removeDevice(owner.id, device.id); expect(await PushDevice.findByPk(device.id)).not.toBeNull();
    await work(); expect(provider.send).not.toHaveBeenCalled();
  });
  test('quatro transições reais; repetição, motivo e setor não geram eventos', async () => {
    await reports.moderar(report.id, 'rejeitada', 'Corrigir', other.id);
    await reports.moderar(report.id, 'rejeitada', 'Outro motivo', other.id);
    await reports.moderar(report.id, 'aprovada', null, other.id);
    await reports.moderar(report.id, 'aprovada', null, other.id);
    await reports.atualizarResolucao(report.id, 'em_andamento', {}, other.id);
    await reports.atualizarResolucao(report.id, 'em_andamento', { setorResponsavel: 'Defesa Civil' }, other.id);
    await reports.atualizarResolucao(report.id, 'resolvida', {}, other.id);
    expect((await NotificationEvent.findAll()).map(e => e.eventType)).toEqual(['rejeitada', 'aprovada', 'em_andamento', 'resolvida']);
    expect(await NotificationDelivery.count()).toBe(4); expect(provider.send).not.toHaveBeenCalled();
  });
  test('rollback desfaz denúncia e evento; evento por histórico é único', async () => {
    await expect(sequelize.transaction(async tx => { await reports.moderar(report.id, 'aprovada', null, other.id, tx); throw new Error('rollback'); })).rejects.toThrow('rollback');
    expect((await report.reload()).status).toBe('pendente'); expect(await NotificationEvent.count()).toBe(0);
    await reports.moderar(report.id, 'aprovada', null, other.id);
    const event = await NotificationEvent.findOne();
    await sequelize.transaction(tx => service.record(report, 'aprovada', event.historyId, tx));
    expect(await NotificationEvent.count()).toBe(1); expect(await NotificationDelivery.count()).toBe(1);
  });
  test('aceitação e receipt são fases distintas; payload e logs não contêm conteúdo privado', async () => {
    await record('aprovada'); await work();
    expect((await NotificationDelivery.findOne()).status).toBe('accepted');
    expect(provider.send.mock.calls[0][0][0]).toMatchObject({ data: { type: 'report_update' } });
    expect(JSON.stringify(provider.send.mock.calls)).not.toMatch(/Informação privada|Endereço reservado|denunciaId|latitude/);
    await work(time + 15 * 60000); expect((await NotificationDelivery.findOne()).status).toBe('provider_confirmed'); expect(provider.send).toHaveBeenCalledTimes(1);
  });
  test('concorrência usa claim atômico e não repete POST aceito', async () => {
    await record('resolvida'); await Promise.all([work(), work()]); expect(provider.send).toHaveBeenCalledTimes(1);
    await work(); expect(provider.send).toHaveBeenCalledTimes(1);
  });
  test('resposta perdida fica unknown e não é reenviada automaticamente', async () => {
    await record('aprovada'); provider.send.mockRejectedValue(Object.assign(new Error('timeout'), { ambiguous: true }));
    await work(); await work(time + 999999); expect((await NotificationDelivery.findOne()).status).toBe('unknown'); expect(provider.send).toHaveBeenCalledTimes(1);
  });
  test('429 tem backoff e limite de tentativas', async () => {
    await record('aprovada'); provider.send.mockRejectedValue(Object.assign(new Error('rate'), { code: 'HTTP_429', retryable: true }));
    await work(); expect((await NotificationDelivery.findOne()).status).toBe('pending'); await work(); expect(provider.send).toHaveBeenCalledTimes(1);
    for (let i = 1; i < 5; i++) await work(time + i * 3600000);
    expect((await NotificationDelivery.findOne()).status).toBe('failed'); expect(provider.send).toHaveBeenCalledTimes(5);
  });
  test.each(['claimed', 'sending', 'checking'])('reinício recupera lease %s com semântica segura', async status => {
    await record('aprovada');
    await NotificationDelivery.update({ status, leaseId: randomUUID(), leaseUntil: new Date(time - 1), ticketId: 'ticket-1', providerAcceptedAt: new Date(time - 1000) }, { where: {} });
    await work();
    expect(provider.send).toHaveBeenCalledTimes(status === 'claimed' ? 1 : 0);
    expect((await NotificationDelivery.findOne()).status).toBe(status === 'sending' ? 'unknown' : status === 'checking' ? 'provider_confirmed' : 'accepted');
  });
  test('token inválido é desativado sem persistir token em logs', async () => {
    await record('rejeitada'); provider.send.mockResolvedValue([{ status: 'error', code: 'DeviceNotRegistered' }]);
    const log = jest.fn(); await runBatch({ enabled: true, provider, now: time, log });
    expect((await PushDevice.findByPk(device.id)).enabled).toBe(false); expect(JSON.stringify(log.mock.calls)).not.toContain('ExpoPushToken');
  });
  test('receipt de token inválido desativa dispositivo; token rotacionado não recebe entrega antiga', async () => {
    await record('aprovada'); await work(); provider.receipts.mockResolvedValue({ 'ticket-1': { status: 'error', code: 'DeviceNotRegistered' } });
    await work(time + 15 * 60000); expect((await PushDevice.findByPk(device.id)).enabled).toBe(false);
    const saved = await PushDevice.findByPk(device.id);
    await service.register(owner.id, owner.sessionId, { installationId: saved.installationId, expoPushToken: input().expoPushToken, platform: 'android', consent: true });
    await record('resolvida'); await work(time + 16 * 60000);
    await service.register(owner.id, owner.sessionId, { installationId: saved.installationId, expoPushToken: input().expoPushToken, platform: 'android', consent: true });
    await work(time + 32 * 60000); expect((await PushDevice.findByPk(device.id)).enabled).toBe(true);
  });
  test.each(['preference', 'revoked', 'expired'])('%s impede envio e evento continua protegido por autoria', async kind => {
    const event = await record('aprovada');
    await expect(service.resolve(other.id, event.id)).rejects.toMatchObject({ statusCode: 404 });
    expect((await service.resolve(owner.id, event.id)).denunciaId).toBe(report.id);
    if (kind === 'preference') await service.setPreferences(owner.id, { enabled: false });
    else await AuthSession.update(kind === 'revoked' ? { revokedAt: new Date() } : { expiresAt: new Date(time - 1) }, { where: { id: owner.sessionId } });
    await work(); expect(provider.send).not.toHaveBeenCalled();
    await AuthSession.update({ revokedAt: null, expiresAt: new Date(Date.now() + 3600000) }, { where: { id: owner.sessionId } });
    await report.destroy(); await expect(service.resolve(owner.id, event.id)).rejects.toMatchObject({ statusCode: 404 });
  });
  test('provider real é bloqueado no ambiente de testes e worker é opt-in', async () => {
    await expect(new ExpoPushProvider().send([])).rejects.toThrow();
    expect(await runBatch({ enabled: false, provider })).toEqual({ enabled: false, processed: 0 }); expect(provider.send).not.toHaveBeenCalled();
  });
});
