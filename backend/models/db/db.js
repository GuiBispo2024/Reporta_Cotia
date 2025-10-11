const {Sequelize} = require('sequelize')
const sequelize = new Sequelize('Reporta_Cotia','root','root',{
    host: 'localhost',
    dialect: 'mysql'
})
sequelize.authenticate().then(()=>console.log("Conexão estabelecida")).catch((err)=>
    console.error("Erro ao conectar: ",err))

module.exports = sequelize
