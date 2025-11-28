const request = require("supertest");
const app = require("../../app");
const db = require("../../models/db/db");

let tokenUser;
let userId;
let denunciaId;

describe("Denúncias routes (integration)", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    // Criar usuário comum
    const user = await request(app).post("/users").send({
      username: "normaluser",
      email: "normal@example.com",
      password: "123456",
    });

    const loginUser = await request(app)
      .post("/users/login")
      .send({ email: "normal@example.com", password: "123456" });

    tokenUser = loginUser.body.token;
    userId = loginUser.body.user.id;

    // Criar usuário ADM
    const adm = await request(app).post("/users").send({
      username: "admin",
      email: "adm@example.com",
      password: "123456",
      adm: true,
    });

    const loginAdm = await request(app)
      .post("/users/login")
      .send({ email: "adm@example.com", password: "123456" });

    tokenAdm = loginAdm.body.token;
    admId = loginAdm.body.user.id;
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  // -------------------------------------------------------------------
  test("POST /denuncia cria denúncia (201)", async () => {
    console.log("➡️ Teste: criar denúncia");

    const payload = {
      titulo: "Buraco enorme",
      descricao: "Em frente à escola",
      localizacao: "Rua das Flores"
    };

    const res = await request(app)
      .post("/denuncia")
      .set("Authorization", `Bearer ${tokenUser}`)
      .send(payload);

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(201);
    expect(res.body.denuncia).toHaveProperty("id");

    denunciaId = res.body.denuncia.id;
  });

  // -------------------------------------------------------------------
  test("GET /denuncia → lista todas as denúncias", async () => {
    console.log("➡️ Teste: listar denúncias");

    const res = await request(app).get("/denuncia");

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------
  test("GET /denuncia/filter → filtra por título", async () => {
    console.log("➡️ Teste: filtro de denúncias");

    const res = await request(app)
      .get("/denuncia/filter?titulo=Buraco");

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // -------------------------------------------------------------------
  test("GET /denuncia/:id → retorna denúncia específica", async () => {
    console.log("➡️ Teste: buscar denúncia por ID");

    const res = await request(app).get(`/denuncia/${denunciaId}`);

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id", denunciaId);
  });

  // -------------------------------------------------------------------
  test("GET /denuncia/user/:userId → denúncias do usuário", async () => {
    console.log("➡️ Teste: listar denúncias por usuário");

    const res = await request(app).get(`/denuncia/user/${userId}`);

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // -------------------------------------------------------------------
  test("PUT /denuncia/:id → atualizar denúncia (somente autor)", async () => {
    console.log("➡️ Teste: editar denúncia");

    const res = await request(app)
      .put(`/denuncia/${denunciaId}`)
      .set("Authorization", `Bearer ${tokenUser}`)
      .send({
        titulo: "Buraco ainda maior",
        descricao: "Agora está perigoso",
        localizacao: "Rua das Flores, nº 200",
      });

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Denúncia atualizada e reenviada para moderação.");
  });

  // -------------------------------------------------------------------
  test("PATCH /denuncia/:id/moderar → usuário comum não pode moderar (403)", async () => {
    console.log("➡️ Teste: moderar denúncia sem ser ADM");

    const res = await request(app)
      .patch(`/denuncia/${denunciaId}/moderar`)
      .set("Authorization", `Bearer ${tokenUser}`)
      .send({ status: "rejeitada" });

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(403);
  });

  // -------------------------------------------------------------------
  test("DELETE /denuncia/:id → autor deleta denúncia", async () => {
    console.log("➡️ Teste: deletar denúncia");

    const res = await request(app)
      .delete(`/denuncia/${denunciaId}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
  });
});