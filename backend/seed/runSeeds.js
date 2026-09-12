require("dotenv").config();
const {sequelize} = require('../models/db/db');
require('../models/rel'); // Garante que os modelos sejam carregados

async function runSeeds() {
    try {
    console.log("🔄 Resetando o banco...");
    await sequelize.sync({ force: true });

    console.log("▶ Rodando Seeds...");

    await require("./accessControl.seed")();
    await require("./user.seed")();
    await require("./denuncia.seed")();
    await require("./comment.seed")();
    await require("./like.seed")();
    await require("./share.seed")();

    console.log("🌱 Todas Seeds finalizadas!");
    process.exit();
  } catch (err) {
    console.error("❌ Erro nas seeds:", err);
    process.exit(1);
  }
}

runSeeds();
