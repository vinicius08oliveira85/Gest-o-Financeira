import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntryItem } from './EntryItem';
import type { Entry } from '../types';

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    name: 'Compras da semana',
    amount: 120,
    dueDate: '2026-11-10',
    isPaid: false,
    type: 'debt',
    createdAt: 1,
    category: 'Mercado',
    ...overrides,
  };
}

const baseProps = {
  onTogglePaid: () => {},
  onEdit: () => {},
  onDeleteRequest: () => {},
};

describe('EntryItem — chip de categoria', () => {
  it('mostra o chip com ícone e aplica o filtro ao clicar', () => {
    const onSelectCategory = vi.fn();
    render(
      <EntryItem
        entry={entry()}
        {...baseProps}
        selectedCategory="all"
        onSelectCategory={onSelectCategory}
      />
    );

    const chip = screen.getByRole('button', { name: 'Mercado' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip).toHaveClass('neu-chip');
    expect(chip.querySelector('svg')).not.toBeNull();
    expect(chip).toHaveAttribute('title', 'Filtrar por Mercado');

    fireEvent.click(chip);

    expect(onSelectCategory).toHaveBeenCalledWith('Mercado');
  });

  it('destaca a categoria filtrada e limpa o filtro no segundo clique', () => {
    const onSelectCategory = vi.fn();
    render(
      <EntryItem
        entry={entry()}
        {...baseProps}
        selectedCategory="Mercado"
        onSelectCategory={onSelectCategory}
      />
    );

    const chip = screen.getByRole('button', { name: 'Mercado' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveClass('neu-chip-active');
    expect(chip).toHaveAttribute('title', 'Remover filtro de categoria');

    fireEvent.click(chip);

    expect(onSelectCategory).toHaveBeenCalledWith('all');
  });

  it('usa o ícone Filled só quando a categoria está ativa', () => {
    const { rerender } = render(
      <EntryItem
        entry={entry()}
        {...baseProps}
        selectedCategory="all"
        onSelectCategory={() => {}}
      />
    );
    const inativo = screen.getByRole('button', { name: 'Mercado' }).querySelector('svg')!.innerHTML;

    rerender(
      <EntryItem
        entry={entry()}
        {...baseProps}
        selectedCategory="Mercado"
        onSelectCategory={() => {}}
      />
    );
    const ativo = screen.getByRole('button', { name: 'Mercado' }).querySelector('svg')!.innerHTML;

    // Variantes diferentes do Fluent: Regular (contorno) x Filled (preenchida).
    expect(ativo).not.toBe(inativo);
  });

  it('sem ação de filtro, o chip é apenas informativo', () => {
    render(<EntryItem entry={entry()} {...baseProps} />);

    expect(screen.queryByRole('button', { name: 'Mercado' })).toBeNull();
    expect(screen.getByText('Mercado')).toBeTruthy();
  });
});

describe('EntryItem — fatura de cartão', () => {
  it('mostra o atalho para os gastos do ciclo só em faturas', () => {
    const onOpenCardInvoice = vi.fn();
    const fatura = entry({
      id: 'fatura',
      name: 'Fatura Nubank',
      isCardInvoice: true,
      invoicePaymentDueDate: '2026-11-20',
      cardId: 'card-1',
    });

    const { rerender } = render(
      <EntryItem entry={fatura} {...baseProps} onOpenCardInvoice={onOpenCardInvoice} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver gastos do ciclo do cartão' }));
    expect(onOpenCardInvoice).toHaveBeenCalledTimes(1);

    rerender(
      <EntryItem
        entry={entry({ id: 'conta', name: 'Conta de luz' })}
        {...baseProps}
        onOpenCardInvoice={onOpenCardInvoice}
      />
    );
    expect(screen.queryByRole('button', { name: 'Ver gastos do ciclo do cartão' })).toBeNull();
  });
});

describe('EntryItem — meta', () => {
  it('saque da meta aparece como entrada, mesmo sendo type debt', () => {
    render(
      <EntryItem
        entry={entry({
          type: 'debt',
          goalId: 'g1',
          name: 'Resgate da meta',
          dueDate: '2020-01-10',
        })}
        {...baseProps}
      />
    );

    expect(screen.getByText('Entrada')).toBeInTheDocument();
    expect(screen.queryByText('Atrasado')).toBeNull();
  });
});
