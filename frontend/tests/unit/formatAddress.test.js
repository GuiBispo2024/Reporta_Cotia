import { extractDistrict, formatAddress } from '../../src/utils/formatAddress';

test('extrai o bairro retornado pela geocodificação reversa', () => {
  expect(extractDistrict({ address: { neighbourhood: 'Centro' } })).toBe('Centro');
  expect(extractDistrict({ address: { suburb: 'Granja Viana' } })).toBe('Granja Viana');
});

test('inclui o bairro no endereço formatado sem duplicar partes', () => {
  const data = { address: { road: 'Rua Central', house_number: '10', suburb: 'Centro', city: 'Cotia', state: 'São Paulo' } };
  expect(formatAddress(data)).toBe('Rua Central, 10 - Centro - Cotia - São Paulo');
});
