import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./hooks/useEntries', () => ({
  useEntries: () => ({
    entries: [],
    filter: 'all',
    setFilter: vi.fn(),
    selectedCategory: 'all',
    setSelectedCategory: vi.fn(),
    currentMonth: 2,
    currentYear: 2025,
    goToPreviousMonth: vi.fn(),
    goToNextMonth: vi.fn(),
    filteredEntries: [],
    totalEntradasLancadas: 0,
    totalSaidasLancadas: 0,
    saldo: 0,
    entradasCount: 0,
    saidasCount: 0,
    isLoading: false,
    isMigrating: false,
    showOfflineBanner: false,
    setShowOfflineBanner: vi.fn(),
    saveError: null,
    setSaveError: vi.fn(),
    addOrUpdateEntry: vi.fn(),
    togglePaid: vi.fn(),
    deleteEntry: vi.fn(),
    updateRecurringApplyToAll: vi.fn(),
    deleteRecurringModel: vi.fn(),
    availableCategories: [],
    refetchEntries: vi.fn(),
    getSaldoForMonth: vi.fn(() => 0),
  }),
}));

vi.mock('./hooks/useGoals', () => ({
  useGoals: () => ({
    currentGoal: null,
    upsertGoal: vi.fn(),
    isLoadingGoals: false,
  }),
}));

vi.mock('./hooks/useAlerts', () => ({
  useAlerts: () => ({ alerts: [] }),
}));

vi.mock('./hooks/useOnboarding', () => ({
  useOnboarding: () => ({
    showNewEntryHint: false,
    showMonthNavHint: false,
    showReportsHint: false,
    completeStep: vi.fn(),
    skip: vi.fn(),
  }),
}));

vi.mock('./hooks/useToast', () => ({
  useToast: () => ({
    toastMessage: null,
    showToast: vi.fn(),
    dismissToast: vi.fn(),
  }),
}));

vi.mock('./components/PasswordGate', () => ({
  PasswordGate: ({ onUnlock }: { onUnlock: () => void }) => (
    <button type="button" onClick={onUnlock}>
      Unlock
    </button>
  ),
}));

describe('App', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('com sessão desbloqueada exibe Fluxo de Caixa', async () => {
    sessionStorage.setItem('gestao-financeira-unlocked', '1');
    render(<App />);
    expect(await screen.findByText(/Fluxo de Caixa/i)).toBeInTheDocument();
  });

  it('sem sessão desbloqueada exibe PasswordGate', () => {
    sessionStorage.removeItem('gestao-financeira-unlocked');
    render(<App />);
    expect(screen.getByRole('button', { name: /unlock/i })).toBeInTheDocument();
  });
});
