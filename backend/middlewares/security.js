// Camada leve de segurança sem dependências extras.
// Em produção, recomenda-se complementar com Helmet e rate-limit do provedor.
const buckets = new Map();

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  next();
}

function rateLimit(req, res, next) {
  const windowMs = 60 * 1000;
  // Leituras da home geram consultas de denúncias, curtidas, comentários e
  // compartilhamentos. Elas têm uma faixa própria para não derrubar a sessão
  // durante recarregamentos, enquanto mutações continuam mais restritas.
  const isRead = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  const max = isRead ? 1000 : 120;
  const key = `${req.ip || req.socket.remoteAddress || 'unknown'}:${isRead ? 'read' : 'write'}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || now - current.start >= windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return next();
  }

  current.count += 1;
  if (current.count > max) {
    const retryAfter = Math.max(Math.ceil((windowMs - (now - current.start)) / 1000), 1);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      message: `Você realizou muitas ${isRead ? 'atualizações de página' : 'ações'} em pouco tempo. Aguarde ${retryAfter} segundos e tente novamente.`,
      code: 'RATE_LIMITED'
    });
  }

  next();
}

module.exports = { securityHeaders, rateLimit };
