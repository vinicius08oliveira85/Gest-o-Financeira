import { lazy, Suspense } from 'react';
import type { Entry, FilterType, Goal } from '../types';
import type { Alert } from '../hooks/useAlerts';
import { usePeriod } from '../contexts/PeriodContext';
import { DashboardCards } from './DashboardCards';
import { GoalsCard } from './GoalsCard';
import { FilterBar } from './FilterBar';
import { EntryList } from './EntryList';
import { AlertsPanel } from './AlertsPanel';
import { GuidedTooltip } from './GuidedTooltip';

const CalendarView = lazy(() =>
  import('./CalendarView').then((m) => ({ default: m.CalendarView }))
);
const ReportsPanel = lazy(() =>
  import('./ReportsPanel').then((m) => ({ default: m.ReportsPanel }))
);

type CashFlowSectionProps = {
  totalEntradasLancadas: number;
  totalSaidasLancadas: number;
  saldo: number;
  entradasCount: number;
  saidasCount: number;
  currentGoal: Goal | null;
  getSaldoForMonth: (month: number, year: number) => number;
  isLoadingGoals?: boolean;
  onOpenGoalModal: () => void;
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  filteredEntries: Entry[];
  entriesCount: number;
  availableCategories: string[];
  viewMode: 'list' | 'calendar';
  setViewMode: (v: 'list' | 'calendar') => void;
  entries: Entry[];
  alerts: Alert[];
  showNewEntryHint: boolean;
  showMonthNavHint: boolean;
  showReportsHint: boolean;
  skip: () => void;
  onTogglePaid: (id: string) => void;
  onEdit: (entry?: Entry) => void;
  onDeleteRequest: (entry: Entry) => void;
};

export function CashFlowSection({
  totalEntradasLancadas,
  totalSaidasLancadas,
  saldo,
  entradasCount,
  saidasCount,
  currentGoal,
  getSaldoForMonth,
  isLoadingGoals = false,
  onOpenGoalModal,
  filter,
  setFilter,
  selectedCategory,
  setSelectedCategory,
  filteredEntries,
  entriesCount,
  availableCategories,
  viewMode,
  setViewMode,
  entries,
  alerts,
  showNewEntryHint,
  showMonthNavHint,
  showReportsHint,
  skip,
  onTogglePaid,
  onEdit,
  onDeleteRequest,
}: CashFlowSectionProps) {
  const { currentMonth, currentYear, goToPreviousMonth, goToNextMonth, monthLabel } = usePeriod();
  const showSkipButton = !showNewEntryHint && !showMonthNavHint && !showReportsHint;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10 space-y-6">
      <section className="space-y-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold tracking-tight text-slate-900">
              Fluxo de Caixa
            </h1>
            <p className="text-sm text-slate-500">
              Acompanhe seus lançamentos, entradas, saídas e saldo em um só lugar.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Mês anterior
            </button>
            <span className="text-sm font-semibold text-slate-800">
              {new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Próximo mês
            </button>
            {showMonthNavHint && (
              <GuidedTooltip text="Use estes botões para navegar entre os meses." />
            )}
            {showSkipButton && (
              <button
                type="button"
                onClick={skip}
                className="mt-1 text-[11px] text-slate-400 underline underline-offset-2 sm:mt-0"
              >
                Pular dicas
              </button>
            )}
          </div>
        </div>

        <section className="space-y-4">
          <DashboardCards
            totalEntradasLancadas={totalEntradasLancadas}
            totalSaidasLancadas={totalSaidasLancadas}
            saldo={saldo}
            entradasCount={entradasCount}
            saidasCount={saidasCount}
          />
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-3">
            <p className="text-[11px] text-slate-500">
              O saldo considera apenas lançamentos marcados como{' '}
              <span className="font-semibold">finalizados</span>. Entradas aumentam seu saldo e
              saídas diminuem.
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)] items-start">
          <section className="space-y-4">
            <GoalsCard
              goal={currentGoal}
              monthLabel={monthLabel}
              saldoDoMes={getSaldoForMonth(currentMonth, currentYear)}
              isLoading={isLoadingGoals}
              onOpenModal={onOpenGoalModal}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <FilterBar
                filter={filter}
                onFilterChange={setFilter}
                filteredCount={filteredEntries.length}
                totalCount={entriesCount}
                categories={availableCategories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
              <div className="hidden sm:flex bg-white border border-slate-200 rounded-full p-1 shadow-sm text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-full font-medium ${
                    viewMode === 'list'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-full font-medium ${
                    viewMode === 'calendar'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Calendário
                </button>
              </div>
            </div>

            {viewMode === 'list' ? (
              <EntryList
                entries={filteredEntries}
                onTogglePaid={onTogglePaid}
                onEdit={onEdit}
                onDeleteRequest={(id) => {
                  const entry = filteredEntries.find((e) => e.id === id);
                  if (entry) onDeleteRequest(entry);
                }}
                compact
              />
            ) : (
              <Suspense
                fallback={
                  <div className="min-h-[280px] rounded-2xl border border-slate-200 bg-white/60 animate-pulse" />
                }
              >
                <CalendarView entries={filteredEntries} month={currentMonth} year={currentYear} />
              </Suspense>
            )}
          </section>
        </div>

        <Suspense
          fallback={
            <div className="min-h-[120px] rounded-2xl border border-slate-200 bg-white/60 animate-pulse" />
          }
        >
          <ReportsPanel entries={entries} month={currentMonth} year={currentYear} />
        </Suspense>

        <AlertsPanel alerts={alerts} />

        {showReportsHint && (
          <div className="mt-2">
            <GuidedTooltip text="Aqui você encontra um resumo visual do mês: relatórios, metas e alertas." />
          </div>
        )}
      </section>
    </div>
  );
}
