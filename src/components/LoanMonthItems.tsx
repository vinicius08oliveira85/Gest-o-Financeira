import { ListOrdered } from './icons';
import type { Loan } from '../types';
import { formatCurrency, formatDate, todayLocalISO } from '../lib/format';
import { getLoanItemsForMonth, getLoanMonthTotal } from '../lib/loans';

const STATUS_LABELS = {
  pending: 'Pendente',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
} as const;

const STATUS_CLASSES = {
  pending: 'neu-chip-pending',
  overdue: 'neu-chip-danger',
  cancelled: 'neu-chip',
} as const;

type Props = {
  loans: Loan[];
  month: number;
  year: number;
  onOpenInstallments: (loan: Loan) => void;
};

/**
 * Compromissos de empréstimo do mês visível na aba Lançamentos. As parcelas
 * pagas não entram aqui: elas já aparecem como lançamentos finalizados.
 */
export function LoanMonthItems({ loans, month, year, onOpenInstallments }: Props) {
  const items = getLoanItemsForMonth(loans, month, year, todayLocalISO());
  if (items.length === 0) return null;
  const monthTotal = getLoanMonthTotal(items);

  return (
    <div className="section-stack">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          Empréstimos do mês
        </h3>
        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
          -{formatCurrency(monthTotal)}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="neu-list-item flex items-center justify-between gap-3 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {item.label}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Vence em {formatDate(item.dueDate)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-sm font-semibold ${
                  item.status === 'cancelled'
                    ? 'text-slate-500 dark:text-slate-400 line-through'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                -{formatCurrency(item.amount)}
              </span>
              <span className={STATUS_CLASSES[item.status]}>{STATUS_LABELS[item.status]}</span>
              <button
                type="button"
                onClick={() => onOpenInstallments(item.loan)}
                className="neu-btn-secondary p-2 rounded-xl"
                aria-label={`Ver parcelas de ${item.loan.name}`}
              >
                <ListOrdered size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
