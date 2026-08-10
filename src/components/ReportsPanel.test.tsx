import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ReportsPanel } from './ReportsPanel';
import { TREND_MONTHS_KEY } from '../constants';

describe('ReportsPanel', () => {
  afterEach(() => {
    localStorage.removeItem(TREND_MONTHS_KEY);
    vi.restoreAllMocks();
  });

  it('mostra 6 meses por padrão na evolução', () => {
    render(<ReportsPanel entries={[]} month={2} year={2025} />);

    expect(screen.getByText('Últimos 6 meses (entradas e saídas lançadas)')).toBeInTheDocument();
  });

  it('troca a janela para 12 meses e persiste a escolha', () => {
    render(<ReportsPanel entries={[]} month={2} year={2025} />);

    fireEvent.click(screen.getByRole('button', { name: '12m' }));

    expect(screen.getByText('Últimos 12 meses (entradas e saídas lançadas)')).toBeInTheDocument();
    expect(localStorage.getItem(TREND_MONTHS_KEY)).toBe('12');
  });

  it('respeita a janela persistida ao montar', () => {
    localStorage.setItem(TREND_MONTHS_KEY, '3');

    render(<ReportsPanel entries={[]} month={2} year={2025} />);

    expect(screen.getByText('Últimos 3 meses (entradas e saídas lançadas)')).toBeInTheDocument();
  });

  it('ignora janela persistida inválida e usa 6 meses', () => {
    localStorage.setItem(TREND_MONTHS_KEY, 'abc');

    render(<ReportsPanel entries={[]} month={2} year={2025} />);

    expect(screen.getByText('Últimos 6 meses (entradas e saídas lançadas)')).toBeInTheDocument();
  });

  it('exporta a evolução em CSV ao clicar em Exportar', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ReportsPanel entries={[]} month={2} year={2025} />);

    // Nome exato: o cabeçalho ganhou um segundo botão "Exportar" (relatórios completos)
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8;');
  });

  it('exporta o relatório completo (KPIs + categorias) em CSV', () => {
    let capturedParts: BlobPart[] = [];
    const RealBlob = global.Blob;
    vi.spyOn(global, 'Blob').mockImplementation((parts?: BlobPart[], opts?: BlobPropertyBag) => {
      capturedParts = parts ? [...parts] : [];
      return new RealBlob(parts ?? [], opts);
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ReportsPanel entries={[]} month={2} year={2025} />);

    fireEvent.click(screen.getByRole('button', { name: /relatórios completos/i }));

    expect(capturedParts.length).toBeGreaterThan(0);
    const content = String(capturedParts[0]);
    expect(content.startsWith('\uFEFF')).toBe(true);
    expect(content).toContain('Relatório de março de 2025');
    expect(content).toContain('Métrica,Valor,Mês anterior,Variação %');
    expect(content).toContain('Categorias (saídas)');
    expect(content).toContain('Categorias (entradas)');
  });
});
