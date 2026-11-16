import React from 'react';
import { CheckCircle2, Circle, Calendar, CreditCard, Folder, Pencil, Trash2, Tag } from './icons';
import { motion } from 'motion/react';
import type { Entry } from '../types';
import { formatCurrency, formatDate, todayLocalISO } from '../lib/format';
import { isEntryInflow, isEntryOutflow } from '../lib/entryClassification';

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
  /** Para faturas: abre o cartão e o ciclo na aba de cartões. */
  onOpenCardInvoice?: (cardId?: string) => void;
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
  onOpenCardInvoice,
}: EntryItemProps) {
  const paymentDue = debtPaymentDueDate(entry);
  // Saque de meta é `debt` mas ENTRA no caixa: atraso só faz sentido em saída.
  const isOverdue = isEntryOutflow(entry) && !entry.isPaid && isOverdueByDate(paymentDue);

  // Valor na mesma linha do título, à direita: antes ele caía numa linha própria
  // e a linha ficava com ~125px de altura e um vazio grande até os ícones.
  const amountTone = entry.goalId
    ? 'text-amber-800 dark:text-amber-400'
    : entry.isPaid
      ? 'text-slate-600 dark:text-slate-400'
      : isEntryInflow(entry)
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <motion.div
      layout
      // Sem animação de entrada: com `AnimatePresence mode="popLayout"` os
      // itens novos podiam ficar presos no estado inicial (opacity 0) e só
      // apareciam muitos segundos depois, deixando um espaço vazio na lista.
      initial={false}
      exit={{ opacity: 0, x: 20 }}
      className={`group neu-list-item relative flex flex-col ${
        compact ? 'px-3 py-2 sm:px-4 sm:py-2.5 text-sm' : 'px-3 py-2.5 sm:p-4'
      }`}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => onTogglePaid(entry.id)}
          title={entry.isPaid ? 'Desfazer finalização' : 'Finalizar (abate no saldo)'}
          aria-label={entry.isPaid ? 'Desfazer finalização' : 'Finalizar (marcar como pago)'}
          className={`mt-0.5 shrink-0 transition-all duration-150 tap-scale ${
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

        {/* `sm:pr-28` reserva a coluna de ações, que fica sobreposta à direita. */}
        <div className="flex-1 min-w-0 sm:pr-28">
          <div className="flex items-baseline gap-2">
            <h3
              className={`min-w-0 truncate font-medium ${
                entry.isPaid
                  ? 'text-slate-600 dark:text-slate-400 line-through'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {entry.name}
            </h3>
            {isEntryInflow(entry) && <span className="neu-chip-cash shrink-0">Entrada</span>}
            <span className={`ml-auto shrink-0 pl-2 font-semibold tabular-nums ${amountTone}`}>
              {isEntryInflow(entry) ? '+' : '-'}
              {formatCurrency(entry.amount)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1 flex-wrap">
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
            {/* Cartão como texto simples: antes era mais um badge escuro, somando
                quatro estilos diferentes de chip na mesma linha. */}
            {entry.isCardInvoice && cardName && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <CreditCard size={12} />
                {cardName}
              </span>
            )}
            <span
              className={
                entry.isPaid
                  ? 'neu-chip-success'
                  : isOverdue
                    ? 'neu-chip-danger'
                    : 'neu-chip-pending'
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
                className="text-xs truncate inline-flex items-center gap-1 max-w-[120px] sm:max-w-[140px] lg:max-w-[180px]"
                title={entry.tag}
              >
                <Tag size={12} className="shrink-0" />
                {entry.tag}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ações: alinhadas à direita e com largura fixa a partir de `sm`, para
          editar/excluir não "andarem" de linha quando há o botão do cartão. */}
      <div className="mt-1 flex items-center justify-end gap-0.5 transition-all sm:absolute sm:right-3 sm:top-1/2 sm:mt-0 sm:w-[6.5rem] sm:-translate-y-1/2 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:focus-within:opacity-100">
        {entry.isCardInvoice && onOpenCardInvoice && (
          <button
            type="button"
            onClick={() => onOpenCardInvoice(entry.cardId)}
            className="p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-2 rounded-lg neu-btn tap-scale text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400"
            aria-label="Ver gastos do ciclo do cartão"
            title="Ver gastos do ciclo do cartão"
          >
            <CreditCard size={18} className="sm:w-4 sm:h-4" />
          </button>
        )}
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
    </motion.div>
  );
}

export const EntryItem = React.memo(EntryItemInner);
