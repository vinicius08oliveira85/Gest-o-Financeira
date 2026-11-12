import { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { MotionConfig } from 'motion/react';
import { useEntries } from './hooks/useEntries';
import { useEntryForm } from './hooks/useEntryForm';
import { useGoals } from './hooks/useGoals';
import { useCreditCards } from './hooks/useCreditCards';
import { useLoans } from './hooks/useLoans';
import { useWishlist } from './hooks/useWishlist';
import { useCardExpenses } from './hooks/useCardExpenses';
import { useAlerts, type Alert } from './hooks/useAlerts';
import { useOnboarding } from './hooks/useOnboarding';
import { useToast } from './hooks/useToast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { exportEntriesToCSV, formatCurrency, todayLocalISO } from './lib/format';
import {
  buildInvoiceEntry,
  findInvoiceEntriesForCard,
  findInvoiceEntryForCycle,
  planInvoiceSync,
  preserveInvoiceState,
} from './lib/cardInvoice';
import { randomUUID } from './lib/uuid';
import { getInstallmentsToCancel, monthKey, updateInstallmentAmount } from './lib/loans';
import { logError } from './lib/logger';
import { DISMISSED_ALERTS_KEY, WISHLIST_CATEGORY } from './constants';
import type { CardExpense, CreditCard, Entry, Goal, Loan, WishlistItem } from './types';
import type { TabId } from './components/TabNav';
import { PeriodProvider } from './contexts/PeriodContext';
import {
  MainLayout,
  CashFlowSection,
  FloatingActionButton,
  ErrorBoundary,
  Toast,
} from './components';
const ConfirmDeleteModal = lazy(() =>
  import('./components/ConfirmDeleteModal').then((m) => ({ default: m.ConfirmDeleteModal }))
);
const ApplyRecurrenceModal = lazy(() =>
  import('./components/ApplyRecurrenceModal').then((m) => ({ default: m.ApplyRecurrenceModal }))
);
const DeleteRecurringModal = lazy(() =>
  import('./components/DeleteRecurringModal').then((m) => ({ default: m.DeleteRecurringModal }))
);
const MetaMovementModal = lazy(() =>
  import('./components/MetaMovementModal').then((m) => ({ default: m.MetaMovementModal }))
);

const GoalModal = lazy(() =>
  import('./components/GoalModal').then((m) => ({ default: m.GoalModal }))
);

const CreditCardModal = lazy(() =>
  import('./components/CreditCardModal').then((m) => ({ default: m.CreditCardModal }))
);

const CardExpenseModal = lazy(() =>
  import('./components/CardExpenseModal').then((m) => ({ default: m.CardExpenseModal }))
);

const LoanModal = lazy(() =>
  import('./components/LoanModal').then((m) => ({ default: m.LoanModal }))
);

const LoanSettleModal = lazy(() =>
  import('./components/LoanSettleModal').then((m) => ({ default: m.LoanSettleModal }))
);

const LoanInstallmentsModal = lazy(() =>
  import('./components/LoanInstallmentsModal').then((m) => ({
    default: m.LoanInstallmentsModal,
  }))
);

const WishlistModal = lazy(() =>
  import('./components/WishlistModal').then((m) => ({ default: m.WishlistModal }))
);

const ModalForm = lazy(() =>
  import('./components/ModalForm').then((m) => ({ default: m.ModalForm }))
);

export default function App() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('resumo');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [pendingRecurringUpdate, setPendingRecurringUpdate] = useState<Entry | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [metaMovement, setMetaMovement] = useState<{
    goal: Goal;
    type: 'deposit' | 'withdraw';
  } | null>(null);
  const [metaMovementLoading, setMetaMovementLoading] = useState(false);

  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<CreditCard | null>(null);
  const [expenseModalCard, setExpenseModalCard] = useState<CreditCard | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<CardExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<CardExpense | null>(null);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);

  const { cards, upsertCard, deleteCard } = useCreditCards();
  const { loans, upsertLoan, deleteLoan } = useLoans();
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

  const [loanInstallmentsLoan, setLoanInstallmentsLoan] = useState<Loan | null>(null);
  const [loanToSettle, setLoanToSettle] = useState<Loan | null>(null);

  const { wishlistItems, upsertWishlistItem, deleteWishlistItem } = useWishlist();
  const [wishlistModalOpen, setWishlistModalOpen] = useState(false);
  const [wishlistToEdit, setWishlistToEdit] = useState<WishlistItem | null>(null);
  const [wishlistToDelete, setWishlistToDelete] = useState<WishlistItem | null>(null);
  const {
    expenses: cardExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteExpensesByCard,
  } = useCardExpenses();

  const {
    entries,
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
    currentMonth,
    currentYear,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    filteredEntries,
    entriesDoMes,
    totalEntradasLancadasMes,
    totalSaidasLancadasMes,
    saldoMes,
    entradasCountMes,
    saidasCountMes,
    totalEntradasFinalizadasMes,
    totalEntradasPendentesMes,
    totalSaidasFinalizadasMes,
    totalSaidasPendentesMes,
    isLoading,
    isMigrating,
    showOfflineBanner,
    setShowOfflineBanner,
    isCloudUnavailable,
    saveError,
    setSaveError,
    addOrUpdateEntry,
    togglePaid,
    deleteEntry,
    updateRecurringApplyToAll,
    deleteRecurringModel,
    availableCategories,
    syncEntriesNow,
    getMetaBalanceForGoal,
    saveEntriesLocal,
    pushEntriesToCloud,
    pullEntriesFromCloud,
    isSyncing,
    entriesSyncAvailable,
  } = useEntries();

  const { goals, upsertGoal, deleteGoal, isLoadingGoals } = useGoals();
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const linkedGoalEntriesCount = goalToDelete
    ? entries.filter((e) => e.goalId === goalToDelete.id).length
    : 0;
  const { toastMessage, toastAction, showToast, dismissToast } = useToast();
  const { alerts } = useAlerts({
    entries,
    month: currentMonth,
    year: currentYear,
    goals,
    cards,
    cardExpenses,
    loans,
  });

  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_ALERTS_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const visibleAlerts = useMemo(
    () => alerts.filter((a) => !dismissedAlertIds.has(a.id)),
    [alerts, dismissedAlertIds]
  );

  const handleAlertAction = useCallback((alert: Alert) => {
    switch (alert.type) {
      case 'goal-deadline':
        setActiveTab('metas');
        break;
      case 'card-invoice-due':
      case 'card-limit':
        setActiveTab('cartoes');
        break;
      case 'loan-discount-ending':
        setActiveTab('emprestimos');
        break;
      default:
        setActiveTab('lancamentos');
    }
  }, []);

  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlertIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...next]));
      } catch (e) {
        logError('Failed to save dismissed alerts', e);
      }
      return next;
    });
  }, []);
  const { showNewEntryHint, showMonthNavHint, showReportsHint, completeStep, skip } =
    useOnboarding();

  const form = useEntryForm(
    (entry, isEdit) => {
      addOrUpdateEntry(entry, isEdit);
      showToast('Lançamento salvo');
    },
    () => setIsFormOpen(false),
    {
      onEditRecurring: (entry) => setPendingRecurringUpdate(entry),
    }
  );

  const handleOpenForm = useCallback(
    (entry?: Entry) => {
      form.openForm(entry);
      setIsFormOpen(true);
    },
    [form.openForm]
  );

  const handleNewEntryWithStep = useCallback(() => {
    handleOpenForm();
    completeStep('stepNewEntry');
  }, [handleOpenForm, completeStep]);

  // Keyboard shortcuts (only when not in a modal)
  useKeyboardShortcuts([
    {
      key: 'n',
      meta: true,
      handler: handleNewEntryWithStep,
      description: 'Novo lançamento',
    },
    {
      key: 'n',
      ctrl: true,
      handler: handleNewEntryWithStep,
      description: 'Novo lançamento',
    },
    {
      key: '/',
      handler: () => {
        const searchInput = document.querySelector(
          'input[aria-label="Buscar por nome ou valor"]'
        ) as HTMLInputElement | null;
        searchInput?.focus();
      },
      description: 'Focar busca',
      preventDefault: true,
    },
  ]);

  const handleDeleteRequest = useCallback((entry: Entry) => {
    setEntryToDelete(entry);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (entryToDelete) {
      const entry = entryToDelete;
      deleteEntry(entry.id);
      setEntryToDelete(null);
      showToast('Registro excluído', {
        label: 'Desfazer',
        callback: () => addOrUpdateEntry(entry, false),
      });
    }
  }, [entryToDelete, deleteEntry, showToast, addOrUpdateEntry]);

  const handleSaveEntriesLocal = useCallback(() => {
    saveEntriesLocal();
    showToast('Dados salvos localmente');
  }, [saveEntriesLocal, showToast]);

  // Última ação de sync que falhou, para o "Tentar novamente" do banner refazê-la.
  const lastSyncAttemptRef = useRef<'push' | 'pull' | null>(null);

  const handleSaveEntriesToCloud = useCallback(async () => {
    lastSyncAttemptRef.current = 'push';
    try {
      await pushEntriesToCloud();
      showToast('Dados gravados no Appwrite');
    } catch {
      // Erro também aparece em saveError / banner
    }
  }, [pushEntriesToCloud, showToast]);

  const handlePullEntriesFromCloud = useCallback(async () => {
    lastSyncAttemptRef.current = 'pull';
    try {
      await pullEntriesFromCloud();
      showToast('Dados atualizados do Appwrite');
    } catch {
      // Erro também aparece em saveError / banner
    }
  }, [pullEntriesFromCloud, showToast]);

  const handleRegisterInvoice = useCallback(
    (card: CreditCard, month: number, year: number, total: number) => {
      const existing = findInvoiceEntryForCycle(
        entries,
        card.id,
        month,
        year,
        card.closingDay,
        card.dueDay
      );
      const entry = buildInvoiceEntry(card, month, year, total, existing?.id);
      // Re-registrar a fatura não pode zerar o status de pagamento já registrado
      // nem reescrever a data de criação (usada na ordenação/paginação do Appwrite).
      addOrUpdateEntry(preserveInvoiceState(entry, existing), existing != null);
      showToast('Fatura registrada no fluxo de caixa');
    },
    [entries, addOrUpdateEntry, showToast]
  );

  /**
   * Faturas já registradas acompanham os gastos do ciclo: criar, editar ou
   * excluir um gasto atualiza o lançamento da fatura (sem desfazer o pagamento).
   * O baseline anterior impede que uma lista de gastos ainda não carregada
   * derrube as faturas.
   */
  const previousCardExpensesRef = useRef<CardExpense[]>([]);
  useEffect(() => {
    const actions = planInvoiceSync(
      entries.filter((e) => e.isCardInvoice),
      cardExpenses,
      previousCardExpensesRef.current
    );
    previousCardExpensesRef.current = cardExpenses;
    for (const action of actions) {
      if (action.type === 'delete') {
        deleteEntry(action.entry.id);
      } else {
        addOrUpdateEntry({ ...action.entry, amount: action.amount, updatedAt: Date.now() }, true);
      }
    }
  }, [cardExpenses, entries, addOrUpdateEntry, deleteEntry]);

  /**
   * Parcela de empréstimo marcada como paga gera a saída no mês do vencimento da
   * parcela (o saldo daquele mês é abatido); desmarcar remove a saída.
   */
  const handleToggleLoanInstallmentPaid = useCallback(
    (loan: Loan, number: number, paid: boolean) => {
      const installments = loan.installments ?? [];
      const installment = installments.find((i) => i.number === number);
      if (!installment || installment.paid === paid) return;

      let entryId = installment.entryId;
      if (paid) {
        const entry: Entry = {
          id: randomUUID(),
          name: `${loan.name} — parcela ${number}/${installments.length}`,
          amount: installment.amount,
          dueDate: installment.dueDate,
          isPaid: true,
          paidDate: todayLocalISO(),
          type: 'debt',
          createdAt: Date.now(),
          category: 'Empréstimos',
          installmentsCount: installments.length,
          installmentNumber: number,
        };
        void addOrUpdateEntry(entry, false);
        entryId = entry.id;
      } else if (installment.entryId) {
        deleteEntry(installment.entryId);
        entryId = undefined;
      }

      const nextInstallments = installments.map((i) =>
        i.number === number
          ? {
              ...i,
              paid,
              paidDate: paid ? todayLocalISO() : undefined,
              entryId,
            }
          : i
      );
      const nextLoan: Loan = {
        ...loan,
        installments: nextInstallments,
        paid: nextInstallments.every((i) => i.paid),
      };
      upsertLoan(nextLoan);
      setLoanInstallmentsLoan(nextLoan);
      showToast(
        paid
          ? `Parcela ${number}/${installments.length} paga — ${formatCurrency(installment.amount)} abatido do mês`
          : `Pagamento da parcela ${number}/${installments.length} desfeito`
      );
    },
    [addOrUpdateEntry, deleteEntry, upsertLoan, showToast]
  );

  /**
   * Cancelar uma parcela tira o valor do que está em aberto (não vira
   * lançamento); reativar devolve a parcela. Pagamento precisa ser desfeito antes.
   */
  const handleToggleLoanInstallmentCancelled = useCallback(
    (loan: Loan, number: number, cancelled: boolean) => {
      const installments = loan.installments ?? [];
      const installment = installments.find((i) => i.number === number);
      if (!installment || installment.cancelled === cancelled) return;
      if (cancelled && installment.paid) return;
      // Depois da quitação as parcelas só voltam se a quitação for desfeita.
      if (!cancelled && loan.settlement) {
        showToast('Desfaça a quitação para reativar parcelas');
        return;
      }

      const nextInstallments = installments.map((i) =>
        i.number === number ? { ...i, cancelled } : i
      );
      const nextLoan: Loan = {
        ...loan,
        installments: nextInstallments,
        paid: nextInstallments.every((i) => i.paid),
      };
      upsertLoan(nextLoan);
      setLoanInstallmentsLoan(nextLoan);
      showToast(
        cancelled
          ? `Parcela ${number}/${installments.length} cancelada`
          : `Parcela ${number}/${installments.length} reativada`
      );
    },
    [upsertLoan, showToast]
  );

  /**
   * Quitar: paga o saldo de uma vez com o valor informado, lança a saída única
   * na data do pagamento (abatendo o mês em Lançamentos) e cancela as parcelas
   * que ainda estavam em aberto — o empréstimo fica sem saldo no Resumo.
   */
  const handleSettleLoan = useCallback(
    (loan: Loan, amount: number, date: string) => {
      const cancelledNumbers = getInstallmentsToCancel(loan).map((i) => i.number);
      const entry: Entry = {
        id: randomUUID(),
        name: `${loan.name} — quitação`,
        amount,
        dueDate: date,
        isPaid: true,
        paidDate: date,
        type: 'debt',
        createdAt: Date.now(),
        category: 'Empréstimos',
      };
      void addOrUpdateEntry(entry, false);

      const nextLoan: Loan = {
        ...loan,
        paid: true,
        installments: loan.installments?.map((i) =>
          i.paid || i.cancelled ? i : { ...i, cancelled: true }
        ),
        settlement: { amount, date, entryId: entry.id, cancelledNumbers },
      };
      upsertLoan(nextLoan);
      setLoanInstallmentsLoan(
        loanInstallmentsLoan?.id === loan.id ? nextLoan : loanInstallmentsLoan
      );
      showToast(`Empréstimo quitado — ${formatCurrency(amount)} abatido do mês`);
    },
    [addOrUpdateEntry, upsertLoan, showToast, loanInstallmentsLoan]
  );

  /** Desfaz a quitação: remove a saída, devolve as parcelas canceladas e o saldo. */
  const handleUndoSettlement = useCallback(
    (loan: Loan) => {
      const settlement = loan.settlement;
      if (!settlement) return;
      if (settlement.entryId) deleteEntry(settlement.entryId);

      const restored = settlement.cancelledNumbers ?? [];
      const nextInstallments = loan.installments?.map((i) =>
        restored.includes(i.number) ? { ...i, cancelled: false } : i
      );
      const nextLoan: Loan = {
        ...loan,
        settlement: undefined,
        installments: nextInstallments,
        paid: nextInstallments ? nextInstallments.every((i) => i.paid) : false,
      };
      upsertLoan(nextLoan);
      setLoanInstallmentsLoan(
        loanInstallmentsLoan?.id === loan.id ? nextLoan : loanInstallmentsLoan
      );
      showToast('Quitação desfeita — empréstimo voltou a ficar em aberto');
    },
    [deleteEntry, upsertLoan, showToast, loanInstallmentsLoan]
  );

  /**
   * Mudar o vencimento de uma parcela paga move a saída vinculada para o mês
   * novo, para o abatimento continuar no mês certo.
   */
  const handleChangeLoanInstallmentDueDate = useCallback(
    (loan: Loan, number: number, dueDate: string) => {
      if (!dueDate) return;
      const installments = loan.installments ?? [];
      const installment = installments.find((i) => i.number === number);
      if (!installment) return;

      if (installment.paid && installment.entryId) {
        const entry = entries.find((e) => e.id === installment.entryId);
        if (entry) void addOrUpdateEntry({ ...entry, dueDate }, true);
      }

      const nextInstallments = installments.map((i) =>
        i.number === number ? { ...i, dueDate } : i
      );
      // O período do desconto acompanha a primeira e a última parcela.
      const dates = nextInstallments.map((i) => i.dueDate).sort();
      const nextLoan: Loan = {
        ...loan,
        installments: nextInstallments,
        discountStart: monthKey(dates[0]),
        discountEnd: monthKey(dates[dates.length - 1]),
      };
      upsertLoan(nextLoan);
      setLoanInstallmentsLoan(nextLoan);
    },
    [addOrUpdateEntry, entries, upsertLoan]
  );

  /**
   * Mudar o valor de uma parcela ajusta o saldo em aberto (é assim que juros
   * diferentes por parcela entram no empréstimo). Se ela já foi paga, a saída
   * vinculada acompanha o novo valor para o mês continuar batendo.
   */
  const handleChangeLoanInstallmentAmount = useCallback(
    (loan: Loan, number: number, amount: number) => {
      if (!(amount > 0)) {
        showToast('Informe um valor maior que zero');
        return;
      }
      const installments = loan.installments ?? [];
      const installment = installments.find((i) => i.number === number);
      if (!installment || installment.amount === amount) return;

      if (installment.paid && installment.entryId) {
        const entry = entries.find((e) => e.id === installment.entryId);
        if (entry) void addOrUpdateEntry({ ...entry, amount }, true);
      }

      const nextLoan = updateInstallmentAmount(loan, number, amount);
      upsertLoan(nextLoan);
      setLoanInstallmentsLoan(nextLoan);
      showToast(`Parcela ${number}/${installments.length} ajustada para ${formatCurrency(amount)}`);
    },
    [addOrUpdateEntry, entries, upsertLoan, showToast]
  );

  /**
   * Marcar como comprado cria a saída paga do dia em Lançamentos, para o valor
   * sair do saldo do mês; desfazer a compra remove essa saída.
   */
  const handleToggleWishlistPurchased = useCallback(
    (item: WishlistItem, purchased: boolean) => {
      const payload = {
        id: item.id,
        name: item.name,
        amount: item.amount,
        url: item.url,
      };

      if (!purchased) {
        if (item.entryId) deleteEntry(item.entryId);
        upsertWishlistItem({
          ...payload,
          purchased: false,
          purchasedAt: undefined,
          entryId: undefined,
        });
        showToast('Compra desfeita');
        return;
      }

      const today = todayLocalISO();
      const entry: Entry = {
        id: randomUUID(),
        name: item.name,
        amount: item.amount,
        dueDate: today,
        isPaid: true,
        paidDate: today,
        type: 'debt',
        createdAt: Date.now(),
        category: WISHLIST_CATEGORY,
      };
      void addOrUpdateEntry(entry, false);
      upsertWishlistItem({
        ...payload,
        purchased: true,
        purchasedAt: today,
        entryId: entry.id,
      });
      showToast(`${item.name} comprado — ${formatCurrency(item.amount)} abatido do saldo`, {
        label: 'Desfazer',
        callback: () => {
          deleteEntry(entry.id);
          upsertWishlistItem({
            ...payload,
            purchased: false,
            purchasedAt: undefined,
            entryId: undefined,
          });
        },
      });
    },
    [addOrUpdateEntry, deleteEntry, upsertWishlistItem, showToast]
  );

  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <PeriodProvider
          currentMonth={currentMonth}
          currentYear={currentYear}
          goToPreviousMonth={goToPreviousMonth}
          goToNextMonth={goToNextMonth}
          goToCurrentMonth={goToCurrentMonth}
        >
          <MainLayout
            isLoading={isLoading}
            isMigrating={isMigrating}
            showOfflineBanner={showOfflineBanner}
            onDismissOffline={() => setShowOfflineBanner(false)}
            saveError={saveError}
            onDismissSaveError={() => setSaveError(null)}
            onRetryOffline={syncEntriesNow}
            onRetrySaveError={() => {
              if (lastSyncAttemptRef.current === 'push') {
                void handleSaveEntriesToCloud();
              } else if (lastSyncAttemptRef.current === 'pull') {
                void handlePullEntriesFromCloud();
              } else {
                setSaveError(null);
              }
            }}
            onExportCSV={() => exportEntriesToCSV(entries)}
            onExportCSVCurrentMonth={() =>
              exportEntriesToCSV(entriesDoMes, { filenameSuffix: '_mes_atual' })
            }
            onNewEntry={handleNewEntryWithStep}
            onSaveEntriesLocal={handleSaveEntriesLocal}
            onSaveEntriesToCloud={entriesSyncAvailable ? handleSaveEntriesToCloud : undefined}
            onPullEntriesFromCloud={entriesSyncAvailable ? handlePullEntriesFromCloud : undefined}
            isSyncingEntries={isSyncing}
            // Com nuvem configurada mas fora do ar (falha real), o app fica no modo
            // local: badge "Local" + botão "Salvar" no dispositivo. Dispensar o banner
            // NÃO religa a nuvem — só um retry bem-sucedido (isCloudUnavailable=false).
            showEntriesCloudSync={entriesSyncAvailable && !isCloudUnavailable}
          >
            <CashFlowSection
              totalEntradasLancadasMes={totalEntradasLancadasMes}
              totalSaidasLancadasMes={totalSaidasLancadasMes}
              saldoMes={saldoMes}
              saldoProjetadoMes={totalEntradasLancadasMes - totalSaidasLancadasMes}
              entradasCountMes={entradasCountMes}
              saidasCountMes={saidasCountMes}
              totalEntradasFinalizadasMes={totalEntradasFinalizadasMes}
              totalEntradasPendentesMes={totalEntradasPendentesMes}
              totalSaidasFinalizadasMes={totalSaidasFinalizadasMes}
              totalSaidasPendentesMes={totalSaidasPendentesMes}
              goals={goals}
              getMetaBalanceForGoal={getMetaBalanceForGoal}
              isLoadingGoals={isLoadingGoals}
              onOpenGoalModal={(goal) => {
                setGoalToEdit(goal ?? null);
                setIsGoalModalOpen(true);
              }}
              onDepositToGoal={(goal) => setMetaMovement({ goal, type: 'deposit' })}
              onWithdrawFromGoal={(goal) => setMetaMovement({ goal, type: 'withdraw' })}
              filter={filter}
              setFilter={setFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              filteredEntries={filteredEntries}
              entriesCount={entriesDoMes.length}
              availableCategories={availableCategories}
              viewMode={viewMode}
              setViewMode={setViewMode}
              entries={entries}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              alerts={visibleAlerts}
              onDismissAlert={handleDismissAlert}
              onAlertAction={handleAlertAction}
              showNewEntryHint={showNewEntryHint}
              showMonthNavHint={showMonthNavHint}
              showReportsHint={showReportsHint}
              onMonthNav={() => completeStep('stepMonthNav')}
              skip={skip}
              onTogglePaid={togglePaid}
              onEdit={handleOpenForm}
              onDeleteRequest={handleDeleteRequest}
              cards={cards}
              cardExpenses={cardExpenses}
              onNewCard={() => {
                setCardToEdit(null);
                setCardModalOpen(true);
              }}
              onEditCard={(card) => {
                setCardToEdit(card);
                setCardModalOpen(true);
              }}
              onAddExpense={(card) => {
                setExpenseToEdit(null);
                setExpenseModalCard(card);
              }}
              onEditExpense={(expense) => {
                const card = cards.find((c) => c.id === expense.cardId);
                if (card) {
                  setExpenseToEdit(expense);
                  setExpenseModalCard(card);
                }
              }}
              onRegisterInvoice={handleRegisterInvoice}
              loans={loans}
              onNewLoan={() => {
                setLoanToEdit(null);
                setLoanModalOpen(true);
              }}
              onEditLoan={(loan) => {
                setLoanToEdit(loan);
                setLoanModalOpen(true);
              }}
              onOpenLoanInstallments={(loan) => setLoanInstallmentsLoan(loan)}
              onSettleLoan={(loan) => setLoanToSettle(loan)}
              onUndoSettlement={handleUndoSettlement}
              wishlistItems={wishlistItems}
              onNewWishlistItem={() => {
                setWishlistToEdit(null);
                setWishlistModalOpen(true);
              }}
              onEditWishlistItem={(item) => {
                setWishlistToEdit(item);
                setWishlistModalOpen(true);
              }}
              onToggleWishlistPurchased={handleToggleWishlistPurchased}
            />
          </MainLayout>
        </PeriodProvider>
      </MotionConfig>

      <Suspense fallback={null}>
        <ModalForm
          isOpen={isFormOpen}
          isEditing={form.editingEntry !== null}
          name={form.name}
          setName={form.setName}
          amount={form.amount}
          setAmount={form.setAmount}
          dueDate={form.dueDate}
          setDueDate={form.setDueDate}
          type={form.type}
          setType={form.setType}
          category={form.category}
          setCategory={form.setCategory}
          tag={form.tag}
          setTag={form.setTag}
          isInstallment={form.isInstallment}
          setIsInstallment={form.setIsInstallment}
          installmentsCount={form.installmentsCount}
          setInstallmentsCount={form.setInstallmentsCount}
          isRecurring={form.isRecurring}
          setIsRecurring={form.setIsRecurring}
          recurrenceCount={form.recurrenceCount}
          setRecurrenceCount={form.setRecurrenceCount}
          formErrors={form.formErrors}
          onClearError={(field) => form.setFormErrors((prev) => ({ ...prev, [field]: false }))}
          availableCategories={availableCategories}
          isPaid={form.editingEntry?.isPaid ?? false}
          paidDate={form.paidDate}
          setPaidDate={form.setPaidDate}
          onSubmit={form.handleSubmit}
          onClose={form.closeForm}
        />
      </Suspense>

      <FloatingActionButton onClick={() => handleOpenForm()} />

      <Suspense fallback={null}>
        {entryToDelete &&
        entryToDelete.isRecurring === true &&
        !entryToDelete.recurrenceTemplateId ? (
          <DeleteRecurringModal
            open={entryToDelete !== null}
            onDeleteThisOnly={() => {
              if (entryToDelete) {
                deleteEntry(entryToDelete.id);
                setEntryToDelete(null);
              }
            }}
            onDeleteThisAndCopies={() => {
              if (entryToDelete) {
                deleteRecurringModel(entryToDelete.id, true);
                setEntryToDelete(null);
              }
            }}
            onClose={() => setEntryToDelete(null)}
          />
        ) : (
          <ConfirmDeleteModal
            open={entryToDelete !== null}
            title="Excluir registro"
            message="Excluir este registro?"
            confirmLabel="Excluir"
            onConfirm={handleConfirmDelete}
            onClose={() => setEntryToDelete(null)}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <ApplyRecurrenceModal
          open={pendingRecurringUpdate !== null}
          onApplyFuture={() => {
            if (pendingRecurringUpdate) {
              addOrUpdateEntry(pendingRecurringUpdate, true);
              showToast('Lançamento salvo');
              setPendingRecurringUpdate(null);
            }
          }}
          onApplyAll={() => {
            if (pendingRecurringUpdate) {
              updateRecurringApplyToAll(pendingRecurringUpdate);
              showToast('Lançamento salvo');
              setPendingRecurringUpdate(null);
            }
          }}
          onClose={() => setPendingRecurringUpdate(null)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <MetaMovementModal
          open={metaMovement !== null}
          type={metaMovement?.type ?? 'deposit'}
          isLoading={metaMovementLoading}
          onConfirm={async (amount, date, isPaid, note) => {
            if (!metaMovement) return;
            const isDeposit = metaMovement.type === 'deposit';
            const entry: Entry = {
              id: randomUUID(),
              name: note || (isDeposit ? 'Depósito na meta' : 'Saque da meta'),
              amount,
              dueDate: date,
              isPaid,
              type: isDeposit ? 'cash' : 'debt',
              createdAt: Date.now(),
              goalId: metaMovement.goal.id,
            };
            setMetaMovementLoading(true);
            try {
              await addOrUpdateEntry(entry, false);
              showToast(isDeposit ? 'Depósito registrado' : 'Saque registrado');
              setMetaMovement(null);
            } finally {
              setMetaMovementLoading(false);
            }
          }}
          onClose={() => setMetaMovement(null)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <GoalModal
          open={isGoalModalOpen}
          goal={goalToEdit}
          onSave={(partial) => {
            upsertGoal({
              ...partial,
              currentAmount: goalToEdit?.currentAmount ?? 0,
            });
            showToast('Meta salva');
          }}
          onRequestDelete={
            goalToEdit
              ? (goal) => {
                  setGoalToDelete(goal);
                  setIsGoalModalOpen(false);
                  setGoalToEdit(null);
                }
              : undefined
          }
          onClose={() => {
            setIsGoalModalOpen(false);
            setGoalToEdit(null);
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ConfirmDeleteModal
          open={goalToDelete !== null}
          title="Excluir meta"
          message={
            linkedGoalEntriesCount > 0
              ? `Esta meta tem ${linkedGoalEntriesCount} ${linkedGoalEntriesCount === 1 ? 'lançamento vinculado' : 'lançamentos vinculados'}, que também ${linkedGoalEntriesCount === 1 ? 'será excluído' : 'serão excluídos'}. Esta ação não pode ser desfeita.`
              : 'Excluir esta meta? Esta ação não pode ser desfeita.'
          }
          confirmLabel="Excluir"
          onConfirm={async () => {
            if (goalToDelete) {
              // Depósitos vinculados são removidos junto com a meta, na mesma transação
              // no banco; localmente só saem depois da confirmação.
              const linkedIds = entries
                .filter((e) => e.goalId === goalToDelete.id)
                .map((e) => e.id);
              const ok = await deleteGoal(goalToDelete.id);
              setGoalToDelete(null);
              if (ok) {
                linkedIds.forEach((id) => deleteEntry(id));
                showToast('Meta excluída');
              } else {
                showToast('Não foi possível excluir a meta. Tente novamente.');
              }
            }
          }}
          onClose={() => setGoalToDelete(null)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LoanModal
          open={loanModalOpen}
          loan={loanToEdit}
          onSave={(partial) => {
            upsertLoan(partial);
            showToast('Empréstimo salvo');
          }}
          onRequestDelete={(loan) => {
            setLoanToDelete(loan);
            setLoanModalOpen(false);
            setLoanToEdit(null);
          }}
          onClose={() => {
            setLoanModalOpen(false);
            setLoanToEdit(null);
          }}
        />
        <ConfirmDeleteModal
          open={loanToDelete !== null}
          title="Excluir empréstimo"
          message="Excluir este empréstimo? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={() => {
            if (loanToDelete) {
              deleteLoan(loanToDelete.id);
              setLoanToDelete(null);
              showToast('Empréstimo excluído');
            }
          }}
          onClose={() => setLoanToDelete(null)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LoanInstallmentsModal
          open={loanInstallmentsLoan !== null}
          loan={loanInstallmentsLoan}
          onTogglePaid={handleToggleLoanInstallmentPaid}
          onChangeDueDate={handleChangeLoanInstallmentDueDate}
          onToggleCancelled={handleToggleLoanInstallmentCancelled}
          onChangeAmount={handleChangeLoanInstallmentAmount}
          onSettleLoan={(loan) => setLoanToSettle(loan)}
          onClose={() => setLoanInstallmentsLoan(null)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LoanSettleModal
          open={loanToSettle !== null}
          loan={loanToSettle}
          onSettle={handleSettleLoan}
          onClose={() => setLoanToSettle(null)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <WishlistModal
          open={wishlistModalOpen}
          item={wishlistToEdit}
          onSave={(partial) => {
            upsertWishlistItem(partial);
            showToast('Item salvo');
          }}
          onRequestDelete={(item) => {
            setWishlistToDelete(item);
            setWishlistModalOpen(false);
            setWishlistToEdit(null);
          }}
          onClose={() => {
            setWishlistModalOpen(false);
            setWishlistToEdit(null);
          }}
        />
        <ConfirmDeleteModal
          open={wishlistToDelete !== null}
          title="Excluir item"
          message="Excluir este item da lista de desejos? Uma compra já registrada continua em Lançamentos."
          confirmLabel="Excluir"
          onConfirm={() => {
            if (wishlistToDelete) {
              deleteWishlistItem(wishlistToDelete.id);
              setWishlistToDelete(null);
              showToast('Item excluído');
            }
          }}
          onClose={() => setWishlistToDelete(null)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <CreditCardModal
          open={cardModalOpen}
          card={cardToEdit}
          onSave={(partial) => {
            upsertCard(partial);
            showToast('Cartão salvo');
          }}
          onRequestDelete={(card) => {
            setCardToDelete(card);
            setCardModalOpen(false);
            setCardToEdit(null);
          }}
          onClose={() => {
            setCardModalOpen(false);
            setCardToEdit(null);
          }}
        />
        <ConfirmDeleteModal
          open={cardToDelete !== null}
          title="Excluir cartão"
          message="Excluir este cartão, todos os seus gastos e as faturas registradas dele?"
          confirmLabel="Excluir"
          onConfirm={() => {
            if (cardToDelete) {
              // Sem o cartão, as faturas ficariam órfãs no fluxo: saem junto com os
              // gastos que as originaram (pagas inclusive, já que o cartão some).
              for (const invoice of findInvoiceEntriesForCard(entries, cardToDelete.id)) {
                deleteEntry(invoice.id);
              }
              deleteCard(cardToDelete.id);
              // O modal avisa "excluir cartão e todos os seus gastos" — remove
              // os gastos também (local e servidor), evitando órfãos.
              deleteExpensesByCard(cardToDelete.id);
              setCardToDelete(null);
              showToast('Cartão excluído');
            }
          }}
          onClose={() => setCardToDelete(null)}
        />
      </Suspense>

      <Suspense fallback={null}>
        {expenseModalCard && (
          <CardExpenseModal
            open={expenseModalCard !== null}
            card={expenseModalCard}
            expense={expenseToEdit}
            onRequestDelete={(expense) => setExpenseToDelete(expense)}
            onSave={(partial) => {
              const onError = () => showToast('Não foi possível salvar o gasto');
              if (expenseToEdit) {
                void updateExpense({
                  ...expenseToEdit,
                  ...partial,
                  id: expenseToEdit.id,
                  createdAt: expenseToEdit.createdAt,
                })
                  .then(() => showToast('Gasto atualizado'))
                  .catch(onError);
              } else {
                // Sem o catch, uma falha de gravação virava unhandled rejection e
                // o usuário não recebia nenhum retorno do que aconteceu.
                void addExpense(partial)
                  .then(() => showToast('Gasto adicionado'))
                  .catch(onError);
              }
            }}
            onClose={() => {
              setExpenseModalCard(null);
              setExpenseToEdit(null);
            }}
          />
        )}
      </Suspense>

      <ConfirmDeleteModal
        open={expenseToDelete !== null}
        title="Excluir gasto"
        message={
          expenseToDelete?.installmentNumber
            ? `Excluir a parcela ${expenseToDelete.installmentNumber} de ${expenseToDelete.installmentsCount} deste gasto? As outras parcelas continuam na fatura e a fatura registrada é atualizada.`
            : 'Excluir este gasto do cartão? A fatura registrada do ciclo é atualizada automaticamente.'
        }
        confirmLabel="Excluir"
        onConfirm={() => {
          if (expenseToDelete) {
            deleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
            showToast('Gasto excluído');
          }
        }}
        onClose={() => setExpenseToDelete(null)}
      />

      <Toast message={toastMessage} action={toastAction} onDismiss={dismissToast} />
    </ErrorBoundary>
  );
}
