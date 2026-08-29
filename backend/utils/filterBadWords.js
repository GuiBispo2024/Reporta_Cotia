const blockedTerms = [
  'arrombado', 'arrombada', 'bosta', 'buceta', 'caralho', 'desgracado',
  'desgracada', 'fdp', 'foder', 'fuder', 'fodido', 'fodida', 'merda',
  'porra', 'puta', 'puto', 'vagabundo', 'vagabunda', 'viado', 'cu'
];

const characterVariants = {
  a: '[aáàâãä@4]', e: '[eéèêë3]', i: '[iíìîï1!|]',
  o: '[oóòôõö0]', s: '[s$5]', u: '[uúùûü]', c: '[cç]'
};

const separator = '[\\s._\\-–—*~]*';

function termPattern(term) {
  return [...term]
    .map(character => `${characterVariants[character] || character}+`)
    .join(separator);
}

const profanityPattern = blockedTerms
  .sort((a, b) => b.length - a.length)
  .map(termPattern)
  .join('|');

const profanityRegex = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${profanityPattern})(?![\\p{L}\\p{N}])`,
  'giu'
);

function filterBadWords(text = '') {
  const value = String(text);
  const matches = [];
  const filteredText = value.replace(profanityRegex, match => {
    matches.push(match);
    return '•'.repeat(Math.max([...match].length, 3));
  });

  return { hasBadWord: matches.length > 0, filteredText, matches };
}

module.exports = filterBadWords;
