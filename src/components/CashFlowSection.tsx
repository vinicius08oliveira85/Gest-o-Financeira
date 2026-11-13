import { lazy, Suspense, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type {
  CardExpense,
  CreditCard,
  Entry,
  FilterType,
  Goal,
  Loan,
  WishlistItem,
} from '../types';
import type { Alert } from '../hooks/useAlerts';
import { usePeriod } from '../contexts/PeriodContext';
import { formatCurrency, parseDateLocal, todayLocalISO } from '../lib/format';
import { DashboardCards } from './DashboardCards';
import { GoalsCard } from './GoalsCard';
import { FilterBar } from './FilterBar';
import { EntryList } from './EntryList';
import { LoanMonthItems } from './LoanMonthItems';
import { AlertsPanel } from './AlertsPanel';
import { GuidedTooltip } from './GuidedTooltip';
import { TabNav, type TabId } from './TabNav';
import { CardsSection } from './CardsSection';
import { LoansSection } from './LoansSection';
import { WishlistSection } from './WishlistSection';
import {
  getLoanInterest,
  getLoanMonthPendingAmount,
  getLoanMonthlyImpact,
  getLoanPaidInterest,
  getLoanTotals,
} from '../lib/loans';

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
  /** Só o mês selecionado, após busca/filtros (aba Lançamentos e calendário). */
  filteredEntries: Entry[];
  /** Total de lançamentos do mês selecionado, antes dos filtros. */
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
  showMonthNavHint: boolean;
  showReportsHint: boolean;
  onMonthNav: () => void;
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
  loans: Loan[];
  onNewLoan: () => void;
  onEditLoan: (loan: Loan) => void;
  onOpenLoanInstallments: (loan: Loan) => void;
  /** Abre a quitação antecipada do empréstimo. */
  onSettleLoan: (loan: Loan) => void;
  /** Desfaz uma quitação já registrada. */
  onUndoSettlement: (loan: Loan) => void;
  wishlistItems: WishlistItem[];
  onNewWishlistItem: () => void;
  onEditWishlistItem: (item: WishlistItem) => void;
  onToggleWishlistPurchased: (item: WishlistItem, purchased: boolean) => void;
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
  showMonthNavHint,
  showReportsHint,
  onMonthNav,
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
  loans,
  onNewLoan,
  onEditLoan,
  onOpenLoanInstallments,
  onSettleLoan,
  onUndoSettlement,
  wishlistItems,
  onNewWishlistItem,
  onEditWishlistItem,
  onToggleWishlistPurchased,
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
  // Juros já embutidos nas parcelas: aparece como informação, nunca somado ao
  // saldo em aberto (que já considera o valor cheio de cada parcela).
  const loanInterest = loans.reduce((sum, loan) => sum + getLoanInterest(loan), 0);
  // Juros contratados x já pagos: o que sobra está embutido nas parcelas em aberto.
  const loanPaidInterest = loans.reduce((sum, loan) => sum + getLoanPaidInterest(loan), 0);
  const loanOpenInterest = Math.max(0, Math.round((loanInterest - loanPaidInterest) * 100) / 100);
  // Parcelas do mês ainda não pagas contam como saída do mês (as pagas já são
  // lançamentos): sem isso o Resumo não mostra o valor real do mês.
  const loanPendingMes = useMemo(
    () => getLoanMonthPendingAmount(loans, currentMonth, currentYear, todayLocalISO()),
    [loans, currentMonth, currentYear]
  );
  // Peso do empréstimo no mês (parcelas vencendo, pagas ou não): é o que sai das
  // saídas do mês por causa de empréstimo; o resto é o "demais saídas".
  const loanImpactMes = useMemo(
    () => getLoanMonthlyImpact(loans, currentMonth, currentYear),
    [loans, currentMonth, currentYear]
  );
  const saidasComEmprestimos = totalSaidasLancadasMes + loanPendingMes;
  const outrasSaidasMes = Math.max(
    0,
    Math.round((saidasComEmprestimos - loanImpactMes) * 100) / 100
  );
  const loanShareMes = saidasComEmprestimos > 0 ? (loanImpactMes / saidasComEmprestimos) * 100 : 0;

  // `capitalize` do CSS deixava "Out. De 2026": capitalizava cada palavra. Só a
  // inicial do mês deve subir.
  const monthLabel = useMemo(() => {
    const raw = new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [currentMonth, currentYear]);

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

  // Totais do mês anterior (mesma lógica de metas do mês atual) para o comparativo
  const prevMonthTotals = useMemo(() => {
    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    const prevEntries = entries.filter((d) => {
      const date = parseDateLocal(d.dueDate);
      return (
        date.getMonth() === prevDate.getMonth() && date.getFullYear() === prevDate.getFullYear()
      );
    });
    const entradas = prevEntries
      .filter((d) => (d.goalId ? d.type === 'debt' : d.type === 'cash'))
      .reduce((acc, d) => acc + d.amount, 0);
    const saidas = prevEntries
      .filter((d) => (d.goalId ? d.type === 'cash' : d.type === 'debt'))
      .reduce((acc, d) => acc + d.amount, 0);
    const saldo =
      prevEntries
        .filter((d) => d.isPaid && (d.goalId ? d.type === 'debt' : d.type === 'cash'))
        .reduce((acc, d) => acc + d.amount, 0) -
      prevEntries
        .filter((d) => d.isPaid && (d.goalId ? d.type === 'cash' : d.type === 'debt'))
        .reduce((acc, d) => acc + d.amount, 0);
    return { entradas, saidas, saldo };
  }, [entries, currentMonth, currentYear]);

  // Parcelas de empréstimo do mês anterior que ainda não viraram lançamento:
  // entram no comparativo do mesmo jeito que as do mês atual, senão as saídas
  // parecem ter caído só porque o mês anterior não somava os empréstimos.
  const prevLoanPending = useMemo(() => {
    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    return getLoanMonthPendingAmount(
      loans,
      prevDate.getMonth(),
      prevDate.getFullYear(),
      todayLocalISO()
    );
  }, [loans, currentMonth, currentYear]);

  // Gasto no cartão do mês (fatura) e do mês anterior, para o comparativo do Resumo
  const cardSpendingMes = useMemo(
    () =>
      cardExpenses
        .filter((e) => e.billingMonth === currentMonth && e.billingYear === currentYear)
        .reduce((sum, e) => sum + e.amount, 0),
    [cardExpenses, currentMonth, currentYear]
  );

  const prevCardSpending = useMemo(() => {
    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    return cardExpenses
      .filter(
        (e) => e.billingMonth === prevDate.getMonth() && e.billingYear === prevDate.getFullYear()
      )
      .reduce((sum, e) => sum + e.amount, 0);
  }, [cardExpenses, currentMonth, currentYear]);

  return (
    <div className="app-container page-stack">
      <section className="section-stack">
        <div className="page-title-row">
          <h1 className="page-title">Fluxo de Caixa</h1>

          <div className="toolbar-row">
            <button
              type="button"
              onClick={() => {
                onMonthNav();
                goToPreviousMonth();
              }}
              aria-label="Mês anterior"
              className="neu-btn shrink-0 p-1.5 rounded-full text-slate-700 dark:text-slate-200"
            >
              <ChevronLeft size={18} />
            </button>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => {
                  onMonthNav();
                  goToCurrentMonth();
                }}
                className="neu-btn-emerald rounded-full px-2.5 py-1 text-xs font-medium"
              >
                Hoje
              </button>
            )}
            <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => {
                onMonthNav();
                goToNextMonth();
              }}
              aria-label="Próximo mês"
              className="neu-btn shrink-0 p-1.5 rounded-full text-slate-700 dark:text-slate-200"
            >
              <ChevronRight size={18} />
            </button>
            {showSkipButton && (
              <button
                type="button"
                onClick={skip}
                className="text-2xs text-slate-600 dark:text-slate-400 underline underline-offset-2"
              >
                Pular dicas
              </button>
            )}
          </div>
        </div>

        {showMonthNavHint && (
          <GuidedTooltip text="Use as setas para navegar entre os meses e o botão Hoje para voltar." />
        )}

        <TabNav activeTab={activeTab} onTabChange={onTabChange} />

        {activeTab === 'resumo' && (
          <section className="section-stack">
            <DashboardCards
              totalEntradasLancadas={totalEntradasLancadasMes}
              totalSaidasLancadas={saidasComEmprestimos}
              saldo={saldoMes}
              entradasCount={entradasCountMes}
              saidasCount={saidasCountMes}
              totalEntradasFinalizadas={totalEntradasFinalizadasMes}
              totalEntradasPendentes={totalEntradasPendentesMes}
              totalSaidasFinalizadas={totalSaidasFinalizadasMes}
              totalSaidasPendentes={totalSaidasPendentesMes + loanPendingMes}
              totalLimiteDisponivel={cards.length > 0 ? totalLimiteDisponivel : undefined}
              saldoProjetado={saldoProjetadoMes - loanPendingMes}
              periodLabel="do mês"
              prevEntradasLancadas={prevMonthTotals.entradas}
              prevSaidasLancadas={
                Math.round((prevMonthTotals.saidas + prevLoanPending) * 100) / 100
              }
              prevSaldo={prevMonthTotals.saldo}
              cardSpending={cardSpendingMes}
              prevCardSpending={prevCardSpending}
            />
            <p className="info-bar">
              O saldo considera apenas lançamentos{' '}
              <span className="font-semibold">finalizados</span>. Entradas aumentam e saídas
              diminuem o saldo.
            </p>
            {loanPendingMes > 0 && (
              <p className="info-bar">
                As parcelas de empréstimo em aberto do mês entram nas saídas como{' '}
                <span className="font-semibold">pendentes</span>; as pagas já são lançamentos.
              </p>
            )}
            {loanImpactMes > 0 && (
              <div className="neu-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Empréstimos nas saídas do mês
                  </p>
                  <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                    {formatCurrency(loanImpactMes)}
                  </p>
                </div>
                <div className="h-2 neu-progress-track mt-2">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${Math.min(100, loanShareMes)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-2xs text-slate-500 dark:text-slate-400">
                  <span>{loanShareMes.toFixed(0)}% das saídas do mês</span>
                  <span>Demais saídas: {formatCurrency(outrasSaidasMes)}</span>
                </div>
              </div>
            )}
            {loans.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="neu-card p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Empréstimos em aberto
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(getLoanTotals(loans, todayLocalISO()).open)}
                  </p>
                </div>
                <div className="neu-card p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Empréstimos vencidos
                  </p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(getLoanTotals(loans, todayLocalISO()).overdue)}
                  </p>
                </div>
                {loanInterest > 0 && (
                  <div className="neu-card p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Juros no parcelamento
                    </p>
                    <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(loanInterest)}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400">
                      <span>Já pagos</span>
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {formatCurrency(loanPaidInterest)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400">
                      <span>A pagar</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(loanOpenInterest)}
                      </span>
                    </div>
                    <p className="text-2xs text-slate-500 dark:text-slate-400">
                      Já dentro das parcelas — não somados ao saldo em aberto.
                    </p>
                  </div>
                )}
              </div>
            )}
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
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
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
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Calendário
                </button>
              </div>
            </div>
            {viewMode === 'list' && (
              <LoanMonthItems
                loans={loans}
                month={currentMonth}
                year={currentYear}
                onOpenInstallments={onOpenLoanInstallments}
              />
            )}
            {viewMode === 'list' ? (
              <EntryList
                cards={cards}
                entries={filteredEntries}
                onTogglePaid={onTogglePaid}
                onEdit={onEdit}
                onDeleteRequest={(id) => {
                  const entry = filteredEntries.find((e) => e.id === id);
                  if (entry) onDeleteRequest(entry);
                }}
                compact
                groupByDate
                filtered={entriesCount > 0 && filteredEntries.length === 0}
                onClearFilters={() => {
                  setFilter('all');
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
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
              loans={loans}
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
                  asAddCard={goals.length > 0}
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

        {activeTab === 'emprestimos' && (
          <section>
            <LoansSection
              loans={loans}
              onNewLoan={onNewLoan}
              onEditLoan={onEditLoan}
              onOpenInstallments={onOpenLoanInstallments}
              onSettleLoan={onSettleLoan}
              onUndoSettlement={onUndoSettlement}
            />
          </section>
        )}

        {activeTab === 'desejos' && (
          <section>
            <WishlistSection
              items={wishlistItems}
              onNewItem={onNewWishlistItem}
              onEditItem={onEditWishlistItem}
              onTogglePurchased={onToggleWishlistPurchased}
            />
          </section>
        )}
      </section>
    </div>
  );
}
