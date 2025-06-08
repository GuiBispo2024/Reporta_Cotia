const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/ReportaCotia',{
})

const db = mongoose.connection
db.on('error',console.error.bind(console,'Erro ao se conectar com o MongoDB'))
db.once('open',function(){
    console.log('Conexão estabelecida com sucesso')
})

module.exports = db