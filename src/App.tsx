import { useState } from 'react';
import { useEntries } from './hooks/useEntries';
import { useEntryForm } from './hooks/useEntryForm';
import { useGoals } from './hooks/useGoals';
import { useAlerts } from './hooks/useAlerts';
import { useOnboarding } from './hooks/useOnboarding';
import { exportEntriesToCSV } from './lib/format';
import { ReportsPanel } from './components/ReportsPanel';
import { GoalModal } from './components/GoalModal';
import {
  Header,
  Banners,
  DashboardCards,
  GoalsCard,
  CalendarView,
  AlertsPanel,
  GuidedTooltip,
  FilterBar,
  EntryList,
  ModalForm,
  FloatingActionButton,
  LoadingSkeleton,
  PasswordGate,
  ChangePasswordModal,
} from './components';

const UNLOCK_KEY = 'gestao-financeira-unlocked';

export default function App() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(UNLOCK_KEY) === '1'
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const {
    entries,
    filter,
    setFilter,
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
    showOfflineBanner,
    setShowOfflineBanner,
    saveError,
    setSaveError,
    addOrUpdateEntry,
    togglePaid,
    deleteEntry,
    availableCategories,
  } = useEntries();

  const { currentMonth: monthForGoals, currentYear: yearForGoals } = {
    currentMonth,
    currentYear,
  };
  const {
    currentGoal,
    upsertGoal,
  } = useGoals(monthForGoals, yearForGoals);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  const { alerts } = useAlerts({
    entries,
    month: currentMonth,
    year: currentYear,
  });

  const {
    showNewEntryHint,
    showMonthNavHint,
    showReportsHint,
    completeStep,
    skip,
  } = useOnboarding();

  const form = useEntryForm(
    (entry, isEdit) => addOrUpdateEntry(entry, isEdit),
    () => setIsFormOpen(false)
  );

  const handleOpenForm = (entry?: import('./types').Entry) => {
    form.openForm(entry);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    if (window.confirm('Excluir este registro?')) {
      deleteEntry(id);
    }
  };

  const handleUnlock = () => {
    setUnlocked(true);
    sessionStorage.setItem(UNLOCK_KEY, '1');
  };

  if (!unlocked) {
    return <PasswordGate onUnlock={handleUnlock} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-slate-900 font-sans selection:bg-emerald-100 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-[#F5F5F5]/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
          <Header
            onExportCSV={() => exportEntriesToCSV(entries)}
            onNewEntry={() => {
              handleOpenForm();
              completeStep('stepNewEntry');
            }}
            onOpenChangePassword={() => setShowChangePasswordModal(true)}
            showNewEntryHint={showNewEntryHint}
          />

          <Banners
            showOfflineBanner={showOfflineBanner}
            onDismissOffline={() => setShowOfflineBanner(false)}
            saveError={saveError}
            onDismissSaveError={() => setSaveError(null)}
          />
        </div>
      </header>

      <main className="flex-1">
        {isLoading ? (
          <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10">
            <LoadingSkeleton />
          </div>
        ) : (
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
                  {!showNewEntryHint && !showMonthNavHint && !showReportsHint && (
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

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)] items-start">
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
                      <span className="font-semibold">finalizados</span>. Entradas
                      aumentam seu saldo e saídas diminuem.
                    </p>
                  </div>
                  <GoalsCard
                    goal={currentGoal}
                    monthLabel={new Date(currentYear, currentMonth).toLocaleDateString(
                      'pt-BR',
                      { month: 'long', year: 'numeric' }
                    )}
                    onOpenModal={() => setIsGoalModalOpen(true)}
                  />
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <FilterBar
                      filter={filter}
                      onFilterChange={setFilter}
                      filteredCount={filteredEntries.length}
                      totalCount={entries.length}
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
                      onTogglePaid={togglePaid}
                      onEdit={handleOpenForm}
                      onDeleteRequest={handleDeleteRequest}
                      compact
                    />
                  ) : (
                    <CalendarView
                      entries={filteredEntries}
                      month={currentMonth}
                      year={currentYear}
                    />
                  )}
                </section>
              </div>

              <ReportsPanel
                entries={entries}
                month={currentMonth}
                year={currentYear}
              />

              <AlertsPanel alerts={alerts} />

              {showReportsHint && (
                <div className="mt-2">
                  <GuidedTooltip text="Aqui você encontra um resumo visual do mês: relatórios, metas e alertas." />
                </div>
              )}
            </section>
          </div>
        )}
      </main>

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
        onSubmit={form.handleSubmit}
        onClose={form.closeForm}
      />

      <FloatingActionButton onClick={() => handleOpenForm()} />

      <ChangePasswordModal
        open={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={() => setShowChangePasswordModal(false)}
      />

      {/* Modal de metas */}
      <GoalModal
        open={isGoalModalOpen}
        goal={currentGoal}
        month={currentMonth}
        year={currentYear}
        onSave={(partial) =>
          upsertGoal({
            ...partial,
            currentAmount: currentGoal?.currentAmount ?? 0,
          })
        }
        onClose={() => setIsGoalModalOpen(false)}
      />
    </div>
  );
}
