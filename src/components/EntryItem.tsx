import React from 'react';
import { CheckCircle2, Circle, Calendar, Pencil, Trash2, Loader2, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import type { Entry } from '../types';
import { formatCurrency, formatDate } from '../lib/format';

function isOverdueByDate(dueDateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dueDateStr < today;
}

/** Para fatura de cartão, atraso considera o vencimento do pagamento, não o fechamento. */
function debtPaymentDueDate(entry: Entry): string {
  if (entry.type !== 'debt') return entry.dueDate;
  if (entry.isCardInvoice) return entry.invoicePaymentDueDate ?? entry.dueDate;
  return entry.dueDate;
}

type EntryItemProps = {
  entry: Entry;
  onTogglePaid: (id: string) => void;
  onEdit: (entry: Entry) => void;
  onDeleteRequest: (id: string) => void;
  pendingPaidId?: string | null;
  compact?: boolean;
};

function EntryItemInner({
  entry,
  onTogglePaid,
  onEdit,
  onDeleteRequest,
  pendingPaidId = null,
  compact = false,
}: EntryItemProps) {
  const paymentDue = debtPaymentDueDate(entry);
  const isOverdue = entry.type === 'debt' && !entry.isPaid && isOverdueByDate(paymentDue);
  const isTogglingPaid = pendingPaidId === entry.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`group flex flex-wrap sm:flex-nowrap items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
        compact ? 'px-3 py-2.5 text-sm' : 'p-3 sm:p-4'
      }`}
    >
      <button
        type="button"
        onClick={() => !isTogglingPaid && onTogglePaid(entry.id)}
        disabled={isTogglingPaid}
        title={entry.isPaid ? 'Desfazer finalização' : 'Finalizar (abate no saldo)'}
        className={`mr-3 transition-colors self-start mt-1 sm:self-center sm:mt-0 ${
          isTogglingPaid
            ? 'text-slate-400 dark:text-slate-500 cursor-wait'
            : entry.isPaid
              ? 'text-emerald-500'
              : 'text-slate-300 dark:text-slate-500 hover:text-slate-400 dark:hover:text-slate-400'
        }`}
      >
        {isTogglingPaid ? (
          <Loader2 size={compact ? 18 : 22} className="animate-spin" />
        ) : entry.isPaid ? (
          <CheckCircle2 size={compact ? 18 : 22} />
        ) : (
          <Circle size={compact ? 18 : 22} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3
            className={`font-medium truncate ${
              entry.isPaid
                ? 'text-slate-400 dark:text-slate-500 line-through'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {entry.name}
          </h3>
          {entry.type === 'cash' && (
            <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
              Entrada
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
          <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 flex-wrap">
            <Calendar size={12} />
            {entry.isCardInvoice ? (
              entry.invoicePaymentDueDate ? (
                <>
                  Fecha em {formatDate(entry.dueDate)}
                  <span className="text-slate-500 dark:text-slate-400">
                    · Vence em {formatDate(entry.invoicePaymentDueDate)}
                  </span>
                </>
              ) : (
                <>Vence em {formatDate(entry.dueDate)}</>
              )
            ) : (
              <>
                {entry.type === 'debt' ? 'Vence em' : 'Data:'} {formatDate(entry.dueDate)}
              </>
            )}
          </span>
          {entry.isPaid && entry.paidDate && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} />
              Pago em {formatDate(entry.paidDate)}
            </span>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              entry.isPaid
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : isOverdue
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
            }`}
          >
            {entry.isPaid ? 'Finalizado' : isOverdue ? 'Atrasado' : 'Pendente'}
          </span>
          {entry.category && (
            <span className="bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
              {entry.category}
            </span>
          )}
          {entry.installmentsCount && entry.installmentNumber && (
            <span className="bg-slate-900 dark:bg-slate-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {entry.installmentNumber}/{entry.installmentsCount}
            </span>
          )}
          {entry.tag && (
            <span
              className="text-xs text-slate-400 dark:text-slate-500 truncate inline-flex items-center gap-1 max-w-[120px] sm:max-w-[140px] lg:max-w-[180px]"
              title={entry.tag}
            >
              <Tag size={12} className="shrink-0 text-slate-400 dark:text-slate-500" />
              {entry.tag}
            </span>
          )}
        </div>
      </div>

      <div className="w-full sm:w-auto flex justify-between items-center mt-2 sm:mt-0">
        <div className="text-right sm:mr-3 pl-8 sm:pl-0">
          <div
            className={`font-semibold ${
              entry.goalId
                ? 'text-amber-800 dark:text-amber-400'
                : entry.isPaid
                  ? 'text-slate-400 dark:text-slate-500'
                  : entry.type === 'cash'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
            }`}
          >
            {entry.type === 'cash' ? '+' : '-'}
            {formatCurrency(entry.amount)}
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-600/50"
            aria-label="Editar"
          >
            <Pencil size={18} className="sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(entry.id)}
            className="p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-600/50"
            aria-label="Excluir"
          >
            <Trash2 size={18} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export const EntryItem = React.memo(EntryItemInner);
