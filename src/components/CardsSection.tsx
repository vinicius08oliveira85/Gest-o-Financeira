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
        <div className="empty-state">
          <div className="w-10 h-10 rounded-xl neu-inset flex items-center justify-center">
            <CreditCardIcon size={20} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
            Nenhum cartão cadastrado
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
            Adicione seus cartões de crédito para acompanhar faturas e gastos.
          </p>
          <button type="button" onClick={onNewCard} className="neu-btn-primary btn-action">
            Adicionar cartão
          </button>
        </div>
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
                onRegisterInvoice={onRegisterInvoice}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
