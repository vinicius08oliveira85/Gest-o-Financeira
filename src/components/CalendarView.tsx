import { useMemo, useState } from 'react';
import type { Entry } from '../types';
import { formatCurrency, parseDateLocal, todayLocalISO } from '../lib/format';
import { chipClass } from '../lib/neu';

type CalendarViewProps = {
  entries: Entry[];
  month: number;
  year: number;
};

type DayBucket = {
  date: Date;
  entries: Entry[];
};

type TypeFilter = 'all' | 'entradas' | 'saidas';
type StatusFilter = 'all' | 'pending' | 'paid';

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'entradas', label: 'Entradas' },
  { value: 'saidas', label: 'Saídas' },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'paid', label: 'Finalizados' },
];

/** Depósito na meta (cash+goalId) conta como saída; saque (debt+goalId) como entrada. */
function isEntrada(e: Entry): boolean {
  return e.goalId ? e.type === 'debt' : e.type === 'cash';
}
function isSaida(e: Entry): boolean {
  return e.goalId ? e.type === 'cash' : e.type === 'debt';
}

/** Atraso considera o vencimento do pagamento em faturas de cartão (não o fechamento). */
function isOverdue(e: Entry): boolean {
  if (e.type !== 'debt' || e.isPaid) return false;
  const due = e.isCardInvoice ? (e.invoicePaymentDueDate ?? e.dueDate) : e.dueDate;
  return due < todayLocalISO();
}

export function CalendarView({ entries, month, year }: CalendarViewProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Filtros locais do calendário (compõem com o FilterBar global da aba).
  const visibleEntries = useMemo(
    () =>
      entries.filter((e) => {
        if (typeFilter === 'entradas' && !isEntrada(e)) return false;
        if (typeFilter === 'saidas' && !isSaida(e)) return false;
        if (statusFilter === 'pending' && e.isPaid) return false;
        if (statusFilter === 'paid' && !e.isPaid) return false;
        return true;
      }),
    [entries, typeFilter, statusFilter]
  );

  const overdueCount = useMemo(() => visibleEntries.filter(isOverdue).length, [visibleEntries]);

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0-6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const buckets: Record<number, DayBucket> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    buckets[day] = {
      date,
      entries: [],
    };
  }

  for (const entry of visibleEntries) {
    const d = parseDateLocal(entry.dueDate);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (buckets[day]) {
        buckets[day].entries.push(entry);
      }
    }
  }

  const cells: (DayBucket | null)[] = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(buckets[day]);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const todayDay = today.getDate();

  return (
    <div className="neu-surface rounded-2xl card-pad">
      {/* Filtros locais + resumo */}
      <div className="flex flex-wrap items-center justify-between gap-[var(--inline-gap)] mb-[var(--inline-gap)]">
        <div className="flex flex-wrap items-center gap-1.5">
          <div
            className="neu-inset flex p-1 rounded-full"
            role="group"
            aria-label="Filtrar por tipo"
          >
            {TYPE_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                aria-pressed={typeFilter === value}
                className={chipClass(typeFilter === value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="neu-inset flex p-1 rounded-full"
            role="group"
            aria-label="Filtrar por status"
          >
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                aria-pressed={statusFilter === value}
                className={chipClass(statusFilter === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-2xs text-slate-400 dark:text-slate-500 font-medium">
          {visibleEntries.length} lançamento{visibleEntries.length === 1 ? '' : 's'}
          {overdueCount > 0 && (
            <span className="text-red-500 dark:text-red-400"> · {overdueCount} atrasado(s)</span>
          )}
        </p>
      </div>

      {visibleEntries.length === 0 && entries.length > 0 && (
        <p className="text-2xs text-slate-400 dark:text-slate-500 mb-[var(--inline-gap)]">
          Nenhum lançamento corresponde aos filtros.
        </p>
      )}

      <div className="grid grid-cols-7 gap-[var(--inline-gap)] mb-[var(--inline-gap)] text-3xs font-medium text-slate-500 dark:text-slate-400 text-center">
        {WEEK_DAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[var(--inline-gap)] text-xs">
        {cells.map((bucket, idx) => {
          if (!bucket) {
            return (
              <div
                key={idx}
                className="min-h-[clamp(3rem,12vw,5rem)] rounded-lg sm:rounded-xl border border-transparent"
              />
            );
          }

          const day = bucket.date.getDate();
          const isToday = isCurrentMonth && day === todayDay;
          const dayHasOverdue = bucket.entries.some(isOverdue);
          const entradas = bucket.entries.filter(isEntrada);
          const saidas = bucket.entries.filter(isSaida);
          const totalEntradas = entradas.reduce((acc, e) => acc + e.amount, 0);
          const totalSaidas = saidas.reduce((acc, e) => acc + e.amount, 0);
          const hasInstallments = bucket.entries.some(
            (e) => e.installmentsCount && e.installmentNumber
          );

          const visible = bucket.entries.slice(0, 2);
          const remaining = bucket.entries.length - visible.length;

          const dotColors = bucket.entries
            .slice(0, 3)
            .map((e) =>
              e.goalId ? 'bg-amber-600' : e.type === 'cash' ? 'bg-emerald-500' : 'bg-red-500'
            );

          return (
            <div
              key={idx}
              className={`min-h-[clamp(3rem,14vw,6rem)] rounded-lg sm:rounded-xl px-1 py-1 sm:px-1.5 flex flex-col gap-0.5 ${
                isToday
                  ? 'neu-calendar-today'
                  : hasInstallments
                    ? 'neu-calendar-installment'
                    : 'neu-calendar-day'
              }`}
            >
              {/* Número do dia — sempre visível */}
              <div className="flex items-start justify-between">
                <span
                  className={`flex items-center gap-1 text-3xs font-semibold leading-none ${
                    isToday
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {day}
                  {dayHasOverdue && (
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full bg-red-500"
                      title="Há lançamentos atrasados"
                      aria-label="Há lançamentos atrasados"
                    />
                  )}
                </span>

                {/* Valores: visíveis apenas a partir de sm */}
                <div className="hidden sm:flex flex-col items-end gap-0.5">
                  {totalEntradas > 0 && (
                    <span className="text-2xs text-emerald-600 font-semibold">
                      +{formatCurrency(totalEntradas)}
                    </span>
                  )}
                  {totalSaidas > 0 && (
                    <span className="text-2xs text-red-600 font-semibold">
                      -{formatCurrency(totalSaidas)}
                    </span>
                  )}
                </div>
              </div>

              {/* Mobile: bolinhas coloridas indicando lançamentos */}
              {bucket.entries.length > 0 && (
                <div className="flex sm:hidden items-center gap-0.5 flex-wrap mt-0.5">
                  {dotColors.map((color, i) => (
                    <span key={i} className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
                  ))}
                  {bucket.entries.length > 3 && (
                    <span className="text-4xs text-slate-400 leading-none">
                      +{bucket.entries.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Desktop: nomes dos lançamentos */}
              <div className="hidden sm:block mt-0.5 space-y-0.5">
                {visible.map((e) => (
                  <div
                    key={e.id}
                    className="truncate text-2xs text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  >
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                        e.goalId
                          ? 'bg-amber-600'
                          : e.type === 'cash'
                            ? 'bg-emerald-500'
                            : 'bg-red-500'
                      }`}
                    />
                    <span className="truncate">
                      {e.name}
                      {e.installmentsCount && e.installmentNumber && (
                        <span className="ml-1 text-5xs text-slate-500 dark:text-slate-400">
                          {e.installmentNumber}/{e.installmentsCount}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
                {remaining > 0 && (
                  <div className="text-5xs text-slate-500 dark:text-slate-400">
                    +{remaining} lançamentos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
