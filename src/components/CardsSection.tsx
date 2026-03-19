import React from 'react';
import { Plus, CreditCard as CreditCardIcon } from 'lucide-react';
import type { CardExpense, CreditCard, Entry } from '../types';
import { CardItem } from './CardItem';

type Props = {
  cards: CreditCard[];
  expenses: CardExpense[];
  invoiceEntries: Entry[];
  currentMonth: number;
  currentYear: number;
  onNewCard: () => void;
  onEditCard: (card: CreditCard) => void;
  onAddExpense: (card: CreditCard) => void;
  onRegisterInvoice: (card: CreditCard, month: number, year: number, total: number) => void;
};

export function CardsSection({
  cards,
  expenses,
  invoiceEntries,
  currentMonth,
  currentYear,
  onNewCard,
  onEditCard,
  onAddExpense,
  onRegisterInvoice,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
          Cartões de crédito
        </h2>
        <button
          type="button"
          onClick={onNewCard}
          className="flex items-center gap-1.5 text-sm font-medium bg-slate-900 dark:bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
        >
          <Plus size={16} />
          Novo cartão
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <CreditCardIcon size={28} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Nenhum cartão cadastrado</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
            Adicione seus cartões de crédito para acompanhar faturas e gastos.
          </p>
          <button
            type="button"
            onClick={onNewCard}
            className="mt-2 bg-slate-900 dark:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
          >
            Adicionar cartão
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => {
            const cardExpenses = expenses.filter((e) => e.cardId === card.id);
            const cardInvoiceEntries = invoiceEntries.filter((e) => e.cardId === card.id);
            return (
              <CardItem
                key={card.id}
                card={card}
                expenses={cardExpenses}
                invoiceEntries={cardInvoiceEntries}
                currentMonth={currentMonth}
                currentYear={currentYear}
                onEditCard={onEditCard}
                onAddExpense={onAddExpense}
                onRegisterInvoice={onRegisterInvoice}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
