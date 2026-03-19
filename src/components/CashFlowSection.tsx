import { useState, lazy, Suspense } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CardExpense, CreditCard, Entry, FilterType, Goal } from '../types';
import type { Alert } from '../hooks/useAlerts';
import { usePeriod } from '../contexts/PeriodContext';
import { DashboardCards } from './DashboardCards';
import { GoalsCard } from './GoalsCard';
import { FilterBar } from './FilterBar';
import { EntryList } from './EntryList';
import { AlertsPanel } from './AlertsPanel';
import { GuidedTooltip } from './GuidedTooltip';
import { TabNav, type TabId } from './TabNav';
import { CardsSection } from './CardsSection';

const CalendarView = lazy(() =>
  import('./CalendarView').then((m) => ({ default: m.CalendarView }))
);
const ReportsPanel = lazy(() =>
  import('./ReportsPanel').then((m) => ({ default: m.ReportsPanel }))
);

type CashFlowSectionProps = {
  totalEntradasLancadasMes: number;
  totalSaidasLancadasMes: number;
  saldoMes: number;
  entradasCountMes: number;
  saidasCountMes: number;
  totalEntradasFinalizadasMes: number;
  totalEntradasPendentesMes: number;
  totalSaidasFinalizadasMes: number;
  totalSaidasPendentesMes: number;
  saldoProjetadoMes: number;
  goals: Goal[];
  getMetaBalanceForGoal: (goalId: string) => number;
  isLoadingGoals?: boolean;
  onOpenGoalModal: (goal?: Goal) => void;
  onDepositToGoal: (goal: Goal) => void;
  onWithdrawFromGoal: (goal: Goal) => void;
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortBy: 'dueDate' | 'amount' | 'name';
  setSortBy: (s: 'dueDate' | 'amount' | 'name') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (s: 'asc' | 'desc') => void;
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
  pendingPaidId?: string | null;
  onEdit: (entry?: Entry) => void;
  onDeleteRequest: (entry: Entry) => void;
  onDismissAlert?: (id: string) => void;
  cards: CreditCard[];
  cardExpenses: CardExpense[];
  onNewCard: () => void;
  onEditCard: (card: CreditCard) => void;
  onAddExpense: (card: CreditCard) => void;
  onRegisterInvoice: (card: CreditCard, month: number, year: number, total: number) => void;
};

export function CashFlowSection({
  totalEntradasLancadasMes,
  totalSaidasLancadasMes,
  saldoMes,
  entradasCountMes,
  saidasCountMes,
  totalEntradasFinalizadasMes,
  totalEntradasPendentesMes,
  totalSaidasFinalizadasMes,
  totalSaidasPendentesMes,
  saldoProjetadoMes,
  goals,
  getMetaBalanceForGoal,
  isLoadingGoals = false,
  onOpenGoalModal,
  onDepositToGoal,
  onWithdrawFromGoal,
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
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
  pendingPaidId = null,
  onEdit,
  onDeleteRequest,
  onDismissAlert,
  cards,
  cardExpenses,
  onNewCard,
  onEditCard,
  onAddExpense,
  onRegisterInvoice,
}: CashFlowSectionProps) {
  const {
    currentMonth,
    currentYear,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    isCurrentMonth,
  } = usePeriod();
  const [activeTab, setActiveTab] = useState<TabId>('resumo');
  const showSkipButton = !showNewEntryHint && !showMonthNavHint && !showReportsHint;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10 space-y-6">
      <section className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Fluxo de Caixa
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
              Acompanhe seus lançamentos, entradas, saídas e saldo por mês.
            </p>
          </div>

          {/* Mobile: navegação compacta em uma linha */}
          <div className="flex items-center justify-between gap-2 lg:hidden">
            <button
              type="button"
              onClick={goToPreviousMonth}
              aria-label="Mês anterior"
              className="shrink-0 p-2 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col items-center min-w-0 flex-1 px-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize truncate w-full text-center">
                {new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={goToCurrentMonth}
                  className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline mt-0.5"
                >
                  Ir para hoje
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Próximo mês"
              className="shrink-0 p-2 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Desktop: botões com texto */}
          <div className="hidden lg:flex flex-col items-end gap-1 lg:flex-row lg:items-center lg:gap-3">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Mês anterior
            </button>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToCurrentMonth}
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              >
                Hoje
              </button>
            )}
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">
              {new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700"
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
                className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 underline underline-offset-2 lg:mt-0"
              >
                Pular dicas
              </button>
            )}
          </div>
        </div>

        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'resumo' && (
          <section className="space-y-4">
            <DashboardCards
              totalEntradasLancadas={totalEntradasLancadasMes}
              totalSaidasLancadas={totalSaidasLancadasMes}
              saldo={saldoMes}
              entradasCount={entradasCountMes}
              saidasCount={saidasCountMes}
              totalEntradasFinalizadas={totalEntradasFinalizadasMes}
              totalEntradasPendentes={totalEntradasPendentesMes}
              totalSaidasFinalizadas={totalSaidasFinalizadasMes}
              totalSaidasPendentes={totalSaidasPendentesMes}
              saldoProjetado={saldoProjetadoMes}
              periodLabel="do mês"
            />
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-800/60 p-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                O saldo considera apenas lançamentos marcados como{' '}
                <span className="font-semibold">finalizados</span>. Entradas aumentam seu saldo e
                saídas diminuem.
              </p>
            </div>
            <AlertsPanel alerts={alerts} onDismiss={onDismissAlert} />
            {showReportsHint && (
              <GuidedTooltip text="Use as abas para ver Lançamentos, Relatórios e Metas." />
            )}
          </section>
        )}

        {activeTab === 'lancamentos' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <FilterBar
                filter={filter}
                onFilterChange={setFilter}
                filteredCount={filteredEntries.length}
                totalCount={entriesCount}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                categories={availableCategories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
              <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full p-1 shadow-sm text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-full font-medium ${
                    viewMode === 'list'
                      ? 'bg-slate-900 dark:bg-emerald-600 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-full font-medium ${
                    viewMode === 'calendar'
                      ? 'bg-slate-900 dark:bg-emerald-600 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
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
                pendingPaidId={pendingPaidId}
                compact
                groupByDate
              />
            ) : (
              <Suspense
                fallback={
                  <div className="min-h-[280px] rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/60 dark:bg-slate-800/60 animate-pulse" />
                }
              >
                <CalendarView entries={filteredEntries} month={currentMonth} year={currentYear} />
              </Suspense>
            )}
          </section>
        )}

        {activeTab === 'relatorios' && (
          <Suspense
            fallback={
              <div className="min-h-[120px] rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/60 dark:bg-slate-800/60 animate-pulse" />
            }
          >
            <ReportsPanel
              entries={entries}
              month={currentMonth}
              year={currentYear}
              cards={cards}
              cardExpenses={cardExpenses}
            />
          </Suspense>
        )}

        {activeTab === 'metas' && (
          <section className="space-y-4 max-w-xl">
            {isLoadingGoals ? (
              <GoalsCard
                goal={null}
                metaBalance={0}
                isLoading
                onOpenModal={() => onOpenGoalModal()}
                onDeposit={onDepositToGoal}
                onWithdraw={onWithdrawFromGoal}
              />
            ) : (
              <>
                {goals.map((goal) => (
                  <GoalsCard
                    key={goal.id}
                    goal={goal}
                    metaBalance={getMetaBalanceForGoal(goal.id)}
                    onOpenModal={() => onOpenGoalModal(goal)}
                    onDeposit={onDepositToGoal}
                    onWithdraw={onWithdrawFromGoal}
                  />
                ))}
                <GoalsCard
                  goal={null}
                  metaBalance={0}
                  onOpenModal={() => onOpenGoalModal()}
                  onDeposit={onDepositToGoal}
                  onWithdraw={onWithdrawFromGoal}
                />
              </>
            )}
          </section>
        )}

        {activeTab === 'cartoes' && (
          <section>
            <CardsSection
              cards={cards}
              expenses={cardExpenses}
              invoiceEntries={entries.filter((e) => e.isCardInvoice)}
              currentMonth={currentMonth}
              currentYear={currentYear}
              onNewCard={onNewCard}
              onEditCard={onEditCard}
              onAddExpense={onAddExpense}
              onRegisterInvoice={onRegisterInvoice}
            />
          </section>
        )}
      </section>
    </div>
  );
}
