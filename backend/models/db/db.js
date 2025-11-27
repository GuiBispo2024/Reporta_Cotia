const { Sequelize } = require('sequelize')

let sequelize;

if (process.env.NODE_ENV === "production") {
    // Ambiente de produção (Render)
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: "postgres",
        protocol: "postgres",
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });
}
else if(process.env.NODE_ENV === "test") {
    // Ambiente de teste
    sequelize = new Sequelize({
        dialect: "sqlite",
        storage: ":memory:",
        logging: false
    });
} 
else {
    // Ambiente local
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
            host: process.env.DB_HOST,
            dialect: process.env.DB_DIALECT,
            logging: false
        }
    );
}

sequelize.authenticate()
    .then(() => console.log("Conexão com o banco estabelecida"))
    .catch((err) => console.error("Erro ao conectar ao DB:", err))

module.exports = {sequelize, Sequelize}