const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const path = require('path')

const controllersPath = path
    .resolve(__dirname, '../controllers/*.js')
    .replace(/\\/g, '/')

const options = {
    definition: {
        openapi: '3.0.0',

        info: {
            title: 'API Reporta Cotia',
            version: '1.1.0',
            description: [
                'Documentação da API do sistema Reporta Cotia.',
                '',
                'O controle de acesso é realizado por perfis e permissões.',
                'Novas contas recebem o perfil `CITIZEN`. As permissões atuais do usuário são consultadas',
                'no banco a cada requisição autenticada, portanto alterações de acesso têm efeito imediato.'
            ].join('\n')
        },

        servers: [
            {
                url: 'http://localhost:8081',
                description: 'Servidor local'
            }
        ],

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                ErrorResponse: {
                    type: 'object',
                    required: ['message'],
                    properties: {
                        message: { type: 'string', example: 'Sua conta não possui permissão para realizar esta ação.' },
                        code: { type: 'string', example: 'FORBIDDEN' }
                    }
                },
                AccessRole: {
                    type: 'string',
                    enum: ['CITIZEN', 'MODERATOR', 'ANALYST', 'ADMIN'],
                    description: 'Perfil de acesso atribuído ao usuário.'
                },
                Permission: {
                    type: 'string',
                    enum: [
                        'denuncia.create',
                        'denuncia.update_own',
                        'denuncia.delete_own',
                        'moderation.view',
                        'moderation.review',
                        'censorship.review',
                        'resolution.update',
                        'dashboard.public.view',
                        'dashboard.full.view',
                        'dashboard.export',
                        'users.view',
                        'users.manage_roles',
                        'audit.view'
                    ]
                },
                AuthenticatedUser: {
                    type: 'object',
                    required: ['id', 'username', 'email', 'roles', 'permissions'],
                    properties: {
                        id: { type: 'integer', example: 10 },
                        username: { type: 'string', example: 'maria.cotia' },
                        email: { type: 'string', format: 'email', example: 'maria@example.com' },
                        avatarUrl: { type: 'string', nullable: true, example: '/uploads/perfis/avatar.jpg' },
                        roles: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/AccessRole' },
                            example: ['CITIZEN', 'MODERATOR']
                        },
                        permissions: {
                            type: 'array',
                            uniqueItems: true,
                            items: { $ref: '#/components/schemas/Permission' },
                            example: ['denuncia.create', 'moderation.view']
                        }
                    }
                },
                UserRoleHistory: {
                    type: 'object',
                    required: [
                        'id', 'targetUsername', 'changedByUsername',
                        'previousRoles', 'newRoles', 'createdAt'
                    ],
                    properties: {
                        id: { type: 'integer', example: 25 },
                        targetUsername: { type: 'string', example: 'maria.cotia' },
                        changedByUsername: { type: 'string', example: 'administrador' },
                        previousRoles: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/AccessRole' },
                            example: ['CITIZEN']
                        },
                        newRoles: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/AccessRole' },
                            example: ['CITIZEN', 'MODERATOR']
                        },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        total: { type: 'integer', example: 42 },
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 12 },
                        totalPages: { type: 'integer', example: 4 }
                    }
                }
            }
        }
    },

    apis: [controllersPath]
}

const swaggerSpec = swaggerJSDoc(options)

module.exports = {
    swaggerUi,
    swaggerSpec
}
