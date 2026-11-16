import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { INITIAL_BALANCE_STORAGE_KEY } from '../constants';
import { readInitialBalance, useInitialBalance } from './useInitialBalance';

describe('useInitialBalance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('começa em zero sem valor gravado', () => {
    const { result } = renderHook(() => useInitialBalance());
    expect(result.current.initialBalance).toBe(0);
  });

  it('lê o valor existente do dispositivo', () => {
    localStorage.setItem(INITIAL_BALANCE_STORAGE_KEY, '1250.75');
    const { result } = renderHook(() => useInitialBalance());
    expect(result.current.initialBalance).toBe(1250.75);
  });

  it('grava o valor arredondado em centavos e aceita negativo', () => {
    const { result } = renderHook(() => useInitialBalance());

    act(() => result.current.setInitialBalance(-123.456));

    expect(result.current.initialBalance).toBe(-123.46);
    expect(readInitialBalance()).toBe(-123.46);
  });

  it('ignora valor corrompido no armazenamento', () => {
    localStorage.setItem(INITIAL_BALANCE_STORAGE_KEY, 'abc');
    expect(readInitialBalance()).toBe(0);
  });
});
