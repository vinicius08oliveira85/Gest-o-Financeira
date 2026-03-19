import { LayoutDashboard, ListTodo, BarChart3, Target, CreditCard } from 'lucide-react';

export type TabId = 'resumo' | 'lancamentos' | 'relatorios' | 'metas' | 'cartoes';

const TABS: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: 'resumo', label: 'Resumo', icon: LayoutDashboard },
  { id: 'lancamentos', label: 'Lançamentos', icon: ListTodo },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
];

type TabNavProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav
      className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 overflow-x-auto"
      aria-label="Navegação principal"
    >
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === id
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
          aria-current={activeTab === id ? 'page' : undefined}
        >
          <Icon size={18} className="shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  );
}
