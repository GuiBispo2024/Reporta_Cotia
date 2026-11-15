const { DataTypes } = require('sequelize');
const { sequelize } = require('./db/db');
const uuid = () => ({ type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 });
const PushPreference = sequelize.define('PushPreference', {
  userId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
});
const PushDevice = sequelize.define('PushDevice', {
  id: uuid(), userId: { type: DataTypes.INTEGER, allowNull: false },
  sessionId: { type: DataTypes.UUID, allowNull: false },
  installationId: { type: DataTypes.UUID, allowNull: false, unique: true },
  expoPushToken: { type: DataTypes.STRING(256), allowNull: false, unique: true },
  platform: { type: DataTypes.STRING(7), allowNull: false },
  enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  lastSeenAt: { type: DataTypes.DATE, allowNull: false }
}, { indexes: [{ fields: ['userId', 'enabled'] }, { fields: ['sessionId'] }] });
const NotificationEvent = sequelize.define('NotificationEvent', {
  id: uuid(), userId: { type: DataTypes.INTEGER, allowNull: false },
  denunciaId: { type: DataTypes.INTEGER, allowNull: false },
  historyId: { type: DataTypes.INTEGER, allowNull: true, unique: true },
  eventType: { type: DataTypes.STRING(20), allowNull: false }
}, { indexes: [{ fields: ['userId', 'createdAt'] }] });
const NotificationDelivery = sequelize.define('NotificationDelivery', {
  id: uuid(), notificationEventId: { type: DataTypes.UUID, allowNull: false },
  pushDeviceId: { type: DataTypes.UUID, allowNull: true },
  deviceVersion: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'pending' },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  receiptAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  nextAttemptAt: { type: DataTypes.DATE, allowNull: false },
  leaseId: { type: DataTypes.UUID, allowNull: true }, leaseUntil: { type: DataTypes.DATE, allowNull: true },
  ticketId: { type: DataTypes.STRING(128), allowNull: true },
  providerAcceptedAt: { type: DataTypes.DATE, allowNull: true },
  providerConfirmedAt: { type: DataTypes.DATE, allowNull: true },
  lastError: { type: DataTypes.STRING(64), allowNull: true }
}, { indexes: [{ unique: true, fields: ['notificationEventId', 'pushDeviceId'] }, { fields: ['status', 'nextAttemptAt'] }, { fields: ['status', 'leaseUntil'] }] });
module.exports = { PushPreference, PushDevice, NotificationEvent, NotificationDelivery };
