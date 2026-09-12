const requirePermission = require('../../middlewares/requirePermission')

function runMiddleware(user, permission = 'moderation.view') {
  const req = { user }
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  }
  const next = jest.fn()

  requirePermission(permission)(req, res, next)
  return { res, next }
}

describe('requirePermission', () => {
  test('autoriza usuário que possui a permissão', () => {
    const { next, res } = runMiddleware({ adm: false, permissions: ['moderation.view'] })

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  test('bloqueia usuário sem a permissão', () => {
    const { next, res } = runMiddleware({ adm: false, permissions: [] })

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'FORBIDDEN' }))
  })

  test('não autoriza somente pelo campo adm legado', () => {
    const { next, res } = runMiddleware({ adm: true, permissions: [] })

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  test('retorna 401 quando a autenticação não foi executada', () => {
    const { next, res } = runMiddleware(undefined)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_REQUIRED' }))
  })
})
