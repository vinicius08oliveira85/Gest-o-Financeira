import { lazy, Suspense, useMemo } from 'react';
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
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  alerts: Alert[];
  onAlertAction?: (alert: Alert) => void;
  showNewEntryHint: boolean;
  showReportsHint: boolean;
  skip: () => void;
  onTogglePaid: (id: string) => void;
  onEdit: (entry?: Entry) => void;
  onDeleteRequest: (entry: Entry) => void;
  onDismissAlert?: (id: string) => void;
  cards: CreditCard[];
  cardExpenses: CardExpense[];
  onNewCard: () => void;
  onEditCard: (card: CreditCard) => void;
  onAddExpense: (card: CreditCard) => void;
  onEditExpense: (expense: CardExpense) => void;
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
  activeTab,
  onTabChange,
  alerts,
  onAlertAction,
  showNewEntryHint,
  showReportsHint,
  skip,
  onTogglePaid,
  onEdit,
  onDeleteRequest,
  onDismissAlert,
  cards,
  cardExpenses,
  onNewCard,
  onEditCard,
  onAddExpense,
  onEditExpense,
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
  const showSkipButton = !showNewEntryHint && !showReportsHint;

  const totalLimiteDisponivel = useMemo(
    () =>
      cards.reduce((sum, card) => {
        const totalGasto = cardExpenses
          .filter((e) => e.cardId === card.id)
          .reduce((s, e) => s + e.amount, 0);
        const totalFaturasPagas = entries
          .filter((e) => e.cardId === card.id && e.isCardInvoice && e.isPaid)
          .reduce((s, e) => s + e.amount, 0);
        return sum + Math.max(0, card.limitAmount - totalGasto + totalFaturasPagas);
      }, 0),
    [cards, cardExpenses, entries]
  );

  return (
    <div className="app-container page-stack">
      <section className="section-stack">
        <div className="page-title-row">
          <h1 className="page-title">Fluxo de Caixa</h1>

          <div className="toolbar-row">
            <button
              type="button"
              onClick={goToPreviousMonth}
              aria-label="Mês anterior"
              className="neu-btn shrink-0 p-1.5 rounded-full text-slate-700 dark:text-slate-200"
            >
              <ChevronLeft size={18} />
            </button>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToCurrentMonth}
                className="neu-btn-emerald rounded-full px-2.5 py-1 text-xs font-medium"
              >
                Hoje
              </button>
            )}
            <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 capitalize whitespace-nowrap">
              {new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', {
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Próximo mês"
              className="neu-btn shrink-0 p-1.5 rounded-full text-slate-700 dark:text-slate-200"
            >
              <ChevronRight size={18} />
            </button>
            {showSkipButton && (
              <button
                type="button"
                onClick={skip}
                className="text-2xs text-slate-400 dark:text-slate-500 underline underline-offset-2"
              >
                Pular dicas
              </button>
            )}
          </div>
        </div>

        <TabNav activeTab={activeTab} onTabChange={onTabChange} />

        {activeTab === 'resumo' && (
          <section className="section-stack">
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
              totalLimiteDisponivel={cards.length > 0 ? totalLimiteDisponivel : undefined}
              saldoProjetado={saldoProjetadoMes}
              periodLabel="do mês"
            />
            <p className="info-bar">
              O saldo considera apenas lançamentos{' '}
              <span className="font-semibold">finalizados</span>. Entradas aumentam e saídas
              diminuem o saldo.
            </p>
            <AlertsPanel alerts={alerts} onDismiss={onDismissAlert} onAction={onAlertAction} />
            {showReportsHint && (
              <GuidedTooltip text="Use as abas para ver Lançamentos, Relatórios e Metas." />
            )}
          </section>
        )}

        {activeTab === 'lancamentos' && (
          <section className="section-stack">
            <div className="toolbar-row justify-between">
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
              <div className="neu-inset flex rounded-full p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-full font-medium ${
                    viewMode === 'list'
                      ? 'neu-filter-active'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1 rounded-full font-medium ${
                    viewMode === 'calendar'
                      ? 'neu-filter-active'
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
                compact
                groupByDate
              />
            ) : (
              <Suspense
                fallback={
                  <div className="min-h-panel neu-surface-glass rounded-2xl animate-pulse" />
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
              <div className="min-h-panel-sm neu-surface-glass rounded-2xl animate-pulse" />
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
          <section className="goals-stack">
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
              onEditExpense={onEditExpense}
              onRegisterInvoice={onRegisterInvoice}
            />
          </section>
        )}
      </section>
    </div>
  );
}
