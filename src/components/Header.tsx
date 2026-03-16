import { Plus, TrendingDown, Lock, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { GuidedTooltip } from './GuidedTooltip';

type HeaderProps = {
  onExportCSV: () => void;
  onNewEntry: () => void;
  onOpenChangePassword: () => void;
  showNewEntryHint?: boolean;
};

export function Header({
  onExportCSV,
  onNewEntry,
  onOpenChangePassword,
  showNewEntryHint,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <TrendingDown className="text-white w-5 h-5" />
          </div>
          <h1 className="font-semibold text-base sm:text-lg tracking-tight text-slate-900 dark:text-slate-100">
            Gestão Financeira
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 px-3 py-2 rounded-full text-sm font-medium items-center gap-2 transition-colors"
            title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            type="button"
            onClick={onOpenChangePassword}
            className="flex text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 px-3 py-2 rounded-full text-sm font-medium items-center gap-2 transition-colors"
            title="Alterar senha"
          >
            <Lock size={16} />
            <span className="hidden md:inline">Alterar senha</span>
          </button>
          <button
            onClick={onExportCSV}
            className="hidden md:flex text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 px-4 py-2 rounded-full text-sm font-medium items-center gap-2 transition-colors"
          >
            Exportar CSV
          </button>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={onNewEntry}
              className="bg-slate-900 dark:bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors shadow-sm"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Novo Registro</span>
            </button>
            {showNewEntryHint && (
              <GuidedTooltip text="Comece criando o seu primeiro lançamento por aqui." />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
