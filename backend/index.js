require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = express()
const port = process.env.PORT||8081
const {swaggerUi, swaggerSpec} = require('./utils/swagger')
const {sequelize} = require('./models/rel')
const userController = require('./controllers/UserController')
const denunciaController = require('./controllers/DenunciaController')
const commentController = require('./controllers/CommentController')
const likeController = require('./controllers/LikeController')
const shareController = require('./controllers/ShareController')

app.use(bodyParser.json())
app.use(cors())
app.get('/',(req,res)=> res.send('Estou Aqui'))
app.use('/api-docs',swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use('/users', userController)
app.use('/denuncia', denunciaController)
app.use('/denuncia', commentController)
app.use('/denuncia', likeController)
app.use('/denuncia', shareController)
app.use((err,req,res,next)=>{
    console.error(err.stack)
    res.status(500).send('Algo deu errado')
})

sequelize.sync({ alter: true })
.then(() => {
    console.log('Banco sincronizado com sucesso!')
    app.listen(port,() => console.log(`Servidor rodando na porta ${port}!`))
    console.log(`Swagger rodando em http://localhost:${port}/api-docs`)
})
.catch((err) => {
    console.error('Erro ao sincronizar o banco:', err)
})
/*app.listen(port,() => console.log(`Servidor rodando na porta ${port}!`))
console.log('Swagger rodando em http://localhost:8081/api-docs')*/ 