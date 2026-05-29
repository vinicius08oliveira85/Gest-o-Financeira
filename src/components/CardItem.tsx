import React, { useState } from 'react';
import { Plus, CreditCard as CreditCardIcon, ListChecks, Send, Pencil } from 'lucide-react';
import type { CardExpense, CreditCard, Entry } from '../types';
import { getInvoiceClosingDate, getInvoiceDueDate } from '../lib/cardInvoice';

type InvoiceSummary = {
  month: number;
  year: number;
  total: number;
  hasEntry: boolean;
};

type Props = {
  card: CreditCard;
  expenses: CardExpense[];
  invoiceEntries: Entry[];
  currentMonth: number;
  currentYear: number;
  onEditCard: (card: CreditCard) => void;
  onAddExpense: (card: CreditCard) => void;
  onRegisterInvoice: (card: CreditCard, month: number, year: number, total: number) => void;
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CardItem({
  card,
  expenses,
  invoiceEntries,
  currentMonth,
  currentYear,
  onEditCard,
  onAddExpense,
  onRegisterInvoice,
}: Props) {
  const [showExpenses, setShowExpenses] = useState(false);

  // Faturas dos últimos 3 meses + mês atual
  const invoices = React.useMemo<InvoiceSummary[]>(() => {
    const result: InvoiceSummary[] = [];
    for (let delta = 0; delta >= -2; delta--) {
      const d = new Date(currentYear, currentMonth + delta, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      const total = expenses
        .filter((e) => e.billingMonth === month && e.billingYear === year)
        .reduce((sum, e) => sum + e.amount, 0);
      const closingIso = getInvoiceClosingDate(month, year, card.closingDay);
      const paymentIso = getInvoiceDueDate(month, year, card.dueDay);
      const hasEntry = invoiceEntries.some(
        (e) =>
          e.cardId === card.id &&
          e.isCardInvoice &&
          (e.dueDate === closingIso ||
            e.invoicePaymentDueDate === paymentIso ||
            (!e.invoicePaymentDueDate && e.dueDate === paymentIso))
      );
      result.push({ month, year, total, hasEntry });
    }
    return result;
  }, [expenses, invoiceEntries, currentMonth, currentYear, card.id]);

  const currentInvoice = invoices[0];
  const currentTotal = currentInvoice?.total ?? 0;
  const usageRatio = card.limitAmount > 0 ? currentTotal / card.limitAmount : 0;
  const progressColor =
    usageRatio >= 0.9 ? 'bg-red-500' : usageRatio >= 0.7 ? 'bg-amber-500' : 'bg-emerald-500';

  const currentExpenses = expenses.filter(
    (e) => e.billingMonth === currentMonth && e.billingYear === currentYear
  );

  const dueDate = getInvoiceDueDate(currentMonth, currentYear, card.dueDay);
  const dueDateFormatted = new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });

  return (
    <div className="neu-surface rounded-2xl overflow-hidden">
      {/* Card Header */}
      <div
        className="card-pad flex items-center justify-between"
        style={{ backgroundColor: card.color ?? '#1e293b' }}
      >
        <div className="flex items-center gap-3">
          <CreditCardIcon size={22} className="text-white/80" />
          <div>
            <p className="font-semibold text-white">{card.name}</p>
            <p className="text-xs text-white/70">
              Fecha dia {card.closingDay} · Vence dia {card.dueDay}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEditCard(card)}
          className="text-white/70 hover:text-white transition-colors"
          aria-label="Editar cartão"
        >
          <Pencil size={16} />
        </button>
      </div>

      {/* Limit usage bar */}
      <div className="card-pad pt-0">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>
            Fatura{' '}
            {new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long' })}
          </span>
          <span>Vence {dueDateFormatted}</span>
        </div>
        <div className="w-full h-2 neu-progress-track">
          <div
            className={`h-2 rounded-full transition-all ${progressColor}`}
            style={{ width: `${Math.min(usageRatio * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {formatCurrency(currentTotal)}
          </span>
          <span className="text-slate-400">de {formatCurrency(card.limitAmount)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="card-pad pt-0 flex gap-[var(--inline-gap)]">
        <button
          type="button"
          onClick={() => onAddExpense(card)}
          className="neu-btn flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 rounded-xl py-2"
        >
          <Plus size={15} />
          Gasto
        </button>
        <button
          type="button"
          onClick={() => setShowExpenses((v) => !v)}
          className="neu-btn flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 rounded-xl py-2"
        >
          <ListChecks size={15} />
          {showExpenses ? 'Ocultar' : 'Gastos'}
        </button>
        {currentTotal > 0 && (
          <button
            type="button"
            onClick={() => onRegisterInvoice(card, currentMonth, currentYear, currentTotal)}
            className="neu-btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-xl py-2"
            title="Registrar fatura no fluxo de caixa"
          >
            <Send size={14} />
            Fatura
          </button>
        )}
      </div>

      {/* Expenses list */}
      {showExpenses && (
        <div className="neu-modal-divider card-pad">
          <div className="neu-list max-h-60 overflow-y-auto">
            {currentExpenses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Nenhum gasto nesta fatura</p>
            ) : (
              currentExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="neu-list-item flex items-center justify-between text-sm px-3 py-2"
                >
                  <div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">
                      {exp.name}
                      {exp.installmentsCount && exp.installmentsCount > 1 && (
                        <span className="ml-1 text-xs text-slate-400">
                          ({exp.installmentNumber}/{exp.installmentsCount})
                        </span>
                      )}
                    </p>
                    {exp.category && <p className="text-xs text-slate-400">{exp.category}</p>}
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatCurrency(exp.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Past invoices */}
      {invoices.slice(1).some((inv) => inv.total > 0) && (
        <div className="neu-modal-divider card-pad py-[var(--inline-gap)]">
          <p className="text-xs text-slate-400 mb-1.5 font-medium px-1">Faturas anteriores</p>
          <div className="neu-list">
            {invoices.slice(1).map((inv) => (
              <div
                key={`${inv.year}-${inv.month}`}
                className="neu-list-item flex justify-between text-xs text-slate-500 dark:text-slate-400 px-3 py-2"
              >
                <span>
                  {new Date(inv.year, inv.month).toLocaleDateString('pt-BR', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="font-medium">{formatCurrency(inv.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
