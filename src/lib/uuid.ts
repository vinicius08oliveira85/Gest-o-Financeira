/**
 * Gera um UUID v4 de forma segura.
 *
 * Prefere `crypto.randomUUID()` (disponível apenas em contextos seguros:
 * HTTPS ou localhost). Em http:// (ex.: teste na rede local, como sugerido
 * no README com `--host`), `randomUUID` não existe — então usa
 * `crypto.getRandomValues` (disponível em qualquer contexto) ou, em último
 * caso, `Math.random`.
 */
function fallbackRandomUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch {
    // continua para o fallback Math.random
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function randomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return fallbackRandomUUID();
}
