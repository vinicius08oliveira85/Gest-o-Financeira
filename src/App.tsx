import { useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { MotionConfig } from 'motion/react';
import { useEntries } from './hooks/useEntries';
import { useEntryForm } from './hooks/useEntryForm';
import { useGoals } from './hooks/useGoals';
import { useCreditCards } from './hooks/useCreditCards';
import { useCardExpenses } from './hooks/useCardExpenses';
import { useAlerts, type Alert } from './hooks/useAlerts';
import { useOnboarding } from './hooks/useOnboarding';
import { useToast } from './hooks/useToast';
import { exportEntriesToCSV } from './lib/format';
import { buildInvoiceEntry, findInvoiceEntryForCycle } from './lib/cardInvoice';
import { randomUUID } from './lib/uuid';
import { UNLOCK_KEY, DISMISSED_ALERTS_KEY } from './constants';
import type { CardExpense, CreditCard, Entry, Goal } from './types';
import type { TabId } from './components/TabNav';
import { PeriodProvider } from './contexts/PeriodContext';
import {
  MainLayout,
  CashFlowSection,
  FloatingActionButton,
  PasswordGate,
  ErrorBoundary,
  Toast,
} from './components';

const ChangePasswordModal = lazy(() =>
  import('./components/ChangePasswordModal').then((m) => ({ default: m.ChangePasswordModal }))
);
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

const ModalForm = lazy(() =>
  import('./components/ModalForm').then((m) => ({ default: m.ModalForm }))
);

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(UNLOCK_KEY) === '1');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
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
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);

  const { cards, upsertCard, deleteCard } = useCreditCards();
  const {
    expenses: cardExpenses,
    addExpense,
    updateExpense,
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
    refetchEntries,
    getMetaBalanceForGoal,
    saveEntriesLocal,
    pushEntriesToSupabase,
    pullEntriesFromSupabase,
    isSyncing,
    entriesSyncAvailable,
  } = useEntries();

  const { goals, upsertGoal, deleteGoal, isLoadingGoals } = useGoals();
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const { toastMessage, toastAction, showToast, dismissToast } = useToast();
  const { alerts } = useAlerts({
    entries,
    month: currentMonth,
    year: currentYear,
    goals,
    cards,
    cardExpenses,
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
      } catch {
        // ignore
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

  const handleUnlock = useCallback(() => {
    setUnlocked(true);
    sessionStorage.setItem(UNLOCK_KEY, '1');
  }, []);

  const handleSaveEntriesLocal = useCallback(() => {
    saveEntriesLocal();
    showToast('Dados salvos localmente');
  }, [saveEntriesLocal, showToast]);

  // Última ação de sync que falhou, para o "Tentar novamente" do banner refazê-la.
  const lastSyncAttemptRef = useRef<'push' | 'pull' | null>(null);

  const handleSaveEntriesToSupabase = useCallback(async () => {
    lastSyncAttemptRef.current = 'push';
    try {
      await pushEntriesToSupabase();
      showToast('Dados gravados no Supabase');
    } catch {
      // Erro também aparece em saveError / banner
    }
  }, [pushEntriesToSupabase, showToast]);

  const handlePullEntriesFromSupabase = useCallback(async () => {
    lastSyncAttemptRef.current = 'pull';
    try {
      await pullEntriesFromSupabase();
      showToast('Dados atualizados do Supabase');
    } catch {
      // Erro também aparece em saveError / banner
    }
  }, [pullEntriesFromSupabase, showToast]);

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
      // Re-registrar a fatura não pode zerar o status de pagamento já registrado.
      addOrUpdateEntry(
        { ...entry, isPaid: existing?.isPaid ?? false, paidDate: existing?.paidDate },
        existing != null
      );
      showToast('Fatura registrada no fluxo de caixa');
    },
    [entries, addOrUpdateEntry, showToast]
  );

  if (!unlocked) {
    return <PasswordGate onUnlock={handleUnlock} />;
  }

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
            onRetryOffline={refetchEntries}
            onRetrySaveError={() => {
              if (lastSyncAttemptRef.current === 'push') {
                void handleSaveEntriesToSupabase();
              } else if (lastSyncAttemptRef.current === 'pull') {
                void handlePullEntriesFromSupabase();
              } else {
                setSaveError(null);
              }
            }}
            onExportCSV={() => exportEntriesToCSV(entries)}
            onExportCSVCurrentMonth={() =>
              exportEntriesToCSV(entriesDoMes, { filenameSuffix: '_mes_atual' })
            }
            onNewEntry={handleNewEntryWithStep}
            onOpenChangePassword={() => setShowChangePasswordModal(true)}
            onSaveEntriesLocal={handleSaveEntriesLocal}
            onSaveEntriesToSupabase={entriesSyncAvailable ? handleSaveEntriesToSupabase : undefined}
            onPullEntriesFromSupabase={
              entriesSyncAvailable ? handlePullEntriesFromSupabase : undefined
            }
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
        <ChangePasswordModal
          open={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
          onSuccess={() => setShowChangePasswordModal(false)}
        />
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
          message="Excluir esta meta? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={() => {
            if (goalToDelete) {
              deleteGoal(goalToDelete.id);
              setGoalToDelete(null);
              showToast('Meta excluída');
            }
          }}
          onClose={() => setGoalToDelete(null)}
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
          message="Excluir este cartão e todos os seus gastos?"
          confirmLabel="Excluir"
          onConfirm={() => {
            if (cardToDelete) {
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
            onSave={(partial) => {
              if (expenseToEdit) {
                updateExpense({
                  ...expenseToEdit,
                  ...partial,
                  id: expenseToEdit.id,
                  createdAt: expenseToEdit.createdAt,
                });
                showToast('Gasto atualizado');
              } else {
                addExpense(partial);
              }
            }}
            onClose={() => {
              setExpenseModalCard(null);
              setExpenseToEdit(null);
            }}
          />
        )}
      </Suspense>

      <Toast message={toastMessage} action={toastAction} onDismiss={dismissToast} />
    </ErrorBoundary>
  );
}
