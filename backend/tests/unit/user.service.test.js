const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
jest.mock('../../repositories/UserRepository'); // ajusta o path conforme seu projeto
const UserRepository = require('../../repositories/UserRepository');
const UserService = require('../../services/UserService'); // ajuste path se necessário

describe('UserService (unit)', () => {
  beforeEach(() => {
    console.log("➡️ Iniciando teste: register()");
    jest.clearAllMocks();
  });

  test('register: cria usuário com password hash', async () => {
    console.log("➡️ Iniciando teste: register()");
    UserRepository.findByEmail.mockResolvedValue(null);
    UserRepository.findByUsername.mockResolvedValue(null);
    UserRepository.createWithRoles.mockImplementation((data) => {
      console.log("📦 Chamado UserRepository.createWithRoles com:", data);
      return Promise.resolve({ id: 1, ...data });
    });
    const result = await UserService.register({ username: 'u', email: 'e@e', password: '1234' });
    console.log("✅ Resultado recebido:", result);
    expect(UserRepository.findByEmail).toHaveBeenCalledWith('e@e');
    expect(UserRepository.findByUsername).toHaveBeenCalledWith('u');
    expect(UserRepository.createWithRoles).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'u', email: 'e@e' }),
      ['CITIZEN'],
      expect.any(Object)
    );
    expect(result).toHaveProperty('id', 1);
  });

  test('getMe: retorna perfis e permissões sem dados sensíveis', async () => {
    UserRepository.findByIdWithAccess.mockResolvedValue({
      get: () => ({
        id: 1,
        username: 'moderador',
        email: 'moderador@example.com',
        password: 'hash',
        tokenVersion: 2,
        roles: [{
          name: 'MODERATOR',
          permissions: [
            { key: 'moderation.view' },
            { key: 'moderation.review' },
            { key: 'moderation.view' }
          ]
        }]
      })
    })

    const result = await UserService.getMe(1)

    expect(result.roles).toEqual(['MODERATOR'])
    expect(result.permissions).toEqual(['moderation.view', 'moderation.review'])
    expect(result).not.toHaveProperty('password')
    expect(result).not.toHaveProperty('tokenVersion')
  })

  test('login: retorna token e dados do usuário quando senha válida', async () => {
    console.log("➡️ Iniciando teste: login()");
    const hashed = await bcrypt.hash('1234', 10);
    const mockUser = { id: 10, username: 'u', email: 'e@e', password: hashed, adm: false };
    UserRepository.findByEmail.mockResolvedValue(mockUser);
    UserRepository.findByIdWithAccess.mockResolvedValue({
      ...mockUser,
      roles: [{
        name: 'CITIZEN',
        permissions: [{ key: 'denuncia.create' }]
      }]
    });

    const spySign = jest.spyOn(jwt, 'sign').mockReturnValue('TOKEN');

    const res = await UserService.login({ email: 'e@e', password: '1234' });

    console.log("🔐 Token gerado:", res.token);
    console.log("👤 Dados do usuário retornado:", res.user);

    expect(UserRepository.findByEmail).toHaveBeenCalledWith('e@e');
    expect(spySign).toHaveBeenCalledWith(
      { id: 10, v: 0 },
      expect.any(String),
      { expiresIn: '30m' }
    );
    expect(res).toHaveProperty('token', 'TOKEN');
    expect(res.user).toMatchObject({ id: 10, username: 'u', email: 'e@e' });
    expect(res.user.roles).toEqual(['CITIZEN']);
    expect(res.user.permissions).toEqual(['denuncia.create']);
    expect(res.user).not.toHaveProperty('password');

    spySign.mockRestore();
  });

  test('getById: lança erro se não existe', async () => {
    console.log("➡️ Iniciando teste: getById() com ID inválido");
    UserRepository.findById.mockResolvedValue(null);
    await expect(UserService.getById(999)).rejects.toThrow('Usuário não encontrado.');
    console.log("⚠️ Erro capturado corretamente");
  });

  test('getAll: retorna lista de usuários', async () => {
    console.log("➡️ Iniciando teste: getAll()");

    const mockList = [
      { id: 1, username: 'a' },
      { id: 2, username: 'b' },
    ];

    UserRepository.findAll.mockResolvedValue(mockList);

    const res = await UserService.getAll();

    console.log("📋 Lista retornada:", res);

    expect(UserRepository.findAll).toHaveBeenCalled();
    expect(res.length).toBe(2);
  });

    test('update: troca de senha com sucesso', async () => {
    console.log("➡️ Iniciando teste: update() — troca de senha");

    const hashed = await bcrypt.hash("senhaAntiga", 10);

    // Usuário atual do banco
    UserRepository.findById.mockResolvedValue({
      id: 1,
      username: "user",
      email: "e@e",
      password: hashed,
      dataValues: {
        id: 1,
        username: "user",
        email: "e@e",
      }
    });

    UserRepository.update.mockResolvedValue([1]); // sucesso
    UserRepository.findByIdWithAccess.mockResolvedValue({
      id: 1,
      username: 'user',
      email: 'e@e',
      adm: false,
      tokenVersion: 0,
      roles: [{
        name: 'CITIZEN',
        permissions: [{ key: 'denuncia.create' }]
      }]
    });
    const spySign = jest.spyOn(jwt, "sign").mockReturnValue("TOKEN_ATUALIZADO");

    const result = await UserService.update(
      { senhaAtual: "senhaAntiga", novaSenha: "nova123" },
      1
    );

    console.log("🔐 Novo token:", result.token);
    console.log("👤 User atualizado:", result.user);

    expect(UserRepository.findById).toHaveBeenCalled();
    expect(UserRepository.update).toHaveBeenCalled();
    expect(spySign).toHaveBeenCalledWith(
      { id: 1, v: 0 },
      expect.any(String),
      { expiresIn: '30m' }
    );
    expect(result).toHaveProperty("token", "TOKEN_ATUALIZADO");
    expect(result.user.roles).toEqual(['CITIZEN']);
    expect(result.user.permissions).toEqual(['denuncia.create']);

    spySign.mockRestore();
  });

  test('update: erro se senha atual incorreta', async () => {
    console.log("➡️ Iniciando teste: update() — senha incorreta");

    const hashed = await bcrypt.hash("senhaCorreta", 10);

    UserRepository.findById.mockResolvedValue({ id: 1, password: hashed });

    await expect(
      UserService.update(
        { senhaAtual: "errada", novaSenha: "abc" },
        1
      )
    ).rejects.toThrow("Senha atual incorreta.");

    console.log("⚠️ Erro capturado corretamente (senha incorreta)");
  });

  test('update: erro se usuário não existe', async () => {
    console.log("➡️ Iniciando teste: update() — usuário inexistente");

    UserRepository.findById.mockResolvedValue(null);

    await expect(
      UserService.update({ username: "x" }, 999)
    ).rejects.toThrow("Usuário não encontrado.");

    console.log("⚠️ Erro corretamente identificado: usuário não existe");
  });

  test('delete: exclui usuário corretamente', async () => {
    console.log("➡️ Iniciando teste: delete()");

    const password = await bcrypt.hash('123456', 10);
    UserRepository.findById.mockResolvedValue({ id: 1, password });
    UserRepository.delete.mockImplementation((id) => {
      console.log("🗑️ Chamado delete:", id);
      return Promise.resolve(true);
    });

    const res = await UserService.delete(1, '123456');

    console.log("✅ Resultado:", res);

    expect(UserRepository.delete).toHaveBeenCalledWith(1);
    expect(res).toEqual({ message: "Usuário excluído com sucesso" });
  });
});
