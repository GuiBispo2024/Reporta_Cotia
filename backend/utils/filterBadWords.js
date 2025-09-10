const badWords = ["palavrão1", "palavrão2", "palavrão3"]

function filterBadWords(text) {
  const regex = new RegExp(`\\b(${badWords.join("|")})\\b`, "gi")
  const hasBadWord = regex.test(text)
  const filteredText = text.replace(regex, "***")
  return { hasBadWord, filteredText }
}

module.exports = filterBadWords
