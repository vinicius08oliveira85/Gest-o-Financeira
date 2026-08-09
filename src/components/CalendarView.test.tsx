import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarView } from './CalendarView';
import type { Entry } from '../types';

// Agosto de 2026 (month 7). Dia 10 tem 2 lançamentos: 1 entrada paga e 1 saída pendente.
const month = 7;
const year = 2026;

function entry(overrides: Partial<Entry> & { id: string; name: string; amount: number }): Entry {
  return {
    dueDate: '2026-08-10',
    isPaid: false,
    type: 'debt',
    createdAt: 1,
    ...overrides,
  };
}

const entries: Entry[] = [
  entry({ id: 'cash-paid', name: 'Salário', amount: 1000, type: 'cash', isPaid: true }),
  entry({ id: 'debt-pending', name: 'Conta de luz', amount: 150, type: 'debt', isPaid: false }),
];

describe('CalendarView', () => {
  it('mostra o resumo com o total de lançamentos', () => {
    render(<CalendarView entries={entries} month={month} year={year} />);

    expect(screen.getByText('2 lançamentos')).toBeTruthy();
    // Nomes aparecem nas células (visíveis no DOM mesmo com classes responsivas).
    expect(screen.getByText('Salário')).toBeTruthy();
    expect(screen.getByText('Conta de luz')).toBeTruthy();
  });

  it('filtra por tipo: Saídas esconde entradas', () => {
    render(<CalendarView entries={entries} month={month} year={year} />);

    fireEvent.click(screen.getByRole('button', { name: 'Saídas' }));

    expect(screen.getByText('1 lançamento')).toBeTruthy();
    expect(screen.queryByText('Salário')).toBeNull();
    expect(screen.getByText('Conta de luz')).toBeTruthy();
  });

  it('filtra por status: Finalizados esconde pendentes', () => {
    render(<CalendarView entries={entries} month={month} year={year} />);

    fireEvent.click(screen.getByRole('button', { name: 'Finalizados' }));

    expect(screen.getByText('1 lançamento')).toBeTruthy();
    expect(screen.getByText('Salário')).toBeTruthy();
    expect(screen.queryByText('Conta de luz')).toBeNull();
  });

  it('combina filtros de tipo e status (sem resultados mostra o aviso)', () => {
    render(<CalendarView entries={entries} month={month} year={year} />);

    fireEvent.click(screen.getByRole('button', { name: 'Saídas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finalizados' }));

    expect(screen.getByText('0 lançamentos')).toBeTruthy();
    expect(screen.getByText(/Nenhum lançamento corresponde aos filtros/i)).toBeTruthy();
  });

  it('conta lançamentos atrasados no resumo', () => {
    const overdue: Entry = entry({
      id: 'debt-overdue',
      name: 'Conta atrasada',
      amount: 50,
      type: 'debt',
      isPaid: false,
      dueDate: '2026-08-05', // dia diferente, mesmo mês
    });
    render(<CalendarView entries={[...entries, overdue]} month={month} year={year} />);

    expect(screen.getByText(/1 atrasado/i)).toBeTruthy();
  });
});
