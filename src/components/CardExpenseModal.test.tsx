import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardExpenseModal } from './CardExpenseModal';
import type { CardExpense, CreditCard } from '../types';

const card: CreditCard = {
  id: 'c1',
  name: 'Nubank',
  limitAmount: 3000,
  closingDay: 25,
  dueDay: 5,
};

function expense(overrides: Partial<CardExpense> = {}): CardExpense {
  return {
    id: 'x1',
    cardId: card.id,
    name: 'Mercado',
    amount: 600,
    date: '2026-11-10',
    billingMonth: 10,
    billingYear: 2026,
    createdAt: 1,
    ...overrides,
  };
}

describe('CardExpenseModal', () => {
  it('pede a exclusão do gasto e fecha o modal', () => {
    const onRequestDelete = vi.fn();
    const onClose = vi.fn();
    const target = expense();

    render(
      <CardExpenseModal
        open
        card={card}
        expense={target}
        onSave={vi.fn()}
        onRequestDelete={onRequestDelete}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir gasto' }));

    // O modal só sinaliza; quem confirma e apaga é o App (ConfirmDeleteModal).
    expect(onRequestDelete).toHaveBeenCalledWith(target);
    expect(onClose).toHaveBeenCalled();
  });

  it('avisa que a exclusão de um parcelado atinge só aquela parcela', () => {
    const onRequestDelete = vi.fn();

    render(
      <CardExpenseModal
        open
        card={card}
        expense={expense({ installmentsCount: 3, installmentNumber: 2, name: 'Notebook' })}
        onSave={vi.fn()}
        onRequestDelete={onRequestDelete}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir esta parcela' }));

    expect(onRequestDelete).toHaveBeenCalledTimes(1);
    expect(onRequestDelete.mock.calls[0][0]).toMatchObject({
      installmentNumber: 2,
      installmentsCount: 3,
    });
  });

  it('não oferece exclusão ao cadastrar um gasto novo', () => {
    render(
      <CardExpenseModal
        open
        card={card}
        expense={null}
        onSave={vi.fn()}
        onRequestDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Salvar gasto' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir/i })).toBeNull();
  });
});
