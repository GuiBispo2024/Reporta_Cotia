const app = require('./app');
const { sequelize } = require('./models/rel');
const userAdmProdSeed = require('./utils/userAdmProd.seed');
const port = process.env.PORT || 8081;

async function startServer() {
    try {
        if (process.env.NODE_ENV === 'production') {
            await sequelize.sync();
            console.log("Banco sincronizado (PROD)");
            await userAdmProdSeed();
        } else {
            await sequelize.sync({ alter: true });
            console.log("Banco sincronizado (DEV)");
        }

        app.listen(port, () =>
            console.log(`Servidor rodando na porta ${port}`)
        );

        console.log(`Swagger disponível em http://localhost:${port}/api-docs`);
    } catch (err) {
        console.error("Erro ao conectar ao banco:", err);
    }
}

startServer();
