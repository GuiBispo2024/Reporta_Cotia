class ProviderError extends Error {
  constructor(code, retryable = false, ambiguous = false) { super(code); this.code = code; this.retryable = retryable; this.ambiguous = ambiguous; }
}
const known = new Set(['DeviceNotRegistered', 'MessageRateExceeded', 'MessageTooBig', 'MismatchSenderId', 'InvalidCredentials', 'UNAUTHORIZED']);
const safeCode = code => known.has(code) ? code : 'PROVIDER_REJECTED';
class ExpoPushProvider {
  async request(path, body) {
    if (process.env.NODE_ENV === 'test') throw new ProviderError('TEST_NETWORK_DISABLED');
    let response;
    try {
      response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15000)
      });
    } catch { throw new ProviderError('NETWORK_UNKNOWN', false, true); }
    if (!response.ok) throw new ProviderError(`HTTP_${response.status}`, response.status === 429 || response.status >= 500);
    try { return await response.json(); } catch { throw new ProviderError('RESPONSE_UNKNOWN', false, true); }
  }
  async send(messages) {
    const response = await this.request('send', messages);
    if (!Array.isArray(response?.data) || response.data.length !== messages.length) throw new ProviderError('TICKET_UNKNOWN', false, true);
    return response.data.map(ticket => ticket?.status === 'ok' && typeof ticket.id === 'string' && ticket.id.length <= 128
      ? { status: 'ok', id: ticket.id }
      : ticket?.status === 'error' ? { status: 'error', code: safeCode(ticket.details?.error) } : { status: 'unknown' });
  }
  async receipts(ids) {
    const response = await this.request('getReceipts', { ids });
    if (!response?.data || Array.isArray(response.data) || typeof response.data !== 'object') throw new ProviderError('RECEIPT_UNAVAILABLE', true);
    return Object.fromEntries(ids.map(id => {
      const receipt = response.data[id];
      return [id, receipt?.status === 'ok' ? { status: 'ok' } : receipt?.status === 'error' ? { status: 'error', code: safeCode(receipt.details?.error) } : null];
    }));
  }
}
module.exports = { ExpoPushProvider, ProviderError, safeCode };
