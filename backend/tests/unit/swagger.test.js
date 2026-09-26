const { swaggerSpec } = require('../../utils/swagger')

describe('Documentação OpenAPI', () => {
  test('documenta filtros, acesso e atualização da carga analítica e qualidade', () => {
    for (const path of ['/boards/analytics/indicators', '/boards/public/indicators', '/boards/analytics/quality']) {
      const endpoint = swaggerSpec.paths[path].get;
      expect(endpoint.security).toEqual([{ bearerAuth: [] }]);
      expect(endpoint.parameters.map(item => item.name)).toEqual(expect.arrayContaining(['categoria', 'bairro', 'dataInicio', 'dataFim']));
      expect(endpoint.responses[400]).toBeDefined();
      expect(endpoint.responses[401]).toBeDefined();
      expect(endpoint.responses[403]).toBeDefined();
    }
    expect(swaggerSpec.paths['/boards/analytics/indicators'].get.description).toContain('lastUpdatedAt');
    expect(swaggerSpec.paths['/boards/analytics/quality'].get.parameters.map(item => item.name)).toContain('limit');
  });
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
    expect(swaggerSpec.components.schemas.AuthenticatedUser.properties.adm).toBeUndefined()
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
    const roleHistory = swaggerSpec.paths['/users/access/role-history'].get
    const updateRoles = swaggerSpec.paths['/users/{id}/roles'].put

    expect(listRoles.security).toEqual([{ bearerAuth: [] }])
    expect(listRoles.responses[403].description).toContain('users.manage_roles')
    expect(updateRoles.security).toEqual([{ bearerAuth: [] }])
    expect(updateRoles.requestBody.content['application/json'].schema.required).toContain('roles')
    expect(updateRoles.responses[409]).toBeDefined()
    expect(roleHistory.description).toContain('users.audit.view')
    expect(roleHistory.security).toEqual([{ bearerAuth: [] }])
    expect(roleHistory.parameters.map(parameter => parameter.name)).toEqual(['page', 'limit', 'sort'])
    expect(roleHistory.responses[200].content['application/json'].schema.allOf[1].properties.data.items.$ref)
      .toBe('#/components/schemas/UserRoleHistory')
    expect(swaggerSpec.components.schemas.UserRoleHistory.properties.targetUserId).toBeUndefined()
    expect(swaggerSpec.components.schemas.UserRoleHistory.properties.changedByUserId).toBeUndefined()
    expect(swaggerSpec.paths['/users/{id}/adm']).toBeUndefined()
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
    expect(swaggerSpec.paths['/denuncia/{id}/historico'].get.description).toContain('denuncia.audit.view')
  })

  test('documenta a proteção da exclusão da última conta administradora', () => {
    const endpoint = swaggerSpec.paths['/users/delete'].delete

    expect(endpoint.requestBody.content['application/json'].schema.required).toContain('senhaAtual')
    expect(endpoint.responses[409].description).toContain('única conta administradora')
  })

  test('documenta a exportação XLSX do board analítico', () => {
    const endpoint = swaggerSpec.paths['/boards/analytics/export'].get
    expect(endpoint).toBeDefined()
    expect(endpoint.description).toContain('dashboard.export')
    expect(endpoint.responses[200].content['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']).toBeDefined()
    const history = swaggerSpec.paths['/boards/analytics/export-history'].get
    expect(history.description).toContain('dashboard.audit.view')
    expect(history.parameters.map(parameter => parameter.name)).toEqual(['page', 'limit', 'sort'])
    expect(history.responses[403]).toBeDefined()
  })

  test('documenta os pontos individuais dos mapas público e analítico', () => {
    const publicMap = swaggerSpec.paths['/boards/public/map-points'].get
    const analyticalMap = swaggerSpec.paths['/boards/analytics/map-points'].get

    expect(publicMap.description).toContain('dashboard.public.view')
    expect(analyticalMap.description).toContain('dashboard.full.view')
    expect(publicMap.parameters.map(parameter => parameter.name)).toEqual([
      'categoria', 'setorResponsavel', 'bairro', 'dataInicio', 'dataFim'
    ])
    expect(analyticalMap.responses[403]).toBeDefined()
  })
})
