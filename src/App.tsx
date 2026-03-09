import { useState } from 'react';
import { useEntries } from './hooks/useEntries';
import { useEntryForm } from './hooks/useEntryForm';
import { exportEntriesToCSV } from './lib/format';
import {
  Header,
  Banners,
  DashboardCards,
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

  const {
    entries,
    filter,
    setFilter,
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
  } = useEntries();

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
    <div className="min-h-screen bg-[#F5F5F5] text-slate-900 font-sans selection:bg-emerald-100">
      <Header
        onExportCSV={() => exportEntriesToCSV(entries)}
        onNewEntry={() => handleOpenForm()}
        onOpenChangePassword={() => setShowChangePasswordModal(true)}
      />

      <Banners
        showOfflineBanner={showOfflineBanner}
        onDismissOffline={() => setShowOfflineBanner(false)}
        saveError={saveError}
        onDismissSaveError={() => setSaveError(null)}
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <main className="max-w-5xl mx-auto px-4 py-8">
          <DashboardCards
            totalEntradasLancadas={totalEntradasLancadas}
            totalSaidasLancadas={totalSaidasLancadas}
            saldo={saldo}
            entradasCount={entradasCount}
            saidasCount={saidasCount}
          />

          <FilterBar
            filter={filter}
            onFilterChange={setFilter}
            filteredCount={filteredEntries.length}
            totalCount={entries.length}
          />

          <EntryList
            entries={filteredEntries}
            onTogglePaid={togglePaid}
            onEdit={handleOpenForm}
            onDeleteRequest={handleDeleteRequest}
          />
        </main>
      )}

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
        onSubmit={form.handleSubmit}
        onClose={form.closeForm}
      />

      <FloatingActionButton onClick={() => handleOpenForm()} />

      <ChangePasswordModal
        open={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={() => setShowChangePasswordModal(false)}
      />
    </div>
  );
}
