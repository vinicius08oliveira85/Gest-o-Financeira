import { PASSWORD_STORAGE_KEY } from '../constants';

const MIN_PASSWORD_LENGTH = 4;

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function sha256(data: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', data);
}

function concatBuffers(
  a: ArrayBuffer | ArrayBufferLike,
  b: ArrayBuffer | ArrayBufferLike
): ArrayBuffer {
  const result = new Uint8Array(a.byteLength + b.byteLength);
  result.set(new Uint8Array(a), 0);
  result.set(new Uint8Array(b), a.byteLength);
  return result.buffer as ArrayBuffer;
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
  const saltBuffer = crypto.getRandomValues(new Uint8Array(16));
  const passwordBuffer = new TextEncoder().encode(password);
  const combined = concatBuffers(
    saltBuffer.buffer as ArrayBuffer,
    passwordBuffer.buffer as ArrayBuffer
  );
  const hashBuffer = await sha256(combined);
  localStorage.setItem(
    PASSWORD_STORAGE_KEY,
    JSON.stringify({
      salt: bufferToBase64(saltBuffer.buffer),
      hash: bufferToBase64(hashBuffer),
    })
  );
}

export async function verifyPassword(password: string): Promise<boolean> {
  const raw = localStorage.getItem(PASSWORD_STORAGE_KEY);
  if (!raw) return false;
  let data: { salt: string; hash: string };
  try {
    data = JSON.parse(raw) as { salt: string; hash: string };
  } catch {
    return false;
  }
  if (!data.salt || !data.hash) return false;
  const saltBuffer = base64ToBuffer(data.salt);
  const passwordBuffer = new TextEncoder().encode(password);
  const combined = concatBuffers(saltBuffer, passwordBuffer.buffer as ArrayBuffer);
  const hashBuffer = await sha256(combined);
  const hashBase64 = bufferToBase64(hashBuffer);
  return hashBase64 === data.hash;
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
