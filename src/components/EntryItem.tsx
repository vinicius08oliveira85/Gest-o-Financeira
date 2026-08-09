import React from 'react';
import { CheckCircle2, Circle, Calendar, Pencil, Trash2, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import type { Entry } from '../types';
import { formatCurrency, formatDate, todayLocalISO } from '../lib/format';

function isOverdueByDate(dueDateStr: string): boolean {
  // Data local do dispositivo (não UTC): com toISOString, entre 00h e 03h no
  // Brasil o "hoje" virava ontem e lançamentos do dia apareciam como Atrasado.
  return dueDateStr < todayLocalISO();
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
  compact?: boolean;
};

function EntryItemInner({
  entry,
  onTogglePaid,
  onEdit,
  onDeleteRequest,
  compact = false,
}: EntryItemProps) {
  const paymentDue = debtPaymentDueDate(entry);
  const isOverdue = entry.type === 'debt' && !entry.isPaid && isOverdueByDate(paymentDue);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`group neu-list-item flex flex-wrap sm:flex-nowrap items-center ${
        compact ? 'px-3 py-2 sm:px-4 sm:py-2.5 text-sm' : 'p-3 sm:p-4'
      }`}
    >
      <button
        type="button"
        onClick={() => onTogglePaid(entry.id)}
        title={entry.isPaid ? 'Desfazer finalização' : 'Finalizar (abate no saldo)'}
        aria-label={entry.isPaid ? 'Desfazer finalização' : 'Finalizar (marcar como pago)'}
        className={`mr-3 transition-colors self-start mt-1 sm:self-center sm:mt-0 ${
          entry.isPaid
            ? 'text-emerald-500'
            : 'text-slate-300 dark:text-slate-500 hover:text-slate-400 dark:hover:text-slate-400'
        }`}
      >
        {entry.isPaid ? (
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
          {entry.type === 'cash' && <span className="neu-chip-cash">Entrada</span>}
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
            className={
              entry.isPaid ? 'neu-chip-success' : isOverdue ? 'neu-chip-danger' : 'neu-chip-pending'
            }
          >
            {entry.isPaid ? 'Finalizado' : isOverdue ? 'Atrasado' : 'Pendente'}
          </span>
          {entry.category && <span className="neu-chip">{entry.category}</span>}
          {entry.installmentsCount && entry.installmentNumber && (
            <span className="neu-chip-dark">
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
            className="p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-2 rounded-lg neu-btn text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400"
            aria-label="Editar"
          >
            <Pencil size={18} className="sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(entry.id)}
            className="p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-2 rounded-lg neu-btn text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400"
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
