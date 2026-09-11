const request = require('supertest');
const app = require('../../app'); // ajuste para o arquivo que exporta express app
const db = require('../../models/db/db'); // inicializar/limpar DB (opcional)
const { User, Role, Permission } = require('../../models/rel');

let tokenUsuario;
let idUsuario;

describe('Users routes (integration)', () => {
  beforeAll(async () => {
    // opcional: conectar DB de teste, rodar migrations ou configurar sqlite in-memory
    await db.sequelize.sync({ force: true });
    const citizen = await Role.create({
      name: 'CITIZEN',
      description: 'Acessa os recursos destinados aos cidadãos.'
    });
    const permissions = await Permission.bulkCreate([
      { key: 'denuncia.create', description: 'Criar denúncias.' },
      { key: 'dashboard.public.view', description: 'Consultar indicadores públicos.' }
    ]);
    await citizen.setPermissions(permissions);
  });

  afterAll(async () => {
    // opcional: fechar conexões
    await db.sequelize.close();
  });

  // -------------------------------------------------------------------
  test('POST /users cria usuário e retorna 201', async () => {
    console.log("➡️ Iniciando teste de criação de usuário");
    const payload = { username: 'testuser', email: 't@example.com', password: '123456' };
    const res = await request(app).post('/users').send(payload);
    console.log("Resposta:", res.statusCode, res.body);
    expect([200,201]).toContain(res.statusCode); // endpoint retorna 201 conforme router
    expect(res.body).toHaveProperty('user');
  });

  // -------------------------------------------------------------------
  test('POST /users/login retorna 200 com token para credenciais válidas', async () => {
    console.log("➡️ Iniciando teste de login de usuário");
    const registerPayload = { username: 'loginuser', email: 'login@example.com', password: '123456' };
    await request(app).post('/users').send(registerPayload);
    const loginRes = await request(app)
      .post('/users/login')
      .send({ email: 'login@example.com', password: '123456' });
    console.log("Resposta:", loginRes.statusCode, loginRes.body);
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body).toHaveProperty('token');

    tokenUsuario = loginRes.body.token;
    idUsuario = loginRes.body.user.id;
  });

  test('redefine senha com token de uso único', async () => {
    const requested = await request(app).post('/users/password/forgot').send({ email: 'login@example.com' });
    expect(requested.status).toBe(200);
    expect(requested.body.resetToken).toBeTruthy();

    const reset = await request(app).post('/users/password/reset').send({ token: requested.body.resetToken, password: 'novaSenha123' });
    expect(reset.status).toBe(200);
    expect((await request(app).post('/users/password/reset').send({ token: requested.body.resetToken, password: 'outraSenha123' })).status).toBe(400);
    const login = await request(app).post('/users/login').send({ email: 'login@example.com', password: 'novaSenha123' });
    expect(login.status).toBe(200);
    tokenUsuario = login.body.token;
  });

  // -------------------------------------------------------------------
  test("GET /users → lista todos os usuários (200)", async () => {
    console.log("➡️ Teste: listar usuários");

    const res = await request(app).get("/users")
      .set("Authorization", `Bearer ${tokenUsuario}`);

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("GET /users/me retorna o perfil padrão e suas permissões", async () => {
    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${tokenUsuario}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.roles).toContain('CITIZEN')
    expect(res.body.permissions).toEqual(expect.arrayContaining([
      'denuncia.create',
      'dashboard.public.view'
    ]))
    expect(res.body).not.toHaveProperty('password')
    expect(res.body).not.toHaveProperty('tokenVersion')
  })

  // -------------------------------------------------------------------
  test("GET /users/:id → retorna usuário específico", async () => {
    console.log("➡️ Teste: buscar usuário por ID");

    const res = await request(app).get(`/users/${idUsuario}`)
      .set("Authorization", `Bearer ${tokenUsuario}`);

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id", idUsuario);
  });

  // -------------------------------------------------------------------
  test("PUT /users/update → atualiza usuário autenticado", async () => {
    console.log("➡️ Teste: atualizar usuário autenticado");

    const res = await request(app)
      .put("/users/update")
      .set("Authorization", `Bearer ${tokenUsuario}`)
      .send({
        username: "updatedUser",
        email: "new@example.com",
        password: "654321"
      });

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toHaveProperty("username", "updatedUser");
  });

  test("DELETE /users/avatar remove a imagem do perfil no banco", async () => {
    await User.update({ avatarUrl: '/uploads/perfil-teste.jpg' }, { where: { id: idUsuario } });

    const res = await request(app)
      .delete('/users/avatar')
      .set('Authorization', `Bearer ${tokenUsuario}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.avatarUrl).toBeNull();
    const user = await User.findByPk(idUsuario);
    expect(user.avatarUrl).toBeNull();
  });

  // -------------------------------------------------------------------
  test("PUT /users/:id/adm → não permite sem ser ADM (403)", async () => {
    console.log("➡️ Teste: tentativa de virar ADM sem permissão");

    const res = await request(app)
      .put(`/users/${idUsuario}/adm`)
      .set("Authorization", `Bearer ${tokenUsuario}`)
      .send({ adm: true });

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(403);
  });

  // -------------------------------------------------------------------
  test("DELETE /users/delete → deleta usuário autenticado", async () => {
    console.log("➡️ Teste: deletar usuário autenticado");

    const res = await request(app)
      .delete("/users/delete")
      .set("Authorization", `Bearer ${tokenUsuario}`)
      .send({ senhaAtual: 'novaSenha123' });

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
  });
});
