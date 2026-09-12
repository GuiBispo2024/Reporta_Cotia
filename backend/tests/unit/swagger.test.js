const { swaggerSpec } = require('../../utils/swagger')

describe('Documentação OpenAPI', () => {
  test('documenta perfis e permissões do usuário autenticado', () => {
    expect(swaggerSpec.components.schemas.AccessRole.enum).toEqual([
      'CITIZEN', 'MODERATOR', 'ANALYST', 'ADMIN'
    ])
    expect(swaggerSpec.paths['/users/me'].get.responses[200].content['application/json'].schema.$ref)
      .toBe('#/components/schemas/AuthenticatedUser')
    expect(swaggerSpec.paths['/users/login'].post.responses[200].content['application/json'].schema.properties.user.$ref)
      .toBe('#/components/schemas/AuthenticatedUser')
    expect(swaggerSpec.paths['/users/update'].put.responses[200].content['application/json'].schema.properties.user.$ref)
      .toBe('#/components/schemas/AuthenticatedUser')
  })

  test('documenta a permissão da fila de moderação', () => {
    const endpoint = swaggerSpec.paths['/denuncia/moderacao'].get

    expect(endpoint.description).toContain('moderation.view')
    expect(endpoint.security).toEqual([{ bearerAuth: [] }])
    expect(endpoint.responses[403]).toBeDefined()
  })

  test('documenta endpoints de censura, avatar e recuperação de senha', () => {
    expect(swaggerSpec.paths['/denuncia/{id}/censura'].patch).toBeDefined()
    expect(swaggerSpec.paths['/denuncia/comentario/{id}/censura'].patch).toBeDefined()
    expect(swaggerSpec.paths['/users/avatar'].patch).toBeDefined()
    expect(swaggerSpec.paths['/users/avatar'].delete).toBeDefined()
    expect(swaggerSpec.paths['/users/password/forgot'].post).toBeDefined()
    expect(swaggerSpec.paths['/users/password/reset'].post).toBeDefined()
  })

  test('não exige autenticação global nos endpoints públicos', () => {
    expect(swaggerSpec.security).toBeUndefined()
    expect(swaggerSpec.paths['/denuncia/{id}'].get.security).toEqual([])
    expect(swaggerSpec.paths['/users/{id}'].get.security).toEqual([])
  })

  test('documenta consulta e atualização administrativa de perfis', () => {
    const listRoles = swaggerSpec.paths['/users/access/roles'].get
    const updateRoles = swaggerSpec.paths['/users/{id}/roles'].put

    expect(listRoles.security).toEqual([{ bearerAuth: [] }])
    expect(listRoles.responses[403].description).toContain('users.manage_roles')
    expect(updateRoles.security).toEqual([{ bearerAuth: [] }])
    expect(updateRoles.requestBody.content['application/json'].schema.required).toContain('roles')
    expect(updateRoles.responses[409]).toBeDefined()
  })

  test('documenta as permissões específicas das ações de moderação', () => {
    expect(swaggerSpec.paths['/denuncia/{id}/moderar'].patch.description).toContain('moderation.review')
    expect(swaggerSpec.paths['/denuncia/{id}/censura'].patch.description).toContain('censorship.review')
    expect(swaggerSpec.paths['/denuncia/{id}/resolucao'].patch.description).toContain('resolution.update')
    expect(swaggerSpec.paths['/denuncia/comentario/{id}/censura'].patch.description).toContain('censorship.review')
  })

  test('documenta a proteção dos dados administrativos e sensíveis', () => {
    expect(swaggerSpec.paths['/users'].get.description).toContain('users.view')
    expect(swaggerSpec.paths['/denuncia/moderacao'].get.description).toContain('censorship.review')
    expect(swaggerSpec.paths['/denuncia/{id}'].get.description).toContain('moderation.view')
    expect(swaggerSpec.paths['/denuncia/{id}/historico'].get.description).toContain('audit.view')
  })
})
