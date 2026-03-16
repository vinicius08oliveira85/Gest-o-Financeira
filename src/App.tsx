import { useState, useCallback, lazy, Suspense } from 'react';
import { useEntries } from './hooks/useEntries';
import { useEntryForm } from './hooks/useEntryForm';
import { useGoals } from './hooks/useGoals';
import { useAlerts } from './hooks/useAlerts';
import { useOnboarding } from './hooks/useOnboarding';
import { useToast } from './hooks/useToast';
import { exportEntriesToCSV } from './lib/format';
import { UNLOCK_KEY } from './constants';
import type { Entry, Goal } from './types';
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

const ModalForm = lazy(() =>
  import('./components/ModalForm').then((m) => ({ default: m.ModalForm }))
);

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(UNLOCK_KEY) === '1');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [pendingRecurringUpdate, setPendingRecurringUpdate] = useState<Entry | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [metaMovement, setMetaMovement] = useState<{
    goal: Goal;
    type: 'deposit' | 'withdraw';
  } | null>(null);
  const [metaMovementLoading, setMetaMovementLoading] = useState(false);

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
    filteredEntries,
    totalEntradasLancadas,
    totalSaidasLancadas,
    saldo,
    entradasCount,
    saidasCount,
    isLoading,
    isMigrating,
    showOfflineBanner,
    setShowOfflineBanner,
    saveError,
    setSaveError,
    addOrUpdateEntry,
    togglePaid,
    pendingPaidId,
    deleteEntry,
    updateRecurringApplyToAll,
    deleteRecurringModel,
    availableCategories,
    refetchEntries,
    getSaldoForMonth,
    getMetaBalanceForGoal,
  } = useEntries();

  const { currentGoals, upsertGoal, deleteGoal, isLoadingGoals } = useGoals(
    currentMonth,
    currentYear
  );
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const { toastMessage, showToast, dismissToast } = useToast();
  const { alerts } = useAlerts({
    entries,
    month: currentMonth,
    year: currentYear,
    goals: currentGoals,
  });
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
      deleteEntry(entryToDelete.id);
      setEntryToDelete(null);
    }
  }, [entryToDelete, deleteEntry]);

  const handleUnlock = useCallback(() => {
    setUnlocked(true);
    sessionStorage.setItem(UNLOCK_KEY, '1');
  }, []);

  if (!unlocked) {
    return <PasswordGate onUnlock={handleUnlock} />;
  }

  return (
    <ErrorBoundary>
      <PeriodProvider
        currentMonth={currentMonth}
        currentYear={currentYear}
        goToPreviousMonth={goToPreviousMonth}
        goToNextMonth={goToNextMonth}
      >
        <MainLayout
          isLoading={isLoading}
          isMigrating={isMigrating}
          showOfflineBanner={showOfflineBanner}
          onDismissOffline={() => setShowOfflineBanner(false)}
          saveError={saveError}
          onDismissSaveError={() => setSaveError(null)}
          onRetryOffline={refetchEntries}
          onRetrySaveError={() => setSaveError(null)}
          onExportCSV={() => exportEntriesToCSV(entries)}
          onNewEntry={handleNewEntryWithStep}
          onOpenChangePassword={() => setShowChangePasswordModal(true)}
          showNewEntryHint={showNewEntryHint}
        >
          <CashFlowSection
            totalEntradasLancadas={totalEntradasLancadas}
            totalSaidasLancadas={totalSaidasLancadas}
            saldo={saldo}
            entradasCount={entradasCount}
            saidasCount={saidasCount}
            currentGoals={currentGoals}
            getSaldoForMonth={getSaldoForMonth}
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
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            filteredEntries={filteredEntries}
            entriesCount={entries.length}
            availableCategories={availableCategories}
            viewMode={viewMode}
            setViewMode={setViewMode}
            entries={entries}
            alerts={alerts}
            showNewEntryHint={showNewEntryHint}
            showMonthNavHint={showMonthNavHint}
            showReportsHint={showReportsHint}
            skip={skip}
            onTogglePaid={togglePaid}
            pendingPaidId={pendingPaidId}
            onEdit={handleOpenForm}
            onDeleteRequest={handleDeleteRequest}
          />
        </MainLayout>
      </PeriodProvider>

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
          onConfirm={async (amount, note) => {
            if (!metaMovement) return;
            const today = new Date().toISOString().slice(0, 10);
            const isDeposit = metaMovement.type === 'deposit';
            const entry: Entry = {
              id: crypto.randomUUID(),
              name: note || (isDeposit ? 'Depósito na meta' : 'Saque da meta'),
              amount,
              dueDate: today,
              isPaid: true,
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
          month={currentMonth}
          year={currentYear}
          onSave={(partial) => {
            upsertGoal({
              ...partial,
              currentAmount: goalToEdit?.currentAmount ?? 0,
            });
            showToast('Meta salva');
          }}
          onDelete={
            goalToEdit
              ? (id) => {
                  deleteGoal(id);
                  setIsGoalModalOpen(false);
                  setGoalToEdit(null);
                  showToast('Meta excluída');
                }
              : undefined
          }
          onClose={() => {
            setIsGoalModalOpen(false);
            setGoalToEdit(null);
          }}
        />
      </Suspense>

      <Toast message={toastMessage} onDismiss={dismissToast} />
    </ErrorBoundary>
  );
}
