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

    fireEvent.click(screen.getByRole('button', { name: /exportar/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8;');
  });
});
