const { factFromReport, neighborhood } = require('../../analytics/quality');
const now = new Date('2026-09-26T12:00:00Z');
const report = overrides => ({ id: 1, createdAt: '2026-01-01T00:00:00Z', categoria: 'Outros', bairro: 'Centro', localizacao: 'Rua Um, Cotia', status: 'aprovada', resolucaoStatus: 'resolvida',
  DenunciaHistoricos: [
    { id: 1, tipo: 'moderacao', statusNovo: 'aprovada', createdAt: '2026-01-02T00:00:00Z' },
    { id: 2, tipo: 'resolucao', statusNovo: 'resolvida', createdAt: '2026-01-04T00:00:00Z' }
  ], ...overrides });

test('normaliza bairros sem juntar nomes diferentes e reconhece categoria canônica', () => {
  expect(neighborhood('  JD.   SÃO josé ')).toBe('Jardim Sao Jose');
  expect(neighborhood('jardim sao jose')).toBe('Jardim Sao Jose');
  expect(neighborhood('São José II')).not.toBe(neighborhood('São José'));
  expect(neighborhood('Não informado')).toBeNull();
  expect(factFromReport(report({ categoria: ' iluminacao PUBLICA ' }), now).categoria).toBe('Iluminação pública');
});
test('mede primeiro ciclo e não duplica com novos eventos', () => {
  const source = report();
  source.DenunciaHistoricos.push({ id: 3, tipo: 'moderacao', statusNovo: 'aprovada', createdAt: '2026-02-01' }, { id: 4, tipo: 'resolucao', statusNovo: 'resolvida', createdAt: '2026-02-04' });
  expect(factFromReport(source, now)).toMatchObject({ moderationHours: 24, resolutionHours: 48, issues: [], eligible: true });
});
test.each([null, '', 'invalid', '2027-01-01'])('exclui cadastro inválido %s sem inventar data', createdAt => {
  expect(factFromReport(report({ createdAt }), now)).toMatchObject({ eligible: false, day: null, moderationHours: null, resolutionHours: null });
});
test('ausência de categoria/bairro não exclui indicadores independentes', () => {
  const fact = factFromReport(report({ categoria: '', bairro: null, localizacao: 'Cotia' }), now);
  expect(fact).toMatchObject({ eligible: true, categoria: null, bairro: null, moderationHours: 24 });
  expect(fact.issues).toEqual(expect.arrayContaining(['missing_category', 'missing_neighborhood', 'incomplete_address']));
});
test('resolução anterior à aprovação invalida médias e sinaliza qualidade', () => {
  const source = report();
  source.DenunciaHistoricos[1].createdAt = '2026-01-01T12:00:00Z';
  expect(factFromReport(source, now)).toMatchObject({ eligible: true, moderationHours: null, resolutionHours: null, issues: ['invalid_history'] });
});
test('estado incompatível não entra nos totais', () => {
  expect(factFromReport(report({ status: 'rejeitada' }), now)).toMatchObject({ eligible: false, status: null, issues: ['invalid_status'] });
});
