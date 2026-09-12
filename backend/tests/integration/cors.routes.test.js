const request = require('supertest')
const app = require('../../app')

describe('Política CORS', () => {
  test.each([
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000'
  ])('permite a origem local de desenvolvimento %s', async origin => {
    const response = await request(app)
      .options('/users/login')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe(origin)
  })

  test('retorna 403 para uma origem não autorizada', async () => {
    const response = await request(app)
      .options('/users/login')
      .set('Origin', 'https://origem-nao-autorizada.example')
      .set('Access-Control-Request-Method', 'POST')

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      message: 'Esta origem não está autorizada a acessar a API.',
      code: 'CORS_ORIGIN_DENIED'
    })
  })
})
