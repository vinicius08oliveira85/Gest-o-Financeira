import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';

// jsdom não implementa WebCrypto (crypto.subtle); usa o webcrypto do Node para os testes
// de password.ts (PBKDF2/SHA-256) e geração de UUIDs.
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

if (
  typeof (URL as unknown as { createObjectURL?: (b: Blob) => string }).createObjectURL ===
  'undefined'
) {
  (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () =>
    'blob:mock-url';
}
if (
  typeof (URL as unknown as { revokeObjectURL?: (u: string) => void }).revokeObjectURL ===
  'undefined'
) {
  (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};
}
