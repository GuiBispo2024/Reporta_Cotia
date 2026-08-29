const app = require('./app');
const { sequelize } = require('./models/rel');
const port = process.env.PORT || 8081;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Banco conectado.');

    if (process.env.NODE_ENV === 'test') {
      await sequelize.sync();
    } else if (process.env.DB_SYNC === 'true') {
      // Compatibilidade para desenvolvimento local. Em produção, prefira migrations.
      await sequelize.sync({ alter: process.env.DB_SYNC_ALTER === 'true' });
      console.log('Banco sincronizado por DB_SYNC.');
    }

    app.listen(port, () => {
      console.log(`Servidor rodando na porta ${port}`);
      console.log(`Swagger disponível em http://localhost:${port}/api-docs`);
    });
  } catch (err) {
    console.error('Erro ao iniciar API:', err);
    process.exit(1);
  }
}

startServer();
