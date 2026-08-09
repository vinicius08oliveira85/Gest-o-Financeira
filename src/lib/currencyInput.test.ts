import { describe, it, expect } from 'vitest';
import { maskCurrencyInput, parseCurrencyInput, formatCurrencyForInput } from './currencyInput';

describe('maskCurrencyInput', () => {
  it('agrupa milhares com ponto', () => {
    expect(maskCurrencyInput('1234')).toBe('1.234');
  });

  it('mantém até 2 casas decimais após vírgula', () => {
    expect(maskCurrencyInput('1234,567')).toBe('1.234,56');
  });

  it('aceita ponto como decimal e converte para vírgula', () => {
    expect(maskCurrencyInput('1234.56')).toBe('1.234,56');
  });

  it('remove caracteres não numéricos', () => {
    expect(maskCurrencyInput('R$ 1.234,56')).toBe('1.234,56');
  });

  it('remove zeros à esquerda do inteiro', () => {
    expect(maskCurrencyInput('05')).toBe('5');
  });

  it('vazio retorna vazio', () => {
    expect(maskCurrencyInput('')).toBe('');
    expect(maskCurrencyInput('abc')).toBe('');
  });

  it('zero único permanece', () => {
    expect(maskCurrencyInput('0')).toBe('0');
  });
});

describe('parseCurrencyInput', () => {
  it('parseia formato pt-BR com milhar e vírgula', () => {
    expect(parseCurrencyInput('1.234,56')).toBe(1234.56);
  });

  it('parseia vírgula decimal sem milhar', () => {
    expect(parseCurrencyInput('1234,56')).toBe(1234.56);
  });

  it('parseia ponto decimal', () => {
    expect(parseCurrencyInput('1234.56')).toBe(1234.56);
  });

  it('parseia inteiro', () => {
    expect(parseCurrencyInput('1500')).toBe(1500);
  });

  it('retorna null para vazio ou inválido', () => {
    expect(parseCurrencyInput('')).toBeNull();
    expect(parseCurrencyInput('abc')).toBeNull();
  });
});

describe('formatCurrencyForInput', () => {
  it('formata número para pt-BR com 2 casas decimais', () => {
    expect(formatCurrencyForInput(1500)).toBe('1.500,00');
    expect(formatCurrencyForInput(1234.5)).toBe('1.234,50');
    expect(formatCurrencyForInput(0)).toBe('0,00');
  });

  it('retorna vazio para não-número', () => {
    expect(formatCurrencyForInput(Number.NaN)).toBe('');
  });
});
