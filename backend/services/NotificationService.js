const { Op } = require('sequelize');
const { sequelize, PushPreference, PushDevice, NotificationEvent, NotificationDelivery, Denuncia, User } = require('../models/rel');
const AppError = require('../utils/AppError');
const templates = require('../notifications/templates');
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function validateId(id) { if (typeof id !== 'string' || !UUID.test(id)) throw new AppError('Identificador inválido.', 400, 'VALIDATION_ERROR'); }
function fields(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw new AppError('Parâmetros inválidos.', 400, 'VALIDATION_ERROR');
}
async function cancel(deviceId, transaction) {
  await NotificationDelivery.update({ status: 'canceled', leaseId: null, leaseUntil: null, lastError: 'DEVICE_DISABLED' }, {
    where: { pushDeviceId: deviceId, status: { [Op.in]: ['pending', 'claimed'] } }, transaction
  });
}
const safeDevice = device => ({ id: device.id, platform: device.platform, enabled: device.enabled, version: device.version, lastSeenAt: device.lastSeenAt });
class NotificationService {
  static async register(userId, sessionId, body) {
    fields(body, ['installationId', 'expoPushToken', 'platform', 'consent']); validateId(body.installationId);
    if (typeof body.expoPushToken !== 'string' || !/^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(body.expoPushToken)
      || !['android', 'ios'].includes(body.platform) || typeof body.consent !== 'boolean') throw new AppError('Registro de notificações inválido.', 400, 'VALIDATION_ERROR');
    return sequelize.transaction(async transaction => {
      // Serialize with preference changes and outbox fanout for this account.
      await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
      const [preference] = await PushPreference.findOrCreate({ where: { userId }, defaults: { enabled: false }, transaction });
      const existing = await PushDevice.findOne({ where: { installationId: body.installationId }, transaction, lock: transaction.LOCK.UPDATE });
      const tokenOwner = await PushDevice.findOne({ where: { expoPushToken: body.expoPushToken }, transaction });
      if (tokenOwner && tokenOwner.id !== existing?.id) throw new AppError('Token já vinculado a outra instalação.', 409, 'PUSH_TOKEN_IN_USE');
      const transferred = existing && existing.userId !== userId;
      const enabled = body.consent || (!!existing?.enabled && !transferred && preference.enabled);
      if (body.consent && !preference.enabled) await preference.update({ enabled: true }, { transaction });
      if (existing && (transferred || existing.sessionId !== sessionId || existing.expoPushToken !== body.expoPushToken || !enabled)) await cancel(existing.id, transaction);
      const values = { userId, sessionId, expoPushToken: body.expoPushToken, platform: body.platform, enabled,
        lastSeenAt: new Date(), version: existing ? existing.version + ((transferred || existing.sessionId !== sessionId || existing.expoPushToken !== body.expoPushToken || existing.enabled !== enabled) ? 1 : 0) : 1 };
      const device = existing ? await existing.update(values, { transaction }) : await PushDevice.create({ ...values, installationId: body.installationId }, { transaction });
      return safeDevice(device);
    }).catch(error => {
      if (error.name === 'SequelizeUniqueConstraintError') throw new AppError('Registro concorrente de instalação. Tente novamente.', 409, 'PUSH_REGISTRATION_CONFLICT');
      throw error;
    });
  }
  static async preferences(userId) {
    const preference = await PushPreference.findByPk(userId);
    const devices = await PushDevice.findAll({ where: { userId }, order: [['createdAt', 'ASC']] });
    return { enabled: !!preference?.enabled, devices: devices.map(safeDevice) };
  }
  static async setPreferences(userId, body) {
    fields(body, ['enabled']);
    if (typeof body.enabled !== 'boolean') throw new AppError('Informe enabled booleano.', 400, 'VALIDATION_ERROR');
    await sequelize.transaction(async transaction => {
      await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
      const [preference] = await PushPreference.findOrCreate({ where: { userId }, defaults: { enabled: false }, transaction });
      await preference.update({ enabled: body.enabled }, { transaction });
      if (!body.enabled) {
        const devices = await PushDevice.findAll({ where: { userId }, transaction });
        for (const device of devices) { await cancel(device.id, transaction); await device.update({ enabled: false, version: device.version + 1 }, { transaction }); }
      }
    });
    return this.preferences(userId);
  }
  static async removeDevice(userId, id, expectedVersion) {
    validateId(id);
    if (expectedVersion !== undefined && (!/^\d+$/.test(String(expectedVersion)) || !Number.isSafeInteger(Number(expectedVersion)) || Number(expectedVersion) < 1)) throw new AppError('Versão inválida.', 400, 'VALIDATION_ERROR');
    await sequelize.transaction(async transaction => {
      const device = await PushDevice.findOne({ where: { id, userId, ...(expectedVersion !== undefined ? { version: Number(expectedVersion) } : {}) }, transaction, lock: transaction.LOCK.UPDATE });
      if (!device) return; // Idempotent; reveals nothing about another account.
      await cancel(id, transaction); await device.destroy({ transaction });
    });
  }
  static async record(report, type, historyId, transaction) {
    if (!report.userId || !templates[type]) return;
    if (!await User.findByPk(report.userId, { transaction, lock: transaction.LOCK.UPDATE })) return;
    const defaults = { userId: report.userId, denunciaId: report.id, eventType: type };
    const [event, created] = historyId
      ? await NotificationEvent.findOrCreate({ where: { historyId }, defaults, transaction })
      : [await NotificationEvent.create(defaults, { transaction }), true];
    if (!created) return event;
    const preference = await PushPreference.findByPk(report.userId, { transaction });
    if (!preference?.enabled) return event;
    const devices = await PushDevice.findAll({ where: { userId: report.userId, enabled: true }, transaction });
    await NotificationDelivery.bulkCreate(devices.map(device => ({ notificationEventId: event.id, pushDeviceId: device.id, deviceVersion: device.version, nextAttemptAt: new Date() })), { transaction });
    return event;
  }
  static async resolve(userId, id) {
    validateId(id);
    const event = await NotificationEvent.findOne({ where: { id, userId } });
    const report = event && await Denuncia.findByPk(event.denunciaId);
    if (!event || !report || report.userId !== userId) throw new AppError('Notificação indisponível para esta conta ou denúncia removida.', 404, 'NOTIFICATION_NOT_FOUND');
    return { eventId: event.id, denunciaId: report.id };
  }
}
module.exports = NotificationService;
