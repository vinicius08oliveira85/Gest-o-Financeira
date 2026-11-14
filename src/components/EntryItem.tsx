import React from 'react';
import { CheckCircle2, Circle, Calendar, CreditCard, Folder, Pencil, Trash2, Tag } from './icons';
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
  /** Nome do cartão, quando o lançamento é fatura de cartão. */
  cardName?: string;
  onTogglePaid: (id: string) => void;
  onEdit: (entry: Entry) => void;
  onDeleteRequest: (id: string) => void;
  compact?: boolean;
  /** Categoria filtrada na tela; o chip correspondente fica ativo (ícone Filled). */
  selectedCategory?: string;
  /** Torna o chip de categoria um filtro: clique aplica/limpa a categoria. */
  onSelectCategory?: (category: string) => void;
};

function EntryItemInner({
  entry,
  cardName,
  onTogglePaid,
  onEdit,
  onDeleteRequest,
  compact = false,
  selectedCategory,
  onSelectCategory,
}: EntryItemProps) {
  const paymentDue = debtPaymentDueDate(entry);
  const isOverdue = entry.type === 'debt' && !entry.isPaid && isOverdueByDate(paymentDue);

  return (
    <motion.div
      layout
      // Sem animação de entrada: com `AnimatePresence mode="popLayout"` os
      // itens novos podiam ficar presos no estado inicial (opacity 0) e só
      // apareciam muitos segundos depois, deixando um espaço vazio na lista.
      initial={false}
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
        className={`mr-3 transition-all duration-150 self-start mt-1 sm:self-center sm:mt-0 tap-scale ${
          entry.isPaid
            ? 'text-emerald-500'
            : 'text-slate-300 dark:text-slate-400 hover:text-slate-400 dark:hover:text-slate-400'
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
                ? 'text-slate-600 dark:text-slate-400 line-through'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {entry.name}
          </h3>
          {entry.type === 'cash' && <span className="neu-chip-cash">Entrada</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
          <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 flex-wrap">
            <Calendar size={12} />
            {entry.isCardInvoice ? (
              entry.invoicePaymentDueDate && entry.dueDate !== entry.invoicePaymentDueDate ? (
                <>
                  Vence em {formatDate(entry.invoicePaymentDueDate)}
                  <span className="text-slate-600 dark:text-slate-400">
                    · Fecha em {formatDate(entry.dueDate)}
                  </span>
                </>
              ) : (
                <>Vence em {formatDate(entry.invoicePaymentDueDate ?? entry.dueDate)}</>
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
          {entry.isCardInvoice && cardName && (
            <span className="neu-chip-dark inline-flex items-center gap-1 whitespace-nowrap">
              <CreditCard size={12} />
              {cardName}
            </span>
          )}
          <span
            className={
              entry.isPaid ? 'neu-chip-success' : isOverdue ? 'neu-chip-danger' : 'neu-chip-pending'
            }
          >
            {entry.isPaid ? 'Finalizado' : isOverdue ? 'Atrasado' : 'Pendente'}
          </span>
          {entry.category &&
            (onSelectCategory ? (
              <button
                type="button"
                onClick={() =>
                  onSelectCategory(selectedCategory === entry.category ? 'all' : entry.category!)
                }
                aria-pressed={selectedCategory === entry.category}
                title={
                  selectedCategory === entry.category
                    ? 'Remover filtro de categoria'
                    : `Filtrar por ${entry.category}`
                }
                className={`neu-chip inline-flex items-center gap-1 transition-colors ${
                  selectedCategory === entry.category ? 'neu-chip-active' : ''
                }`}
              >
                <Folder size={11} filled={selectedCategory === entry.category} />
                {entry.category}
              </button>
            ) : (
              <span className="neu-chip inline-flex items-center gap-1">
                <Folder size={11} />
                {entry.category}
              </span>
            ))}
          {entry.installmentsCount && entry.installmentNumber && (
            <span className="neu-chip-dark">
              {entry.installmentNumber}/{entry.installmentsCount}
            </span>
          )}
          {entry.tag && entry.tag !== (entry.isCardInvoice ? cardName : undefined) && (
            <span
              className="text-xs text-slate-600 dark:text-slate-400 truncate inline-flex items-center gap-1 max-w-[120px] sm:max-w-[140px] lg:max-w-[180px]"
              title={entry.tag}
            >
              <Tag size={12} className="shrink-0 text-slate-600 dark:text-slate-400" />
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
                  ? 'text-slate-600 dark:text-slate-400'
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
            className="p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-2 rounded-lg neu-btn tap-scale text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400"
            aria-label="Editar"
          >
            <Pencil size={18} className="sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(entry.id)}
            className="p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-2 rounded-lg neu-btn tap-scale text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400"
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
