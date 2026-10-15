// Endereços antigos são texto livre. Removemos a numeração residencial nos
// formatos usuais sem apagar números que fazem parte do nome da via.
export function publicAddress(address: string): string {
  const number = String.raw`\d+[a-z]?(?:\s*[-/]\s*(?:\d+[a-z]?|[a-z]))?`;
  const marker = String.raw`(?:n(?:[úu]mero|um\.?|\.?\s*[º°o.]?)|nro\.?)\s*:?\s*`;
  const complement = String.raw`(?:casa|apto\.?|apartamento|bloco|lote|quadra|complemento)`;
  return address.trim().split(/\s*[,;]\s*|\s+[-–—]\s+/).map((part, index) => {
    if (new RegExp(`^(?:${marker})?(?:${number}|s\\s*[/]\\s*n|sem número)(?:\\s+${complement}\\b.*)?$`, 'i').test(part)
      || new RegExp(`^${complement}\\b`, 'i').test(part)) return '';
    const withoutMarkedNumber = part.replace(new RegExp(`\\s+${marker}(?:${number}|s\\s*[/]\\s*n)(?:\\s.*)?$`, 'i'), '');
    if (index > 0) return withoutMarkedNumber;
    const trailing = withoutMarkedNumber.match(new RegExp(`^(.+?)\\s+${number}(?:\\s+${complement}\\b.*)?$`, 'i'));
    if (!trailing) return withoutMarkedNumber;
    const street = trailing[1]!.trim();
    if (/^(?:rua|r\.?|avenida|av\.?|travessa|alameda|estrada|rodovia|praça)$/i.test(street)
      || /^(?:(?:rodovia|estrada)\s+)?(?:BR|SP)$/i.test(street)
      || /\b(?:km|quil[oô]metro)$/i.test(street)) return withoutMarkedNumber;
    return street;
  }).filter(Boolean).join(', ');
}
