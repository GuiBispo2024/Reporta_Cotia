const { approximateCoordinates, publicReport, publicBreakdown } = require('../../utils/publicGeography');
test('rótulos de bairros legados contendo endereço/número não contornam a projeção pública', () => {
  expect(publicBreakdown({ neighborhoods: [{ label: 'Casa 55', total: 1 }, { label: 'Rua Privada', total: 2 }, { label: 'Centro', total: 4 }] }).neighborhoods)
    .toEqual([{ label: 'Região não divulgada', total: 3 }, { label: 'Centro', total: 4 }]);
});
test('generaliza coordenadas sem alterar a fonte e retira endereço/censura da projeção', () => {
  const original = { latitude: '-23.612345', longitude: '-46.923456', localizacao: 'Rua Particular 123', bairro: 'Casa 55', tituloOriginal: 'privado', motivoRejeicao: 'privado' };
  const projected = publicReport(original);
  expect(projected).toMatchObject({ latitude: -23.61, longitude: -46.92, localizacao: 'Cotia — localização aproximada', bairro: '', locationApproximate: true });
  expect(JSON.stringify(projected)).not.toMatch(/123|55|privado/);
  expect(original.latitude).toBe('-23.612345');
  expect(approximateCoordinates(0, 0)).toEqual({ latitude: 0, longitude: 0 });
  expect(publicReport({ id: 1 })).not.toHaveProperty('latitude');
});
test.each([[null, 0], ['', 0], ['   ', 0], [true, 1], [{}, 0], [91, 0], [0, 181], [NaN, 0], [0, Infinity]])('coordenadas inválidas %j não viram pontos públicos', (lat, lon) => {
  expect(approximateCoordinates(lat, lon)).toEqual({ latitude: null, longitude: null });
});
