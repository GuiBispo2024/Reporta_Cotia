const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return next();

  try {
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'reporta-cotia-test-secret' : undefined);
    req.user = jwt.verify(token, secret);
  } catch {
    // Public routes remain public; protected routes use the strict auth middleware.
  }
  next();
};
