const {Sequelize} = require('sequelize')
const sequelize = new Sequelize('Reporta_Cotia','postgres','password',{
    host: 'localhost',
    dialect: 'postgres'
})
sequelize.authenticate().then(()=>console.log("Conexão estabelecida")).catch((err)=>
    console.error("Erro ao conectar: ",err))

module.exports = sequelize
