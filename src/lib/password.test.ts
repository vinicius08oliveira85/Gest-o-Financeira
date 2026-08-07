import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setPassword, verifyPassword, changePassword, hasStoredPassword } from './password';
import { PASSWORD_STORAGE_KEY } from '../constants';

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

describe('password', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('hasStoredPassword reflete se há senha salva', async () => {
    expect(hasStoredPassword()).toBe(false);
    await setPassword('1234');
    expect(hasStoredPassword()).toBe(true);
  });

  it('setPassword + verifyPassword (PBKDF2) verificam senha correta e rejeitam errada', async () => {
    await setPassword('1234');
    expect(await verifyPassword('1234')).toBe(true);
    expect(await verifyPassword('outra')).toBe(false);
  });

  it('rejeita senha curta', async () => {
    await expect(setPassword('123')).rejects.toThrow('mínimo');
  });

  it('migra hash legado SHA-256 para PBKDF2 na primeira verificação', async () => {
    // Simula o formato antigo (sem iterations): SHA-256(salt + senha)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const enc = new TextEncoder().encode('abcd');
    const combined = new Uint8Array(salt.length + enc.length);
    combined.set(salt, 0);
    combined.set(enc, salt.length);
    const hash = await crypto.subtle.digest('SHA-256', combined);
    localStorage.setItem(
      PASSWORD_STORAGE_KEY,
      JSON.stringify({ salt: bufferToBase64(salt.buffer), hash: bufferToBase64(hash) })
    );

    expect(await verifyPassword('abcd')).toBe(true);
    expect(await verifyPassword('errada')).toBe(false);

    const stored = JSON.parse(localStorage.getItem(PASSWORD_STORAGE_KEY)!) as {
      iterations?: number;
    };
    expect(stored.iterations).toBeGreaterThan(0);
    // Após a migração, a senha continua verificando com o novo formato
    expect(await verifyPassword('abcd')).toBe(true);
  });

  it('changePassword só troca com a senha atual correta', async () => {
    await setPassword('1234');
    expect(await changePassword('0000', '9999')).toBe(false);
    expect(await verifyPassword('1234')).toBe(true);

    expect(await changePassword('1234', '5678')).toBe(true);
    expect(await verifyPassword('5678')).toBe(true);
    expect(await verifyPassword('1234')).toBe(false);
  });
});
