import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardsSection } from './CardsSection';
import { buildInvoiceEntry } from '../lib/cardInvoice';
import type { CardExpense, CreditCard, Entry } from '../types';

const card: CreditCard = {
  id: 'c1',
  name: 'Nubank',
  limitAmount: 3000,
  closingDay: 25,
  dueDay: 5,
};

const expense: CardExpense = {
  id: 'x1',
  cardId: card.id,
  name: 'Mercado',
  amount: 600,
  date: '2026-11-10',
  billingMonth: 10,
  billingYear: 2026,
  createdAt: 1,
};

function renderSection(overrides: { expenses?: CardExpense[]; invoiceEntries?: Entry[] } = {}): {
  onRegisterInvoice: ReturnType<typeof vi.fn>;
} {
  const onRegisterInvoice = vi.fn();
  render(
    <CardsSection
      cards={[card]}
      expenses={overrides.expenses ?? [expense]}
      invoiceEntries={overrides.invoiceEntries ?? []}
      currentMonth={10}
      currentYear={2026}
      onNewCard={vi.fn()}
      onEditCard={vi.fn()}
      onAddExpense={vi.fn()}
      onEditExpense={vi.fn()}
      onRegisterInvoice={onRegisterInvoice}
    />
  );
  return { onRegisterInvoice };
}

describe('CardsSection · registrar fatura', () => {
  it('envia cartão, ciclo e total da fatura do mês', () => {
    const { onRegisterInvoice } = renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Fatura' }));

    expect(onRegisterInvoice).toHaveBeenCalledWith(card, 10, 2026, 600);
  });

  it('vira "Atualizar" quando a fatura do ciclo já foi registrada', () => {
    const invoice = buildInvoiceEntry(card, 10, 2026, 600);
    const { onRegisterInvoice } = renderSection({ invoiceEntries: [invoice] });

    const button = screen.getByRole('button', { name: 'Atualizar' });
    expect(button.getAttribute('title')).toContain('já registrada');

    fireEvent.click(button);
    expect(onRegisterInvoice).toHaveBeenCalledWith(card, 10, 2026, 600);
  });

  it('vira "Paga" quando a fatura do ciclo já foi paga', () => {
    const invoice: Entry = {
      ...buildInvoiceEntry(card, 10, 2026, 600),
      isPaid: true,
      paidDate: '2026-12-01',
    };
    renderSection({ invoiceEntries: [invoice] });

    expect(screen.getByRole('button', { name: 'Paga' })).toBeInTheDocument();
  });

  it('não oferece registrar fatura sem gastos no ciclo', () => {
    renderSection({ expenses: [] });

    expect(screen.queryByRole('button', { name: 'Fatura' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Atualizar' })).toBeNull();
  });
});
