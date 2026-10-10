export function resolveImageUrl(value: string, apiBaseUrl: string, development: boolean): string | null {
  try {
    const url = new URL(value, `${apiBaseUrl}/`);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    // Uploads locais antigos podem ter sido salvos com localhost pelo backend.
    if (development && ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname) && url.pathname.startsWith('/uploads/')) {
      return new URL(`${url.pathname}${url.search}`, `${apiBaseUrl}/`).toString();
    }
    return url.toString();
  } catch { return null; }
}
