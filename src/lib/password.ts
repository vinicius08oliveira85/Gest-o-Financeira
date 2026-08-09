import { PASSWORD_STORAGE_KEY } from '../constants';

const MIN_PASSWORD_LENGTH = 4;
/** Iterações PBKDF2 (OWASP recomenda ≥ 600k para SHA-256; 150k é um equilíbrio razoável para mobile). */
const PBKDF2_ITERATIONS = 150_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sha256(data: BufferSource): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', data);
}

function concatBuffers(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.byteLength + b.byteLength);
  result.set(a, 0);
  result.set(b, a.byteLength);
  return result;
}

async function derivePbkdf2Key(
  password: string,
  salt: BufferSource,
  iterations: number
): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    HASH_BITS
  );
}

export function hasStoredPassword(): boolean {
  try {
    const raw = localStorage.getItem(PASSWORD_STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as { salt?: string; hash?: string };
    return Boolean(data?.salt && data?.hash);
  } catch {
    return false;
  }
}

export async function setPassword(password: string): Promise<void> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  const saltBuffer = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hashBuffer = await derivePbkdf2Key(password, saltBuffer, PBKDF2_ITERATIONS);
  localStorage.setItem(
    PASSWORD_STORAGE_KEY,
    JSON.stringify({
      salt: bufferToBase64(saltBuffer),
      hash: bufferToBase64(hashBuffer),
      iterations: PBKDF2_ITERATIONS,
    })
  );
}

export async function verifyPassword(password: string): Promise<boolean> {
  const raw = localStorage.getItem(PASSWORD_STORAGE_KEY);
  if (!raw) return false;
  let data: { salt: string; hash: string; iterations?: number };
  try {
    data = JSON.parse(raw) as { salt: string; hash: string; iterations?: number };
  } catch {
    return false;
  }
  if (!data.salt || !data.hash) return false;
  const saltBuffer = base64ToBuffer(data.salt);

  const iterations = typeof data.iterations === 'number' ? data.iterations : 0;
  if (iterations > 0) {
    const hashBuffer = await derivePbkdf2Key(password, saltBuffer, iterations);
    return bufferToBase64(hashBuffer) === data.hash;
  }

  // Hash legado (SHA-256 de uma rodada): verifica e migra para PBKDF2 automaticamente.
  const passwordBuffer = new TextEncoder().encode(password);
  const combined = concatBuffers(saltBuffer, passwordBuffer);
  const hashBuffer = await sha256(combined);
  const hashBase64 = bufferToBase64(hashBuffer);
  if (hashBase64 === data.hash) {
    await setPassword(password);
    return true;
  }
  return false;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const ok = await verifyPassword(currentPassword);
  if (!ok) return false;
  await setPassword(newPassword);
  return true;
}

export const MIN_PASSWORD_LENGTH_EXPORT = MIN_PASSWORD_LENGTH;
