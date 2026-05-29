import type { ComponentType } from 'react';
import { LayoutDashboard, ListTodo, BarChart3, Target, CreditCard } from 'lucide-react';

export type TabId = 'resumo' | 'lancamentos' | 'relatorios' | 'metas' | 'cartoes';

const TABS: {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: 'resumo', label: 'Resumo', shortLabel: 'Resumo', icon: LayoutDashboard },
  { id: 'lancamentos', label: 'Lançamentos', shortLabel: 'Lanç.', icon: ListTodo },
  { id: 'relatorios', label: 'Relatórios', shortLabel: 'Rel.', icon: BarChart3 },
  { id: 'metas', label: 'Metas', shortLabel: 'Metas', icon: Target },
  { id: 'cartoes', label: 'Cartões', shortLabel: 'Cart.', icon: CreditCard },
];

type TabNavProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav
      className="neu-tab-track flex gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl overflow-x-auto"
      aria-label="Navegação principal"
    >
      {TABS.map(({ id, label, shortLabel, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium whitespace-nowrap transition-colors ${
            activeTab === id
              ? 'neu-tab-active'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-current={activeTab === id ? 'page' : undefined}
          title={label}
        >
          <Icon size={16} className="shrink-0 sm:hidden" />
          <Icon size={18} className="shrink-0 hidden sm:block" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{shortLabel}</span>
        </button>
      ))}
    </nav>
  );
}
