import { Plus } from 'lucide-react';
import type { CardExpense, CreditCard, Entry } from '../types';
import { CardItem } from './CardItem';
import { EmptyState } from './EmptyState';

type Props = {
  cards: CreditCard[];
  expenses: CardExpense[];
  invoiceEntries: Entry[];
  currentMonth: number;
  currentYear: number;
  onNewCard: () => void;
  onEditCard: (card: CreditCard) => void;
  onAddExpense: (card: CreditCard) => void;
  onEditExpense: (expense: CardExpense) => void;
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
  onEditExpense,
  onRegisterInvoice,
}: Props) {
  return (
    <div className="section-stack">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Cartões de crédito
        </h2>
        <button type="button" onClick={onNewCard} className="neu-btn-primary btn-action">
          <Plus size={16} />
          Novo cartão
        </button>
      </div>

      {cards.length === 0 ? (
        <EmptyState variant="cards" onAction={onNewCard} />
      ) : (
        <div className="cards-grid">
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
                onEditExpense={onEditExpense}
                onRegisterInvoice={onRegisterInvoice}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
