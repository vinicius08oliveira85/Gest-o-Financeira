import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CashFlowSection } from './CashFlowSection';
import { PeriodProvider } from '../contexts/PeriodContext';
import type { TabId } from './TabNav';
import type { Entry, FilterType } from '../types';

// Novembro de 2026: todas as contas vencem no mês visível.
const month = 10;
const year = 2026;

function entry(overrides: Partial<Entry> & { id: string; name: string }): Entry {
  return {
    amount: 100,
    dueDate: '2026-11-10',
    isPaid: false,
    type: 'debt',
    createdAt: 1,
    ...overrides,
  };
}

const entries: Entry[] = [
  entry({ id: 'e1', name: 'Feira', category: 'Mercado' }),
  entry({ id: 'e2', name: 'Ônibus', category: 'Transporte' }),
  entry({ id: 'e3', name: 'Padaria', category: 'Mercado' }),
];

const noop = () => {};

/**
 * Reproduz o que o App faz: a categoria selecionada é estado e a lista recebe
 * só os lançamentos dela. Aqui a integração testada é a do Resumo — clique no
 * chip da categoria dentro do lançamento -> lista filtrada.
 */
function ResumoHarness() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<TabId>('lancamentos');
  const filteredEntries =
    selectedCategory === 'all'
      ? entries
      : entries.filter((item) => item.category === selectedCategory);

  return (
    <PeriodProvider
      currentMonth={month}
      currentYear={year}
      goToPreviousMonth={noop}
      goToNextMonth={noop}
      goToCurrentMonth={noop}
    >
      <CashFlowSection
        totalEntradasLancadasMes={0}
        totalSaidasLancadasMes={300}
        saldoMes={-300}
        entradasCountMes={0}
        saidasCountMes={entries.length}
        totalEntradasFinalizadasMes={0}
        totalEntradasPendentesMes={0}
        totalSaidasFinalizadasMes={0}
        totalSaidasPendentesMes={300}
        saldoProjetadoMes={-300}
        goals={[]}
        getMetaBalanceForGoal={() => 0}
        onOpenGoalModal={noop}
        onDepositToGoal={noop}
        onWithdrawFromGoal={noop}
        filter={'all' as FilterType}
        setFilter={noop}
        searchQuery=""
        setSearchQuery={noop}
        sortBy="dueDate"
        setSortBy={noop}
        sortOrder="asc"
        setSortOrder={noop}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        filteredEntries={filteredEntries}
        entriesCount={entries.length}
        availableCategories={['Mercado', 'Transporte']}
        viewMode="list"
        setViewMode={noop}
        entries={entries}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alerts={[]}
        showNewEntryHint={false}
        showMonthNavHint={false}
        showReportsHint={false}
        onMonthNav={noop}
        skip={noop}
        onTogglePaid={noop}
        onEdit={noop}
        onDeleteRequest={noop}
        cards={[]}
        cardExpenses={[]}
        onNewCard={noop}
        onEditCard={noop}
        onAddExpense={noop}
        onEditExpense={noop}
        onRegisterInvoice={noop}
        loans={[]}
        onNewLoan={noop}
        onEditLoan={noop}
        onOpenLoanInstallments={noop}
        onSettleLoan={noop}
        onUndoSettlement={noop}
        wishlistItems={[]}
        onNewWishlistItem={noop}
        onEditWishlistItem={noop}
        onToggleWishlistPurchased={noop}
      />
    </PeriodProvider>
  );
}

/** Chips de categoria: cada lançamento tem o seu, com o mesmo nome da categoria. */
function chipDaCategoria(categoria: string) {
  return screen.getAllByRole('button', { name: categoria })[0];
}

describe('Resumo — chip de categoria filtra a lista', () => {
  it('mostra os lançamentos do mês na aba Lançamentos', () => {
    render(<ResumoHarness />);

    expect(screen.getByText('Feira')).toBeInTheDocument();
    expect(screen.getByText('Ônibus')).toBeInTheDocument();
    expect(screen.getByText('Padaria')).toBeInTheDocument();
    expect(chipDaCategoria('Mercado')).toHaveAttribute('aria-pressed', 'false');
  });

  it('filtra pelo chip e limpa o filtro ao clicar de novo', () => {
    render(<ResumoHarness />);

    fireEvent.click(chipDaCategoria('Mercado'));

    // Só os lançamentos de Mercado continuam na lista.
    expect(screen.getByText('Feira')).toBeInTheDocument();
    expect(screen.getByText('Padaria')).toBeInTheDocument();
    expect(screen.queryByText('Ônibus')).toBeNull();
    expect(chipDaCategoria('Mercado')).toHaveAttribute('aria-pressed', 'true');
    expect(chipDaCategoria('Mercado')).toHaveAttribute('title', 'Remover filtro de categoria');

    fireEvent.click(chipDaCategoria('Mercado'));

    expect(screen.getByText('Ônibus')).toBeInTheDocument();
    expect(chipDaCategoria('Mercado')).toHaveAttribute('aria-pressed', 'false');
  });

  it('filtrar por uma categoria esconde a lista inteira de outra', () => {
    render(<ResumoHarness />);

    fireEvent.click(chipDaCategoria('Transporte'));

    expect(screen.getByText('Ônibus')).toBeInTheDocument();
    expect(screen.queryByText('Feira')).toBeNull();
    expect(screen.queryByText('Padaria')).toBeNull();
    // Com um único lançamento, o chip ativo é o dele.
    expect(screen.getAllByRole('button', { name: 'Transporte' })).toHaveLength(1);
  });
});
