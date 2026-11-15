'use strict';
module.exports = {
  async up(qi, S) {
    const timestamps = () => ({ createdAt: { type: S.DATE, allowNull: false }, updatedAt: { type: S.DATE, allowNull: false } });
    const ref = (type, model, onDelete = 'CASCADE', allowNull = false) => ({ type, allowNull, references: { model, key: 'id' }, onDelete });
    await qi.createTable('PushPreferences', { userId: { ...ref(S.INTEGER, 'Users'), primaryKey: true }, enabled: { type: S.BOOLEAN, allowNull: false, defaultValue: false }, ...timestamps() });
    await qi.createTable('PushDevices', {
      id: { type: S.UUID, primaryKey: true, allowNull: false }, userId: ref(S.INTEGER, 'Users'), sessionId: ref(S.UUID, 'AuthSessions'),
      installationId: { type: S.UUID, allowNull: false, unique: true }, expoPushToken: { type: S.STRING(256), allowNull: false, unique: true },
      platform: { type: S.STRING(7), allowNull: false }, enabled: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
      version: { type: S.INTEGER, allowNull: false, defaultValue: 1 }, lastSeenAt: { type: S.DATE, allowNull: false }, ...timestamps()
    });
    await qi.createTable('NotificationEvents', {
      id: { type: S.UUID, primaryKey: true, allowNull: false }, userId: ref(S.INTEGER, 'Users'), denunciaId: ref(S.INTEGER, 'Denuncia'),
      historyId: { ...ref(S.INTEGER, 'DenunciaHistoricos', 'SET NULL', true), unique: true }, eventType: { type: S.STRING(20), allowNull: false }, ...timestamps()
    });
    await qi.createTable('NotificationDeliveries', {
      id: { type: S.UUID, primaryKey: true, allowNull: false }, notificationEventId: ref(S.UUID, 'NotificationEvents'), pushDeviceId: ref(S.UUID, 'PushDevices', 'SET NULL', true),
      deviceVersion: { type: S.INTEGER, allowNull: false }, status: { type: S.STRING(24), allowNull: false, defaultValue: 'pending' },
      attempts: { type: S.INTEGER, allowNull: false, defaultValue: 0 }, receiptAttempts: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      nextAttemptAt: { type: S.DATE, allowNull: false }, leaseId: { type: S.UUID, allowNull: true }, leaseUntil: { type: S.DATE, allowNull: true },
      ticketId: { type: S.STRING(128), allowNull: true }, providerAcceptedAt: { type: S.DATE, allowNull: true }, providerConfirmedAt: { type: S.DATE, allowNull: true },
      lastError: { type: S.STRING(64), allowNull: true }, ...timestamps()
    });
    await qi.addIndex('PushDevices', ['userId', 'enabled']); await qi.addIndex('PushDevices', ['sessionId']);
    await qi.addIndex('NotificationEvents', ['userId', 'createdAt']);
    await qi.addIndex('NotificationDeliveries', ['notificationEventId', 'pushDeviceId'], { unique: true });
    await qi.addIndex('NotificationDeliveries', ['status', 'nextAttemptAt']); await qi.addIndex('NotificationDeliveries', ['status', 'leaseUntil']);
  },
  async down(qi) { for (const table of ['NotificationDeliveries', 'NotificationEvents', 'PushDevices', 'PushPreferences']) await qi.dropTable(table); }
};
