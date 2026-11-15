const { randomUUID } = require('crypto');
const { Op } = require('sequelize');
const { NotificationDelivery, NotificationEvent, PushDevice, PushPreference, AuthSession, User, Denuncia } = require('../models/rel');
const templates = require('./templates');
const { ExpoPushProvider, safeCode } = require('./ExpoPushProvider');
const LEASE_MS = 60000, MAX_ATTEMPTS = 5, MAX_RECEIPT_ATTEMPTS = 12;
const backoff = attempts => Math.min(3600000, 30000 * 2 ** Math.max(0, attempts - 1));
const due = now => ({ [Op.lte]: new Date(now) });
async function recover(now) {
  for (const [from, to, code] of [['claimed', 'pending', 'LEASE_RECOVERED'], ['sending', 'unknown', 'INTERRUPTED_SEND_UNKNOWN'], ['checking', 'accepted', 'RECEIPT_LEASE_RECOVERED']]) {
    await NotificationDelivery.update({ status: to, leaseId: null, leaseUntil: null, nextAttemptAt: new Date(now), lastError: code }, { where: { status: from, leaseUntil: due(now) } });
  }
}
async function recipient(delivery, now) {
  const event = await NotificationEvent.findByPk(delivery.notificationEventId);
  const device = delivery.pushDeviceId && await PushDevice.findByPk(delivery.pushDeviceId);
  if (!event || !device || !device.enabled || event.userId !== device.userId || device.version !== delivery.deviceVersion) return null;
  const [preference, session, user, report] = await Promise.all([
    PushPreference.findByPk(event.userId), AuthSession.findByPk(device.sessionId), User.findByPk(event.userId), Denuncia.findByPk(event.denunciaId)
  ]);
  if (!preference?.enabled || !session || session.revokedAt || +new Date(session.expiresAt) <= now || session.userId !== event.userId
    || !user || user.tokenVersion !== session.tokenVersion || !report || report.userId !== event.userId || !templates[event.eventType]) return null;
  return { event, device };
}
async function claim(row, status, claimedStatus, now) {
  const leaseId = randomUUID();
  const [changed] = await NotificationDelivery.update({ status: claimedStatus, leaseId, leaseUntil: new Date(now + LEASE_MS) }, {
    where: { id: row.id, status, nextAttemptAt: due(now) }
  });
  return changed ? leaseId : null;
}
async function finish(row, leaseId, values, log) {
  const [changed] = await NotificationDelivery.update({ ...values, leaseId: null, leaseUntil: null }, { where: { id: row.id, leaseId } });
  if (changed) log({ component: 'push-worker', deliveryId: row.id, eventId: row.notificationEventId, status: values.status, errorCode: values.lastError || null });
}
async function invalidate(device) {
  await PushDevice.update({ enabled: false, version: device.version + 1 }, { where: { id: device.id, version: device.version } });
}
async function runBatch({ enabled = process.env.PUSH_DELIVERY_ENABLED === 'true', provider = new ExpoPushProvider(), now: clock = Date.now, batchSize = 20, log = record => console.log(JSON.stringify(record)) } = {}) {
  if (!enabled) return { enabled: false, processed: 0 };
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 100) throw new Error('PUSH_BATCH_SIZE must be between 1 and 100.');
  const readTime = () => typeof clock === 'function' ? clock() : clock;
  const selectionTime = readTime();
  await recover(selectionTime);
  const rows = await NotificationDelivery.findAll({ where: { status: { [Op.in]: ['pending', 'accepted'] }, nextAttemptAt: due(selectionTime) }, order: [['nextAttemptAt', 'ASC'], ['id', 'ASC']], limit: batchSize });
  let processed = 0;
  // Sequential I/O caps concurrency and request rate; work selection remains bounded.
  for (const row of rows) {
    const now = readTime();
    const sending = row.status === 'pending';
    const leaseId = await claim(row, row.status, sending ? 'claimed' : 'checking', now);
    if (!leaseId) continue;
    processed++;
    const target = await recipient(row, now);
    if (!target) { await finish(row, leaseId, { status: 'canceled', lastError: 'RECIPIENT_INACTIVE' }, log); continue; }
    if (sending) {
      if (row.attempts >= MAX_ATTEMPTS) { await finish(row, leaseId, { status: 'failed', lastError: 'ATTEMPTS_EXHAUSTED' }, log); continue; }
      const [owned] = await NotificationDelivery.update({ status: 'sending', attempts: row.attempts + 1 }, { where: { id: row.id, status: 'claimed', leaseId } });
      if (!owned) continue;
      try {
        // Recheck binding/preferences/session immediately before contacting Expo.
        if (!await recipient(row, now)) { await finish(row, leaseId, { status: 'canceled', lastError: 'RECIPIENT_INACTIVE' }, log); continue; }
        const ticket = (await provider.send([{ to: target.device.expoPushToken, ...templates[target.event.eventType],
          data: { type: 'report_update', eventId: target.event.id }, channelId: 'reports', sound: 'default', ttl: 900 }]))[0];
        if (ticket?.status === 'ok') {
          await finish(row, leaseId, { status: 'accepted', ticketId: ticket.id, providerAcceptedAt: new Date(now), nextAttemptAt: new Date(now + 15 * 60000), lastError: null }, log);
        } else if (ticket?.status === 'error') {
          if (ticket.code === 'DeviceNotRegistered') await invalidate(target.device);
          const retry = ticket.code === 'MessageRateExceeded' && row.attempts + 1 < MAX_ATTEMPTS;
          await finish(row, leaseId, { status: retry ? 'pending' : 'failed', nextAttemptAt: new Date(now + backoff(row.attempts + 1)), lastError: safeCode(ticket.code) }, log);
        } else await finish(row, leaseId, { status: 'unknown', lastError: 'TICKET_UNKNOWN' }, log);
      } catch (error) {
        const retry = error.retryable === true && row.attempts + 1 < MAX_ATTEMPTS;
        await finish(row, leaseId, { status: retry ? 'pending' : error.ambiguous || !/^HTTP_\d{3}$/.test(error.code || '') ? 'unknown' : 'failed',
          nextAttemptAt: new Date(now + backoff(row.attempts + 1)), lastError: /^HTTP_\d{3}$/.test(error.code) ? error.code : error.ambiguous ? 'SEND_UNKNOWN' : 'PROVIDER_FAILURE' }, log);
      }
    } else {
      const attempts = row.receiptAttempts + 1;
      if (!row.ticketId || now - +new Date(row.providerAcceptedAt) >= 23 * 3600000 || attempts > MAX_RECEIPT_ATTEMPTS) {
        await finish(row, leaseId, { status: 'receipt_unknown', lastError: 'RECEIPT_EXPIRED' }, log); continue;
      }
      try {
        const receipt = (await provider.receipts([row.ticketId]))[row.ticketId];
        if (receipt?.status === 'ok') await finish(row, leaseId, { status: 'provider_confirmed', receiptAttempts: attempts, providerConfirmedAt: new Date(now), lastError: null }, log);
        else if (receipt?.status === 'error') {
          if (receipt.code === 'DeviceNotRegistered') await invalidate(target.device);
          await finish(row, leaseId, { status: 'failed', receiptAttempts: attempts, lastError: safeCode(receipt.code) }, log);
        } else throw new Error('Receipt pending');
      } catch {
        await finish(row, leaseId, { status: attempts >= MAX_RECEIPT_ATTEMPTS ? 'receipt_unknown' : 'accepted', receiptAttempts: attempts,
          nextAttemptAt: new Date(now + backoff(attempts)), lastError: 'RECEIPT_UNAVAILABLE' }, log);
      }
    }
  }
  return { enabled: true, processed };
}
module.exports = { runBatch, recover, backoff, MAX_ATTEMPTS };
