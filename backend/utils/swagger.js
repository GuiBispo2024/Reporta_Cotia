const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Reporta Cotia',
            version: '1.0.0',
            description: 'Documentação da API do sistema Reporta Cotia'
        },
        servers: [
            {
                url: 'http://localhost:8081',
                description: 'Servidor local'
            }
        ]
    },
    apis: ['./controllers/*.js']
}

const swaggerSpec = swaggerJSDoc(options)

module.exports = {swaggerUi, swaggerSpec}