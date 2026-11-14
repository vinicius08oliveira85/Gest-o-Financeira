import { Calendar, ListOrdered } from './icons';

export type ViewMode = 'list' | 'calendar';

type ViewModeToggleProps = {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
};

const OPTIONS: { value: ViewMode; label: string; icon: typeof ListOrdered }[] = [
  { value: 'list', label: 'Lista', icon: ListOrdered },
  { value: 'calendar', label: 'Calendário', icon: Calendar },
];

/**
 * Alterna entre lista e calendário no Resumo. A visão ativa usa a variante
 * Filled do ícone Fluent, como os filtros e as abas.
 */
export function ViewModeToggle({ viewMode, onChange }: ViewModeToggleProps) {
  return (
    <div className="neu-inset flex rounded-full p-1 text-xs">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = viewMode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-medium ${
              active
                ? 'neu-filter-active'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Icon size={14} filled={active} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
