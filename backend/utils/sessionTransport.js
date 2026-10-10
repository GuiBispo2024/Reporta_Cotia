const AppError = require('./AppError');
const production = () => process.env.NODE_ENV === 'production';
const cookieName = () => production() ? '__Host-rc_refresh' : 'rc_refresh';
function validateBrowserOrigin(req) {
  const origin = req.get('origin');
  const allowed = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((value) => value.trim());
  let local = false;
  try {
    const url = new URL(origin);
    if (production() && url.protocol !== 'https:') throw new Error('HTTPS obrigatório.');
    local = !production() && ['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch { throw new AppError('Origem de sessão não autorizada.', 403, 'SESSION_ORIGIN_DENIED'); }
  if (!origin || (!allowed.includes(origin) && !local)) throw new AppError('Origem de sessão não autorizada.', 403, 'SESSION_ORIGIN_DENIED');
}
function clientType(req) {
  if (req.get('origin')) { validateBrowserOrigin(req); return 'web'; }
  if (req.get('x-session-client') === 'web') { validateBrowserOrigin(req); }
  return 'mobile';
}
function readRefresh(req, client) {
  if (client === 'mobile') return req.body?.refreshToken;
  const item = (req.headers.cookie || '').split(';').map((value) => value.trim()).find((value) => value.startsWith(`${cookieName()}=`));
  return item?.slice(cookieName().length + 1);
}
const cookieOptions = () => ({ httpOnly: true, secure: production(), sameSite: 'lax', path: '/' });
function sendSession(res, result, client) {
  const { refreshToken, ...body } = result;
  res.set('Cache-Control', 'no-store');
  if (client === 'web') {
    res.cookie(cookieName(), refreshToken, { ...cookieOptions(), maxAge: Math.max(0, new Date(result.sessionExpiresAt).getTime() - Date.now()) });
    return res.status(200).json(body);
  }
  return res.status(200).json(result);
}
function clearRefresh(res) { res.clearCookie(cookieName(), cookieOptions()); }
module.exports = { clientType, readRefresh, sendSession, clearRefresh };
