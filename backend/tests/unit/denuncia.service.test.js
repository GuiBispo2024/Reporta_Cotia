const DenunciaService = require('../../services/DenunciaService');
const DenunciaRepository = require('../../repositories/DenunciaRepository');
const filterBadWords = require('../../utils/filterBadWords');

jest.mock('../../repositories/DenunciaRepository');
jest.mock('../../utils/filterBadWords');

describe('DenunciaService (unit)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------
  // create()
  // -----------------------------
  test('create: cria denúncia com sucesso', async () => {
    console.log("➡️ Testando: create()");

    filterBadWords.mockReturnValue({ hasBadWord: false, filteredText: "titulo" });
    filterBadWords.mockReturnValueOnce({ hasBadWord: false, filteredText: "titulo" });
    filterBadWords.mockReturnValueOnce({ hasBadWord: false, filteredText: "descricao" });

    DenunciaRepository.create.mockResolvedValue({
      id: 1,
      titulo: "titulo",
      descricao: "descricao",
      localizacao: "Rua A",
      status: "pendente",
      userId: 10
    });

    const result = await DenunciaService.create(
      { titulo: "titulo", descricao: "descricao", localizacao: "Rua A" },
      { id: 10 }
    );

    console.log("📦 Resultado:", result);

    expect(DenunciaRepository.create).toHaveBeenCalled();
    expect(result.message).toBe("Denúncia enviada para moderação com sucesso.");
    expect(result.denuncia).toHaveProperty("id");
  });

  test('create: erro se faltar campo obrigatório', async () => {
    console.log("➡️ Testando: create() — faltando campos");

    await expect(
      DenunciaService.create({ titulo: "", descricao: "", localizacao: "" }, { id: 1 })
    ).rejects.toThrow("Título é obrigatório.");
  });

  // -----------------------------
  // moderar()
  // -----------------------------
  test('moderar: admin aprova denúncia', async () => {
    console.log("➡️ Testando: moderar()");

    DenunciaRepository.findById.mockResolvedValue({ id: 1, status: "pendente" });
    DenunciaRepository.update.mockResolvedValue();
    DenunciaRepository.findById.mockResolvedValueOnce({
      id: 1,
      status: "aprovada"
    });

    const res = await DenunciaService.moderar(1, "aprovada", true);

    console.log("📦 Resultado:", res);

    expect(res.message).toBe("Denúncia marcada como aprovada.");
    expect(res.denuncia.status).toBe("aprovada");
  });

  test('moderar: erro se não for admin', async () => {
    console.log("➡️ Testando: moderar() — não admin");

    await expect(
      DenunciaService.moderar(1, "aprovada", false)
    ).rejects.toThrow("Acesso negado. Apenas administradores podem moderar denúncias.");
  });

  test('moderar: erro se status inválido', async () => {
    console.log("➡️ Testando: moderar() — status inválido");

    await expect(
      DenunciaService.moderar(1, "xxxx", true)
    ).rejects.toThrow("Status de moderação inválido.");
  });

  test('moderar: erro denúncia não encontrada', async () => {
    console.log("➡️ Testando: moderar() — denuncia não existe");

    DenunciaRepository.findById.mockResolvedValue(null);

    await expect(
      DenunciaService.moderar(99, "aprovada", true)
    ).rejects.toThrow("Denúncia não encontrada.");
  });

  // -----------------------------
  // buscarPorId()
  // -----------------------------
  test('buscarPorId: retorna denúncia', async () => {
    console.log("➡️ Testando: buscarPorId()");

    DenunciaRepository.findById.mockResolvedValue({ id: 1, status: 'aprovada' });

    const res = await DenunciaService.buscarPorId(1);

    expect(res).toEqual({ id: 1, status: 'aprovada' });
  });

  test('buscarPorId: erro se não existe', async () => {
    console.log("➡️ Testando: buscarPorId() — não encontrada");

    DenunciaRepository.findById.mockResolvedValue(null);

    await expect(DenunciaService.buscarPorId(123))
      .rejects.toThrow("Denúncia não encontrada.");
  });

  // -----------------------------
  // buscarPorUsuario()
  // -----------------------------
  test('buscarPorUsuario: retorna lista', async () => {
    console.log("➡️ Testando: buscarPorUsuario()");

    DenunciaRepository.findByUserId.mockResolvedValue([{ id: 1 }]);

    const res = await DenunciaService.buscarPorUsuario(10);

    expect(res.length).toBe(1);
  });

  test('buscarPorUsuario: erro se vazio', async () => {
    console.log("➡️ Testando: buscarPorUsuario() — sem resultados");

    DenunciaRepository.findByUserId.mockResolvedValue([]);

    await expect(DenunciaService.buscarPorUsuario(10)).resolves.toEqual([]);
  });

  // -----------------------------
  // atualizar()
  // -----------------------------
  test('atualizar: autor atualiza denúncia', async () => {
    console.log("➡️ Testando: atualizar()");

    DenunciaRepository.findById.mockResolvedValue({ id: 1, userId: 10, status: 'rejeitada' });

    DenunciaRepository.update.mockResolvedValue();

    const res = await DenunciaService.atualizar(1, { titulo: "novo" }, 10);

    expect(res.message).toBe("Denúncia atualizada e reenviada para moderação.");
  });

  test('atualizar: erro se não existe', async () => {
    console.log("➡️ Testando: atualizar() — denúncia não existe");

    DenunciaRepository.findById.mockResolvedValue(null);

    await expect(
      DenunciaService.atualizar(999, {}, 10)
    ).rejects.toThrow("Denúncia não encontrada.");
  });

  test('atualizar: erro se não é autor', async () => {
    console.log("➡️ Testando: atualizar() — usuário sem permissão");

    DenunciaRepository.findById.mockResolvedValue({ id: 1, userId: 20 });

    await expect(
      DenunciaService.atualizar(1, {}, 10)
    ).rejects.toThrow("Você não tem permissão para atualizar esta denúncia.");
  });

  // -----------------------------
  // deletar()
  // -----------------------------
  test('deletar: autor deleta denúncia', async () => {
    console.log("➡️ Testando: deletar()");

    DenunciaRepository.findById.mockResolvedValue({ id: 1, userId: 10 });
    DenunciaRepository.delete.mockResolvedValue();

    const res = await DenunciaService.deletar(1, 10);

    expect(res.message).toBe("Denúncia excluída com sucesso.");
  });

  test('deletar: erro se não existe', async () => {
    console.log("➡️ Testando: deletar() — denúncia não existe");

    DenunciaRepository.findById.mockResolvedValue(null);

    await expect(
      DenunciaService.deletar(123, 10)
    ).rejects.toThrow("Denúncia não encontrada.");
  });

  test('deletar: erro se não é autor', async () => {
    console.log("➡️ Testando: deletar() — sem permissão");

    DenunciaRepository.findById.mockResolvedValue({ id: 1, userId: 20 });

    await expect(
      DenunciaService.deletar(1, 10)
    ).rejects.toThrow("Você não tem permissão para excluir esta denúncia.");
  });

});
