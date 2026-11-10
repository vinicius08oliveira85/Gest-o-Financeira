import type { ComponentType } from 'react';
import { LayoutDashboard, ListTodo, BarChart3, Target, CreditCard, Landmark } from 'lucide-react';

export type TabId = 'resumo' | 'lancamentos' | 'relatorios' | 'metas' | 'cartoes' | 'emprestimos';

const TABS: {
  id: TabId;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: 'resumo', label: 'Resumo', icon: LayoutDashboard },
  { id: 'lancamentos', label: 'Lançamentos', icon: ListTodo },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
  { id: 'emprestimos', label: 'Empréstimos', icon: Landmark },
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
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={`flex flex-1 sm:flex-none min-w-0 flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-base font-medium whitespace-nowrap transition-colors ${
            activeTab === id
              ? 'neu-tab-active'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-current={activeTab === id ? 'page' : undefined}
          title={label}
        >
          <Icon size={18} className="shrink-0" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
