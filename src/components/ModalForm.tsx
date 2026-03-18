import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { EntryType } from '../types';
import type { FormErrors } from '../hooks/useEntryForm';
import { DateInput } from './DateInput';

const MODAL_FORM_TITLE_ID = 'modal-form-title';

type ModalFormProps = {
  isOpen: boolean;
  isEditing: boolean;
  name: string;
  setName: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  type: EntryType;
  setType: (v: EntryType) => void;
  category: string;
  setCategory: (v: string) => void;
  tag: string;
  setTag: (v: string) => void;
  isInstallment: boolean;
  setIsInstallment: (v: boolean) => void;
  installmentsCount: string;
  setInstallmentsCount: (v: string) => void;
  isRecurring: boolean;
  setIsRecurring: (v: boolean) => void;
  recurrenceCount: string;
  setRecurrenceCount: (v: string) => void;
  formErrors?: FormErrors;
  onClearError?: (field: 'name' | 'amount' | 'dueDate') => void;
  availableCategories?: string[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
};

export function ModalForm({
  isOpen,
  isEditing,
  name,
  setName,
  amount,
  setAmount,
  dueDate,
  setDueDate,
  type,
  setType,
  category,
  setCategory,
  tag,
  setTag,
  isInstallment,
  setIsInstallment,
  installmentsCount,
  setInstallmentsCount,
  isRecurring,
  setIsRecurring,
  recurrenceCount,
  setRecurrenceCount,
  formErrors = {},
  onClearError,
  availableCategories = [],
  onSubmit,
  onClose,
}: ModalFormProps) {
  const hasError = (field: 'name' | 'amount' | 'dueDate') => formErrors[field];
  const inputErrorClass =
    'border-red-500 dark:border-red-500 focus:ring-red-500/20 dark:focus:ring-red-500/20 focus:border-red-500';
  const inputBaseClass =
    'w-full bg-slate-50 dark:bg-slate-700 border rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all border-slate-200 dark:border-slate-600 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500';
  const contentRef = useRef<HTMLDivElement>(null);
  useFocusTrap(contentRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={MODAL_FORM_TITLE_ID}
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-600"
            tabIndex={-1}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between flex-shrink-0">
              <h2
                id={MODAL_FORM_TITLE_ID}
                className="text-xl font-semibold text-slate-900 dark:text-slate-100"
              >
                {isEditing ? 'Editar Registro' : 'Novo Registro'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Fechar"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setType('cash')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    type === 'cash'
                      ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setType('debt')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    type === 'debt'
                      ? 'bg-white dark:bg-slate-600 text-red-600 dark:text-red-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Saída
                </button>
              </div>

              <div>
                <label
                  htmlFor="modal-form-name"
                  className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  Nome do Registro
                </label>
                <input
                  id="modal-form-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    onClearError?.('name');
                  }}
                  placeholder={type === 'debt' ? 'Ex: Aluguel, Cartão...' : 'Ex: Salário, Venda...'}
                  className={`${inputBaseClass} ${hasError('name') ? inputErrorClass : ''}`}
                  aria-invalid={hasError('name')}
                />
                {hasError('name') && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">Preencha o nome.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="modal-form-amount"
                    className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
                  >
                    Valor (R$)
                  </label>
                  <input
                    id="modal-form-amount"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      onClearError?.('amount');
                    }}
                    placeholder="0,00"
                    className={`${inputBaseClass} ${hasError('amount') ? inputErrorClass : ''}`}
                    aria-invalid={hasError('amount')}
                  />
                  {hasError('amount') && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Informe um valor válido.
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="modal-form-due-date"
                    className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
                  >
                    Data
                  </label>
                  <DateInput
                    id="modal-form-due-date"
                    value={dueDate}
                    onChange={(v) => {
                      setDueDate(v);
                      onClearError?.('dueDate');
                    }}
                    className={`${inputBaseClass} ${hasError('dueDate') ? inputErrorClass : ''}`}
                    aria-invalid={hasError('dueDate')}
                  />
                  {hasError('dueDate') && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">Selecione a data.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="modal-form-category"
                    className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
                  >
                    Categoria
                  </label>
                  <input
                    id="modal-form-category"
                    type="text"
                    list="modal-form-category-list"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Aluguel, Salário..."
                    className={inputBaseClass}
                  />
                  {availableCategories.length > 0 && (
                    <datalist id="modal-form-category-list">
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="modal-form-tag"
                    className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
                  >
                    Tag (opcional)
                  </label>
                  <input
                    id="modal-form-tag"
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="Ex: Cartão Nubank, Cliente X..."
                    className={inputBaseClass}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <label
                  className={`flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 ${
                    isEditing ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                  }`}
                  title={isEditing ? 'Não é possível alterar parcelamento ao editar' : undefined}
                >
                  <input
                    type="checkbox"
                    checked={isInstallment}
                    onChange={(e) => !isEditing && setIsInstallment(e.target.checked)}
                    disabled={isEditing}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500/30"
                  />
                  <span>Lançamento parcelado</span>
                </label>
                {isInstallment && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label htmlFor="modal-form-installments" className="text-xs text-slate-500">
                      Nº de parcelas
                    </label>
                    <input
                      id="modal-form-installments"
                      type="number"
                      min={2}
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500/30"
                  />
                  <span>Repetir nos próximos meses</span>
                </label>
                {isRecurring && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label htmlFor="modal-form-recurrence-count" className="text-xs text-slate-500">
                      Quantidade de repetições (opcional)
                    </label>
                    <input
                      id="modal-form-recurrence-count"
                      type="number"
                      min={1}
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(e.target.value)}
                      placeholder="Ex: 12"
                      className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className={`w-full text-white py-4 rounded-2xl font-semibold transition-all shadow-lg active:scale-[0.98] ${
                    type === 'debt'
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-100'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                  }`}
                >
                  Salvar {type === 'debt' ? 'Saída' : 'Entrada'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
