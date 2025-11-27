require('dotenv').config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
});
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

const {swaggerUi, swaggerSpec} = require('./utils/swagger');
const userController = require('./controllers/UserController');
const denunciaController = require('./controllers/DenunciaController');
const commentController = require('./controllers/CommentController');
const likeController = require('./controllers/LikeController');
const shareController = require('./controllers/ShareController');

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => res.send('Estou Aqui'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/users', userController);
app.use('/denuncia', denunciaController);
app.use('/denuncia', commentController);
app.use('/denuncia', likeController);
app.use('/denuncia', shareController);

// Exporta o app sem iniciar servidor (para testes)
module.exports = app;
