import authService from '../../src/services/authService'

jest.mock('../../src/api/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn()
  }
}))

beforeEach(() => {
  localStorage.clear()
})

test('recupera o usuário armazenado para restaurar a sessão', () => {
  const user = { id: 1, username: 'Cidadão', roles: ['CITIZEN'] }
  localStorage.setItem('user', JSON.stringify(user))

  expect(authService.getUser()).toEqual(user)
  expect(localStorage.getItem('user')).not.toBeNull()
})

test('descarta dados corrompidos sem interromper a inicialização', () => {
  localStorage.setItem('user', '{"id":')

  expect(authService.getUser()).toBeNull()
  expect(localStorage.getItem('user')).toBeNull()
})

test.each(['null', '[]', '"usuário"'])('descarta uma sessão com formato inválido: %s', storedUser => {
  localStorage.setItem('user', storedUser)

  expect(authService.getUser()).toBeNull()
  expect(localStorage.getItem('user')).toBeNull()
})
