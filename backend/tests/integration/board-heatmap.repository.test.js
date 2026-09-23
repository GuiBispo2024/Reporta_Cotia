const BoardRepository = require('../../repositories/BoardRepository');
const { sequelize, Denuncia } = require('../../models/rel');

const report = (titulo, latitude, longitude, overrides = {}) => ({
  titulo,
  descricao: 'Descrição suficiente para o teste',
  localizacao: 'Endereço que não deve aparecer na agregação',
  bairro: 'Centro',
  categoria: 'Iluminação pública',
  latitude,
  longitude,
  status: 'aprovada',
  resolucaoStatus: 'aberta',
  ...overrides
});

describe('Agregação geográfica do mapa de calor', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await Denuncia.bulkCreate([
      report('Ponto próximo 1', -23.6001, -46.9201),
      report('Ponto próximo 2', -23.6002, -46.9202),
      report('Ponto próximo 3', -23.6003, -46.9203),
      report('Região protegida 1', -23.6501, -46.9701),
      report('Região protegida 2', -23.6502, -46.9702),
      report('Outra categoria', -23.6004, -46.9204, { categoria: 'Outros' }),
      report('Sem coordenadas', null, null)
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('agrupa pontos próximos e omite células abaixo do mínimo de privacidade', async () => {
    const cells = await BoardRepository.heatmapCells({
      status: 'aprovada',
      categoria: 'Iluminação pública'
    });

    expect(cells).toEqual([
      { latitude: -23.6, longitude: -46.92, total: 3 }
    ]);
    expect(cells[0]).not.toHaveProperty('id');
    expect(cells[0]).not.toHaveProperty('titulo');
    expect(cells[0]).not.toHaveProperty('localizacao');
  });

  test('agrega mais de 500 registros sem aplicar o limite legado de pontos', async () => {
    await Denuncia.bulkCreate(Array.from({ length: 501 }, (_, index) => report(
      `Registro de volume ${index + 1}`,
      -23.7001 - index % 3 * 0.0001,
      -46.8001 - index % 3 * 0.0001,
      { bairro: 'Teste de volume' }
    )));

    const cells = await BoardRepository.heatmapCells({
      status: 'aprovada',
      bairro: 'Teste de volume'
    });

    expect(cells).toContainEqual({
      latitude: -23.7,
      longitude: -46.8,
      total: 501
    });
  });
});
