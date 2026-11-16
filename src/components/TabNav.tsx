import type { ComponentType } from 'react';
import { LayoutDashboard, ListTodo, BarChart3, Target, CreditCard, Landmark, Gift } from './icons';

export type TabId =
  | 'resumo'
  | 'lancamentos'
  | 'relatorios'
  | 'metas'
  | 'cartoes'
  | 'emprestimos'
  | 'desejos';

const TABS: {
  id: TabId;
  label: string;
  /** Rótulo curto usado no celular, onde não cabe o nome completo. */
  shortLabel: string;
  icon: ComponentType<{ size?: number; className?: string; filled?: boolean }>;
}[] = [
  { id: 'resumo', label: 'Resumo', shortLabel: 'Resumo', icon: LayoutDashboard },
  { id: 'lancamentos', label: 'Lançamentos', shortLabel: 'Lançar', icon: ListTodo },
  { id: 'relatorios', label: 'Relatórios', shortLabel: 'Relatos', icon: BarChart3 },
  { id: 'metas', label: 'Metas', shortLabel: 'Metas', icon: Target },
  { id: 'cartoes', label: 'Cartões', shortLabel: 'Cartões', icon: CreditCard },
  { id: 'emprestimos', label: 'Empréstimos', shortLabel: 'Emprést.', icon: Landmark },
  { id: 'desejos', label: 'Desejos', shortLabel: 'Desejos', icon: Gift },
];

type TabNavProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    // Todas as abas precisam caber na largura da tela: com rolagem horizontal a
    // última (Cartões) ficava fora da vista sem nenhuma indicação.
    <nav
      className="neu-tab-track flex gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl"
      aria-label="Navegação principal"
    >
      {TABS.map(({ id, label, shortLabel, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={`flex flex-1 sm:flex-none min-w-0 flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-0.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[9px] sm:text-base font-medium whitespace-nowrap transition-colors ${
            activeTab === id
              ? 'neu-tab-active'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-current={activeTab === id ? 'page' : undefined}
          aria-label={label}
          title={label}
        >
          {/* Aba ativa usa a variante Filled do Fluent, como no Windows 12. */}
          <Icon size={18} className="shrink-0" filled={activeTab === id} />
          {/* Rótulo sempre visível: só com ícones, sete abas viram adivinhação.
              No celular usa 9px (cabe "Empréstimos" em 64px). */}
          <span className="block w-full truncate text-center leading-none sm:hidden">
            {shortLabel}
          </span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </nav>
  );
}
