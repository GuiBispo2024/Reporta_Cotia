const request = require("supertest");
const app = require("../../app");
const db = require("../../models/db/db");

let tokenUser;
let userId;
let denunciaId;
let tokenAdm;
let admId;
const { Denuncia, Share } = require('../../models/rel');

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
    expect(res.body.length).toBe(0);
  });

  // -------------------------------------------------------------------
  test("GET /denuncia/filter → aplica os filtros informados", async () => {
    console.log("➡️ Teste: filtro de denúncias");

    await Denuncia.update({
      status: 'aprovada',
      categoria: 'Buraco e pavimentação',
      resolucaoStatus: 'em_andamento'
    }, { where: { id: denunciaId } });

    const res = await request(app)
      .get("/denuncia/filter")
      .query({
        titulo: '  buraco  ',
        descricao: 'escola',
        localizacao: 'flores',
        user: 'NORMAL',
        categoria: 'buraco e pavimentação',
        resolucaoStatus: 'em_andamento'
      });

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toHaveProperty('id', denunciaId);
  });

  test("GET /denuncia/filter → retorna vazio quando o status não corresponde", async () => {
    const res = await request(app)
      .get("/denuncia/filter")
      .query({ resolucaoStatus: 'resolvida' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  test("GET /denuncia/filter → ordena pelas mais compartilhadas", async () => {
    const maisCompartilhada = await Denuncia.create({
      titulo: 'Iluminação da praça',
      descricao: 'Praça sem iluminação',
      localizacao: 'Centro',
      categoria: 'Iluminação pública',
      status: 'aprovada',
      userId
    });
    await Share.bulkCreate([
      { denunciaId: maisCompartilhada.id, userId },
      { denunciaId: maisCompartilhada.id, userId: admId },
      { denunciaId, userId }
    ]);

    const res = await request(app).get('/denuncia/filter').query({ sort: 'shares' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].id).toBe(maisCompartilhada.id);
    expect(res.body.data[0].sharesCount).toBe(2);
    await Share.destroy({ where: { denunciaId: [maisCompartilhada.id, denunciaId] } });
    await maisCompartilhada.destroy();
  });

  // -------------------------------------------------------------------
  test("GET /denuncia/:id → retorna denúncia específica", async () => {
    console.log("➡️ Teste: buscar denúncia por ID");

    const res = await request(app).get(`/denuncia/${denunciaId}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id", denunciaId);
  });

  // -------------------------------------------------------------------
  test("GET /denuncia/user/:userId → denúncias do usuário", async () => {
    console.log("➡️ Teste: listar denúncias por usuário");

    const res = await request(app).get(`/denuncia/user/${userId}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    console.log("Resposta:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // -------------------------------------------------------------------
  test("PUT /denuncia/:id → atualizar denúncia (somente autor)", async () => {
    console.log("➡️ Teste: editar denúncia");

    await Denuncia.update({ status: 'rejeitada' }, { where: { id: denunciaId } });
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

  test("PUT /denuncia/:id remove a imagem da denúncia no banco", async () => {
    await Denuncia.update(
      { status: 'rejeitada', imageUrl: '/uploads/denuncia-teste.jpg' },
      { where: { id: denunciaId } }
    );

    const res = await request(app)
      .put(`/denuncia/${denunciaId}`)
      .set("Authorization", `Bearer ${tokenUser}`)
      .send({ removeImage: true });

    expect(res.statusCode).toBe(200);
    const denuncia = await Denuncia.findByPk(denunciaId);
    expect(denuncia.imageUrl).toBeNull();
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
