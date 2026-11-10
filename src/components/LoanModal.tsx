import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Loan, LoanSourceType } from '../types';
import { ModalShell } from './ModalShell';
import {
  formatCurrencyForInput,
  maskCurrencyInput,
  parseCurrencyInput,
} from '../lib/currencyInput';
import { formatCurrency, todayLocalISO } from '../lib/format';
import { buildInstallments } from '../lib/loans';

const MODAL_TITLE_ID = 'loan-modal-title';

const SOURCE_OPTIONS: { value: LoanSourceType; label: string }[] = [
  { value: 'pessoa_fisica', label: 'Pessoa física' },
  { value: 'trabalhador', label: 'Empréstimo do trabalhador' },
];

type Props = {
  open: boolean;
  loan: Loan | null;
  onSave: (loan: Omit<Loan, 'id' | 'createdAt'> & { id?: string }) => void;
  onRequestDelete?: (loan: Loan) => void;
  onClose: () => void;
};

export function LoanModal({ open, loan, onSave, onRequestDelete, onClose }: Props) {
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [sourceType, setSourceType] = React.useState<LoanSourceType>('pessoa_fisica');
  const [sourceName, setSourceName] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [paid, setPaid] = React.useState(false);
  const [isInstallment, setIsInstallment] = React.useState(false);
  const [installmentsCount, setInstallmentsCount] = React.useState('12');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  useEffect(() => {
    setName(loan?.name ?? '');
    setAmount(loan ? formatCurrencyForInput(loan.amount) : '');
    setSourceType(loan?.sourceType ?? 'pessoa_fisica');
    setSourceName(loan?.sourceName ?? '');
    setDueDate(loan?.dueDate ?? todayLocalISO());
    setPaid(loan?.paid ?? false);
    const count = loan?.installmentsCount ?? 1;
    setIsInstallment(count > 1);
    setInstallmentsCount(String(count > 1 ? count : 12));
    setErrors({});
  }, [loan, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nome obrigatório';
    const value = parseCurrencyInput(amount);
    if (value === null || value <= 0) errs.amount = 'Informe um valor válido';
    if (!dueDate) errs.dueDate = 'Informe a data';
    if (isInstallment) {
      const count = Number(installmentsCount);
      if (!Number.isInteger(count) || count < 2 || count > 120) {
        errs.installmentsCount = 'Informe de 2 a 120 parcelas';
      }
    }
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const total = parseCurrencyInput(amount) ?? 0;
    const count = isInstallment ? Number(installmentsCount) : 1;
    // Parcelas já pagas são preservadas por `buildInstallments`.
    const installments =
      count > 1 ? buildInstallments(total, count, dueDate, loan?.installments ?? []) : undefined;

    onSave({
      id: loan?.id,
      name: name.trim(),
      amount: total,
      sourceType,
      sourceName: sourceName.trim() || undefined,
      dueDate,
      // Num parcelado, "pago" significa todas as parcelas pagas.
      paid: installments ? installments.every((i) => i.paid) : paid,
      installmentsCount: count > 1 ? count : undefined,
      installments,
    });
    onClose();
  }

  const previewTotal = parseCurrencyInput(amount);
  const previewCount = Number(installmentsCount);

  const inputClass =
    'w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 transition-all';
  const labelClass =
    'block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5';
  const errorClass = 'mt-1 text-xs text-red-500 dark:text-red-400';

  return (
    <ModalShell open={open} onClose={onClose} aria-labelledby={MODAL_TITLE_ID}>
      <div className="neu-modal-header">
        <h2
          id={MODAL_TITLE_ID}
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          {loan ? 'Editar empréstimo' : 'Novo empréstimo'}
        </h2>
        <button type="button" onClick={onClose} className="neu-modal-close" aria-label="Fechar">
          <X size={22} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="neu-modal-body">
        <div>
          <label htmlFor="loan-name" className={labelClass}>
            Descrição
          </label>
          <input
            id="loan-name"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Empréstimo para carro"
            className={inputClass + (errors.name ? ' border-red-400' : '')}
          />
          {errors.name && <p className={errorClass}>{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="loan-amount" className={labelClass}>
            Valor (R$)
          </label>
          <input
            id="loan-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(maskCurrencyInput(e.target.value))}
            placeholder="1.000,00"
            className={inputClass + (errors.amount ? ' border-red-400' : '')}
          />
          {errors.amount && <p className={errorClass}>{errors.amount}</p>}
        </div>

        <div>
          <span className={labelClass}>Origem do pagamento</span>
          <div className="flex gap-2 mt-1">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSourceType(opt.value)}
                aria-pressed={sourceType === opt.value}
                className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                  sourceType === opt.value ? 'neu-tab-active' : 'neu-btn-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="loan-source-name" className={labelClass}>
            Quem empresta (opcional)
          </label>
          <input
            id="loan-source-name"
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="Ex: João, Banco, Empresa X"
            className={inputClass}
          />
        </div>

        <div>
          <span className={labelClass}>Forma de pagamento</span>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setIsInstallment(false)}
              aria-pressed={!isInstallment}
              className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                !isInstallment ? 'neu-tab-active' : 'neu-btn-secondary'
              }`}
            >
              À vista
            </button>
            <button
              type="button"
              onClick={() => setIsInstallment(true)}
              aria-pressed={isInstallment}
              className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                isInstallment ? 'neu-tab-active' : 'neu-btn-secondary'
              }`}
            >
              Parcelado
            </button>
          </div>
        </div>

        {isInstallment && (
          <div>
            <label htmlFor="loan-installments" className={labelClass}>
              Número de parcelas
            </label>
            <input
              id="loan-installments"
              type="number"
              min={2}
              max={120}
              inputMode="numeric"
              value={installmentsCount}
              onChange={(e) => setInstallmentsCount(e.target.value)}
              className={inputClass + (errors.installmentsCount ? ' border-red-400' : '')}
            />
            {errors.installmentsCount && <p className={errorClass}>{errors.installmentsCount}</p>}
            {previewTotal !== null && previewCount >= 2 && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {previewCount}x de aproximadamente {formatCurrency(previewTotal / previewCount)}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="loan-due" className={labelClass}>
            {isInstallment ? 'Vencimento da 1ª parcela' : 'Data prevista de pagamento'}
          </label>
          <input
            id="loan-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass + (errors.dueDate ? ' border-red-400' : '')}
          />
          {errors.dueDate && <p className={errorClass}>{errors.dueDate}</p>}
          {isInstallment && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              As demais parcelas vencem mês a mês a partir desta data.
            </p>
          )}
        </div>

        {!isInstallment && (
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
              className="h-4 w-4"
            />
            Já foi pago
          </label>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="submit"
            className="w-full neu-btn-primary py-3 rounded-2xl font-semibold text-sm active:scale-[0.98]"
          >
            Salvar empréstimo
          </button>
          {loan && onRequestDelete && (
            <button
              type="button"
              onClick={() => {
                onRequestDelete(loan);
                onClose();
              }}
              className="w-full neu-btn-danger-soft py-2.5 rounded-2xl font-medium text-sm"
            >
              Excluir empréstimo
            </button>
          )}
        </div>
      </form>
    </ModalShell>
  );
}
