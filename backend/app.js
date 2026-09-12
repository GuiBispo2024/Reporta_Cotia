require('dotenv').config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
});

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middlewares/errorHandler');
const { securityHeaders, rateLimit } = require('./middlewares/security');
const AppError = require('./utils/AppError');
const { sequelize } = require('./models/rel');

const app = express();
const { swaggerUi, swaggerSpec } = require('./utils/swagger');

const userController = require('./controllers/UserController');
const denunciaController = require('./controllers/DenunciaController');
const commentController = require('./controllers/CommentController');
const likeController = require('./controllers/LikeController');
const shareController = require('./controllers/ShareController');

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

function isLocalDevelopmentOrigin(origin) {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol)
      && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

app.use(bodyParser.json({ limit: '1mb' }));
app.use(securityHeaders);
app.use(rateLimit);
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin
      || allowedOrigins.includes('*')
      || allowedOrigins.includes(origin)
      || isLocalDevelopmentOrigin(origin)
    ) {
      return callback(null, true);
    }
    return callback(new AppError(
      'Esta origem não está autorizada a acessar a API.',
      403,
      'CORS_ORIGIN_DENIED'
    ));
  }
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d', immutable: true }));

app.get('/', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ name: 'Reporta Cotia API', status: 'ok', database: 'connected', version: process.env.npm_package_version || '1.0.0' });
  } catch {
    res.status(503).json({ name: 'Reporta Cotia API', status: 'degraded', database: 'unavailable' });
  }
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/users', userController);
app.use('/denuncia', denunciaController);
app.use('/denuncia', commentController);
app.use('/denuncia', likeController);
app.use('/denuncia', shareController);

app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.', code: 'ROUTE_NOT_FOUND' });
});

app.use(errorHandler);

module.exports = app;
