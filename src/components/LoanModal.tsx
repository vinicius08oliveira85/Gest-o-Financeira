import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Loan, LoanInstallment, LoanSourceType } from '../types';
import { ModalShell } from './ModalShell';
import {
  formatCurrencyForInput,
  maskCurrencyInput,
  parseCurrencyInput,
} from '../lib/currencyInput';
import { formatCurrency, todayLocalISO } from '../lib/format';
import {
  addMonthsToMonth,
  buildInstallmentsForPeriod,
  formatMonthLabel,
  monthKey,
  monthsBetweenMonths,
} from '../lib/loans';

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
  const [discountStart, setDiscountStart] = React.useState('');
  const [discountEnd, setDiscountEnd] = React.useState('');
  const [dueDay, setDueDay] = React.useState('10');
  const [installmentValue, setInstallmentValue] = React.useState('');
  // Só recalcula o valor de todas as parcelas quando o campo é mexido; senão os
  // valores já ajustados (um a um) são preservados ao salvar o empréstimo.
  const [installmentValueTouched, setInstallmentValueTouched] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  useEffect(() => {
    const today = todayLocalISO();
    setName(loan?.name ?? '');
    setAmount(loan ? formatCurrencyForInput(loan.amount) : '');
    setSourceType(loan?.sourceType ?? 'pessoa_fisica');
    setSourceName(loan?.sourceName ?? '');
    setDueDate(loan?.dueDate ?? today);
    setPaid(loan?.paid ?? false);
    const count = loan?.installmentsCount ?? 1;
    setIsInstallment(count > 1);
    // Parcela com juros: se as parcelas registradas não são o rateio do valor
    // contratado, o campo abre com o valor real cobrado (e não vazio).
    const savedInstallments = loan?.installments ?? [];
    const equalSplit = count > 1 ? (loan?.amount ?? 0) / count : 0;
    const hasInterest =
      savedInstallments.length > 0 && savedInstallments[0].amount - equalSplit > 0.005;
    setInstallmentValue(hasInterest ? formatCurrencyForInput(savedInstallments[0].amount) : '');
    setInstallmentValueTouched(false);

    // Período do desconto: o registrado ou, na falta dele, o das parcelas.
    const dates = (loan?.installments ?? []).map((i) => i.dueDate).sort();
    const fallbackDue = dates[0] ?? loan?.dueDate ?? today;
    const start = loan?.discountStart ?? monthKey(fallbackDue);
    // Sem período registrado: o parcelado sugere 12 meses (o usuário ajusta).
    // À vista fica vazio, para não gravar um desconto de 12 meses que ninguém escolheu.
    const end =
      loan?.discountEnd ??
      (dates.length > 0
        ? monthKey(dates[dates.length - 1])
        : count > 1
          ? addMonthsToMonth(start, 11)
          : '');
    setDiscountStart(start);
    setDiscountEnd(end);
    setDueDay(String(Number(fallbackDue.slice(8, 10))));
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
    if (!isInstallment && !dueDate) errs.dueDate = 'Informe a data';
    if (isInstallment) {
      if (!discountStart) errs.discountStart = 'Informe o início';
      if (!discountEnd) errs.discountEnd = 'Informe o fim';
      if (discountStart && discountEnd) {
        const months = monthsBetweenMonths(discountStart, discountEnd);
        if (months < 2) errs.discountEnd = 'O fim precisa ser depois do início';
        else if (months > 120) errs.discountEnd = 'No máximo 120 parcelas';
      }
      const day = Number(dueDay);
      if (!Number.isInteger(day) || day < 1 || day > 31) errs.dueDay = 'Dia de 1 a 31';
      if (installmentValue.trim()) {
        const perInstallment = parseCurrencyInput(installmentValue);
        if (perInstallment === null || perInstallment <= 0) {
          errs.installmentValue = 'Informe um valor válido';
        }
      }
    } else if (discountEnd) {
      // À vista o período é opcional; se o fim for preenchido, tem que fazer sentido.
      if (!discountStart) errs.discountStart = 'Informe o início';
      else if (monthsBetweenMonths(discountStart, discountEnd) < 1)
        errs.discountEnd = 'O fim precisa ser depois do início';
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
    // No parcelado o período do desconto define as parcelas (uma por mês).
    // Parcelas já pagas são preservadas por `buildInstallmentsForPeriod`.
    // O valor informado por parcela (com juros) sobrepõe o rateio do valor contratado.
    // Campo intocado: mantém o valor real de cada parcela (inclusive ajustes
    // individuais); mexeu no campo: iguala todas pelo valor informado.
    const perInstallment = installmentValueTouched
      ? (parseCurrencyInput(installmentValue) ?? undefined)
      : undefined;
    const installments: LoanInstallment[] | undefined = isInstallment
      ? buildInstallmentsForPeriod(
          total,
          discountStart,
          discountEnd,
          Number(dueDay),
          loan?.installments ?? [],
          perInstallment,
          Boolean(loan) && !installmentValueTouched
        )
      : undefined;
    const count = installments?.length ?? 1;
    // À vista o período só é gravado quando início e fim foram preenchidos.
    const hasDiscount = isInstallment || Boolean(discountStart && discountEnd);

    onSave({
      id: loan?.id,
      name: name.trim(),
      amount: total,
      sourceType,
      sourceName: sourceName.trim() || undefined,
      dueDate: installments ? installments[0].dueDate : dueDate,
      // Num parcelado, "pago" significa todas as parcelas pagas.
      paid: installments ? installments.every((i) => i.paid) : paid,
      discountStart: hasDiscount ? discountStart || undefined : undefined,
      discountEnd: hasDiscount ? discountEnd || undefined : undefined,
      installmentsCount: count > 1 ? count : undefined,
      installments,
    });
    onClose();
  }

  const previewTotal = parseCurrencyInput(amount);
  const previewMonths =
    discountStart && discountEnd ? monthsBetweenMonths(discountStart, discountEnd) : 0;
  const previewValid = previewMonths >= 2 && previewMonths <= 120;
  const keepExistingAmounts = Boolean(loan) && !installmentValueTouched;
  const manualInstallment = installmentValueTouched ? parseCurrencyInput(installmentValue) : null;
  // A prévia usa a mesma função do salvar: o que aparece é o que vai ser gravado.
  const previewInstallments =
    isInstallment && previewValid && previewTotal !== null
      ? buildInstallmentsForPeriod(
          previewTotal,
          discountStart,
          discountEnd,
          Number(dueDay) || 1,
          loan?.installments ?? [],
          manualInstallment ?? undefined,
          keepExistingAmounts
        )
      : null;
  const previewAmounts = previewInstallments?.map((i) => i.amount) ?? [];
  const previewMin = previewAmounts.length > 0 ? Math.min(...previewAmounts) : null;
  const previewMax = previewAmounts.length > 0 ? Math.max(...previewAmounts) : null;
  const previewPayable =
    previewAmounts.length > 0
      ? Math.round(previewAmounts.reduce((sum, value) => sum + value, 0) * 100) / 100
      : null;
  const previewInterest =
    previewPayable !== null && previewTotal !== null ? previewPayable - previewTotal : 0;

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
              onClick={() => {
                setIsInstallment(false);
                // O fim sugerido para 12 parcelas não pode virar período de
                // desconto de um pagamento único que o usuário nem escolheu.
                if (discountStart && discountEnd === addMonthsToMonth(discountStart, 11)) {
                  setDiscountEnd('');
                }
              }}
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

        <div>
          <span className={labelClass}>Período do desconto</span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <label
                htmlFor="loan-discount-start"
                className="block text-[0.7rem] text-slate-500 dark:text-slate-400 mb-1"
              >
                Início
              </label>
              <input
                id="loan-discount-start"
                type="month"
                value={discountStart}
                onChange={(e) => setDiscountStart(e.target.value)}
                className={inputClass + (errors.discountStart ? ' border-red-400' : '')}
              />
            </div>
            <div>
              <label
                htmlFor="loan-discount-end"
                className="block text-[0.7rem] text-slate-500 dark:text-slate-400 mb-1"
              >
                Fim
              </label>
              <input
                id="loan-discount-end"
                type="month"
                value={discountEnd}
                onChange={(e) => setDiscountEnd(e.target.value)}
                className={inputClass + (errors.discountEnd ? ' border-red-400' : '')}
              />
            </div>
          </div>
          {(errors.discountStart || errors.discountEnd) && (
            <p className={errorClass}>{errors.discountStart ?? errors.discountEnd}</p>
          )}
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isInstallment
              ? 'As parcelas caem uma por mês, do início ao fim do desconto.'
              : 'Opcional: quando o valor começa e termina de ser descontado (ex.: empréstimo do trabalhador).'}
          </p>
        </div>

        {isInstallment ? (
          <>
            <div>
              <label htmlFor="loan-installment-day" className={labelClass}>
                Dia do vencimento
              </label>
              <input
                id="loan-installment-day"
                type="number"
                min={1}
                max={31}
                inputMode="numeric"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className={inputClass + (errors.dueDay ? ' border-red-400' : '')}
              />
              {errors.dueDay && <p className={errorClass}>{errors.dueDay}</p>}
            </div>
            <div>
              <label htmlFor="loan-installment-value" className={labelClass}>
                Valor da parcela
              </label>
              <input
                id="loan-installment-value"
                type="text"
                inputMode="decimal"
                value={installmentValue}
                onChange={(e) => {
                  setInstallmentValue(maskCurrencyInput(e.target.value));
                  setInstallmentValueTouched(true);
                }}
                placeholder="Automático (valor dividido pelas parcelas)"
                className={inputClass + (errors.installmentValue ? ' border-red-400' : '')}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {keepExistingAmounts && loan?.installments?.length
                  ? 'Deixe em branco para manter o valor de cada parcela; preencha para igualar todas.'
                  : 'Opcional: o valor real cobrado por parcela. É por aqui que entram os juros do parcelamento — o total pago e os juros aparecem abaixo.'}
              </p>
              {errors.installmentValue && <p className={errorClass}>{errors.installmentValue}</p>}
              {previewMin !== null && previewMax !== null && previewPayable !== null && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {previewMin === previewMax
                    ? `${previewMonths}x de ${formatCurrency(previewMin)}`
                    : `Parcelas de ${formatCurrency(previewMin)} a ${formatCurrency(previewMax)}`}
                  {` = ${formatCurrency(previewPayable)}`}
                  {previewInterest > 0.005 ? ` · juros de ${formatCurrency(previewInterest)}` : ''}
                </p>
              )}
              {previewValid && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Desconto de {formatMonthLabel(discountStart)} até {formatMonthLabel(discountEnd)}
                </p>
              )}
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="loan-due" className={labelClass}>
              Data prevista de pagamento
            </label>
            <input
              id="loan-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass + (errors.dueDate ? ' border-red-400' : '')}
            />
            {errors.dueDate && <p className={errorClass}>{errors.dueDate}</p>}
          </div>
        )}

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
