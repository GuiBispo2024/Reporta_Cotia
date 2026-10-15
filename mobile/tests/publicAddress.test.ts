import { publicAddress } from '../src/utils/publicAddress';

test.each([
  ['Rua das Flores, 123, Cotia', 'Rua das Flores, Cotia'],
  ['Rua das Flores, nº 123, Cotia', 'Rua das Flores, Cotia'],
  ['Rua das Flores n.º 123', 'Rua das Flores'],
  ['Rua das Flores número 123', 'Rua das Flores'],
  ['Rua das Flores 123', 'Rua das Flores'],
  ['Rua das Flores, 123-A, Cotia', 'Rua das Flores, Cotia'],
  ['Rua das Flores, 123/125, apto 4, Cotia', 'Rua das Flores, Cotia'],
  ['Rua das Flores - 123 - Centro', 'Rua das Flores, Centro'],
  ['Rua das Flores, s/n, Cotia', 'Rua das Flores, Cotia'],
  ['Rua 25 de Março, 123, Cotia', 'Rua 25 de Março, Cotia'],
  ['Rua 13', 'Rua 13'],
  ['Rua 13, 42', 'Rua 13'],
  ['Avenida 9 de Julho', 'Avenida 9 de Julho'],
  ['Rodovia Raposo Tavares km 25', 'Rodovia Raposo Tavares km 25'],
  ['Rodovia SP 270', 'Rodovia SP 270'],
  ['BR 116', 'BR 116'],
  ['Rua das Flores, Cotia', 'Rua das Flores, Cotia'],
  ['Rua das Flores, 123, Jardim 25', 'Rua das Flores, Jardim 25'],
  ['', ''],
])('endereço público: %s → %s', (input, expected) => {
  expect(publicAddress(input)).toBe(expected);
  expect(publicAddress(publicAddress(input))).toBe(expected);
});
