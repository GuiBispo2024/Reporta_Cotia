const {Sequelize} = require('sequelize')
const sequelize = new Sequelize('Reporta_Cotia','postgres','password',{
    host: 'localhost',
    dialect: 'postgres'
})
sequelize.authenticate().then(()=>console.log("Conexão estabelecida")).catch((err)=>
    console.error("Erro ao conectar: ",err))

module.exports = sequelize

/*mongoose.connect('mongodb://localhost:27017/ReportaCotia',{
})

const db = mongoose.connection
db.on('error',console.error.bind(console,'Erro ao se conectar com o MongoDB'))
db.once('open',function(){
    console.log('Conexão estabelecida com sucesso')
})

module.exports = db
*/