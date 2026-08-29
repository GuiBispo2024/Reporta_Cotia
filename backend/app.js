require('dotenv').config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
});

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middlewares/errorHandler');
const { securityHeaders, rateLimit } = require('./middlewares/security');

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

app.use(bodyParser.json({ limit: '1mb' }));
app.use(securityHeaders);
app.use(rateLimit);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origem não permitida pelo CORS.'));
  }
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({ name: 'Reporta Cotia API', status: 'ok' }));

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
