import { describe, it, expect } from 'vitest';
import { buildReportsCsv } from './reports';

const baseInput = {
  monthLabel: 'fevereiro de 2025',
  totals: {
    entradas: 5000,
    saidas: 3000,
    saldo: 2000,
    prevEntradas: 4000,
    prevSaidas: 2000,
    prevSaldo: 2000,
  },
  categories: {
    saidas: { Aluguel: 1500, Mercado: 1500 },
    entradas: { Salário: 5000 },
  },
  cards: [
    { name: 'Nubank', total: 600, limit: 2000 },
    { name: 'Inter', total: 200, limit: 500 },
  ],
};

describe('buildReportsCsv', () => {
  it('gera o relatório completo com KPIs, variação, categorias e faturas', () => {
    const csv = buildReportsCsv(baseInput);

    // BOM UTF-8 para o Excel ler acentos
    expect(csv.startsWith('\uFEFF')).toBe(true);

    // Título
    expect(csv).toContain('Relatório de fevereiro de 2025');

    // KPIs com variação (entradas 5000 vs 4000 → +25.0)
    expect(csv).toContain('Métrica,Valor,Mês anterior,Variação %');
    expect(csv).toContain('Total entradas,5000.00,4000.00,25.0');
    // saídas 3000 vs 2000 → +50.0
    expect(csv).toContain('Total saídas,3000.00,2000.00,50.0');
    // saldo 2000 vs 2000 → 0.0
    expect(csv).toContain('Saldo do mês,2000.00,2000.00,0.0');

    // Categorias (saídas) ordenadas por valor decrescente com % do total
    expect(csv).toContain('Categorias (saídas)');
    expect(csv.indexOf('Mercado,1500.00,50.0')).toBeGreaterThan(-1);
    expect(csv.indexOf('Aluguel,1500.00,50.0')).toBeGreaterThan(-1);

    // Categorias (entradas)
    expect(csv).toContain('Categorias (entradas)');
    expect(csv).toContain('Salário,5000.00,100.0');

    // Faturas do mês com uso %
    expect(csv).toContain('Faturas do mês');
    expect(csv).toContain('Cartão,Fatura,Limite,Uso %');
    expect(csv).toContain('Nubank,600.00,2000.00,30.0');
    expect(csv).toContain('Inter,200.00,500.00,40.0');
  });

  it('deixa a variação em branco quando o mês anterior é zero', () => {
    const csv = buildReportsCsv({
      ...baseInput,
      totals: { ...baseInput.totals, prevEntradas: 0, prevSaidas: 0, prevSaldo: 0 },
    });

    expect(csv).toContain('Total entradas,5000.00,0.00,');
    expect(csv).toContain('Total saídas,3000.00,0.00,');
    expect(csv).toContain('Saldo do mês,2000.00,0.00,');
    // Sem valores fantasma de divisão por zero
    expect(csv).not.toContain('Infinity');
    expect(csv).not.toContain('NaN');
  });

  it('mantém os cabeçalhos das seções mesmo sem categorias', () => {
    const csv = buildReportsCsv({
      ...baseInput,
      categories: { saidas: {}, entradas: {} },
    });

    expect(csv).toContain('Categorias (saídas)');
    expect(csv).toContain('Categorias (entradas)');
    expect(csv).toContain('Categoria,Valor,% do total');
  });

  it('omite a seção de faturas quando não há cartões', () => {
    const csv = buildReportsCsv({ ...baseInput, cards: [] });

    expect(csv).not.toContain('Faturas do mês');
    expect(csv).not.toContain('Cartão,Fatura,Limite,Uso %');
  });

  it('escapa categorias que iniciam com caracteres de fórmula', () => {
    const csv = buildReportsCsv({
      ...baseInput,
      categories: { saidas: { '=SOMA(A1:A5)': 100 }, entradas: {} },
    });

    expect(csv).toContain("'=SOMA(A1:A5),100.00,100.0");
  });

  it('escreve saldo negativo como número (sem prefixo de fórmula)', () => {
    const csv = buildReportsCsv({
      ...baseInput,
      totals: { ...baseInput.totals, saldo: -500 },
    });

    expect(csv).toContain('Saldo do mês,-500.00,2000.00,-125.0');
    expect(csv).not.toContain("'-500");
  });
});
