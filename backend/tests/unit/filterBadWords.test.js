const filterBadWords = require('../../utils/filterBadWords');

describe('filtro automático de palavras impróprias', () => {
  test.each([
    'Isso é uma merda', 'Que p0rr@', 'p.o.r.r.a', 'Caraaallho',
    'seu desgraçado', 'vai se fuder', 'f d p', 'VAGABUNDA'
  ])('censura variação: %s', texto => {
    const result = filterBadWords(texto);
    expect(result.hasBadWord).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.filteredText).not.toBe(texto);
    expect(result.filteredText).toContain('•••');
  });

  test.each([
    'O computador está funcionando', 'Um documento cultural',
    'A reputação do usuário', 'Vamos disputar a partida', 'A rua está escura'
  ])('não censura texto legítimo: %s', texto => {
    expect(filterBadWords(texto)).toEqual({
      hasBadWord: false, filteredText: texto, matches: []
    });
  });

  test('censura todas as ocorrências e preserva o restante da mensagem', () => {
    const result = filterBadWords('merda no local, que porra!');
    expect(result.hasBadWord).toBe(true);
    expect(result.matches).toHaveLength(2);
    expect(result.filteredText).toMatch(/^•+ no local, que •+!$/);
  });
});
