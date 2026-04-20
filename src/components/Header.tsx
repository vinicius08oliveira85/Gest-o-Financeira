import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Wallet,
  Lock,
  Sun,
  Moon,
  MoreVertical,
  FileDown,
  Save,
  CloudUpload,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { GuidedTooltip } from './GuidedTooltip';

type HeaderProps = {
  onExportCSV: () => void;
  /** Exportar apenas lançamentos do mês atual */
  onExportCSVCurrentMonth?: () => void;
  onNewEntry: () => void;
  onOpenChangePassword: () => void;
  showNewEntryHint?: boolean;
  /** Persiste lançamentos no localStorage (manual) */
  onSaveEntriesLocal?: () => void;
  /** Envia estado local ao Supabase e refaz o merge com o servidor */
  onSyncEntriesWithSupabase?: () => void | Promise<void>;
  isSyncingEntries?: boolean;
  showEntriesCloudSync?: boolean;
};

export function Header({
  onExportCSV,
  onExportCSVCurrentMonth,
  onNewEntry,
  onOpenChangePassword,
  showNewEntryHint,
  onSaveEntriesLocal,
  onSyncEntriesWithSupabase,
  isSyncingEntries = false,
  showEntriesCloudSync = false,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <Wallet className="text-white w-5 h-5" />
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
          <div className="hidden md:flex items-center gap-1 flex-wrap justify-end">
            {onSaveEntriesLocal && (
              <button
                type="button"
                onClick={onSaveEntriesLocal}
                disabled={isSyncingEntries}
                className="flex text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 px-3 py-2 rounded-full text-sm font-medium items-center gap-2 transition-colors disabled:opacity-50"
                title="Salvar lançamentos neste dispositivo"
              >
                <Save size={16} />
                Salvar
              </button>
            )}
            {showEntriesCloudSync && onSyncEntriesWithSupabase && (
              <button
                type="button"
                onClick={() => void onSyncEntriesWithSupabase()}
                disabled={isSyncingEntries}
                className="flex text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 px-3 py-2 rounded-full text-sm font-medium items-center gap-2 transition-colors disabled:opacity-50"
                title="Enviar alterações ao Supabase e buscar atualizações"
              >
                {isSyncingEntries ? (
                  <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />
                ) : (
                  <CloudUpload size={16} />
                )}
                Sincronizar
              </button>
            )}
            <button
              type="button"
              onClick={onOpenChangePassword}
              className="flex text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 px-3 py-2 rounded-full text-sm font-medium items-center gap-2 transition-colors"
              title="Alterar senha"
            >
              <Lock size={16} />
              Alterar senha
            </button>
            <button
              type="button"
              onClick={onExportCSV}
              className="flex text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 px-4 py-2 rounded-full text-sm font-medium items-center gap-2 transition-colors"
            >
              Exportar CSV
            </button>
            {onExportCSVCurrentMonth && (
              <button
                type="button"
                onClick={onExportCSVCurrentMonth}
                className="flex text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 px-4 py-2 rounded-full text-sm font-medium items-center gap-2 transition-colors"
              >
                Exportar mês
              </button>
            )}
          </div>
          <div className="relative md:hidden" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical size={20} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 py-1 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-lg z-50">
                {onSaveEntriesLocal && (
                  <button
                    type="button"
                    disabled={isSyncingEntries}
                    onClick={() => {
                      onSaveEntriesLocal();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    <Save size={16} />
                    Salvar local
                  </button>
                )}
                {showEntriesCloudSync && onSyncEntriesWithSupabase && (
                  <button
                    type="button"
                    disabled={isSyncingEntries}
                    onClick={() => {
                      void onSyncEntriesWithSupabase();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    {isSyncingEntries ? (
                      <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />
                    ) : (
                      <CloudUpload size={16} />
                    )}
                    Sincronizar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onExportCSV();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <FileDown size={16} />
                  Exportar CSV (todos)
                </button>
                {onExportCSVCurrentMonth && (
                  <button
                    type="button"
                    onClick={() => {
                      onExportCSVCurrentMonth();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <FileDown size={16} />
                    Exportar mês atual
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onOpenChangePassword();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Lock size={16} />
                  Alterar senha
                </button>
              </div>
            )}
          </div>
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
