const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const path = require('path')

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
                url: '/',
                description: 'API Base'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: [path.join(__dirname, '../controllers/*.js')]
}

const swaggerSpec = swaggerJSDoc(options)

module.exports = {swaggerUi, swaggerSpec}