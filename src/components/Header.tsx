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
  CloudDownload,
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
  /** Sem nuvem: backup no localStorage */
  onSaveEntriesLocal?: () => void;
  /** Grava alterações locais na tabela do Supabase */
  onSaveEntriesToSupabase?: () => void | Promise<void>;
  /** Atualiza a app com os dados do Supabase (somente leitura do servidor) */
  onPullEntriesFromSupabase?: () => void | Promise<void>;
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
  onSaveEntriesToSupabase,
  onPullEntriesFromSupabase,
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
    <div className="header-bar">
      <div className="flex items-center gap-2 min-w-0">
        <div className="neu-icon-badge-emerald p-2 rounded-lg shrink-0">
          <Wallet className="text-emerald-500 dark:text-emerald-400 w-5 h-5" />
        </div>
        <h1 className="font-semibold text-base sm:text-lg tracking-tight text-slate-900 dark:text-slate-100 truncate">
          Gestão Financeira
        </h1>
      </div>

      <div className="toolbar-row justify-end flex-1 min-w-0">
        <button
          type="button"
          onClick={toggleTheme}
          className="neu-btn-toolbar shrink-0"
          title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <div className="hidden md:flex items-center gap-1 flex-wrap justify-end">
          {showEntriesCloudSync && onSaveEntriesToSupabase && (
            <button
              type="button"
              onClick={() => void onSaveEntriesToSupabase()}
              disabled={isSyncingEntries}
              className="neu-btn-toolbar disabled:opacity-50"
              title="Gravar alterações locais no Supabase"
            >
              <Save size={16} />
              Salvar
            </button>
          )}
          {!showEntriesCloudSync && onSaveEntriesLocal && (
            <button
              type="button"
              onClick={onSaveEntriesLocal}
              disabled={isSyncingEntries}
              className="neu-btn-toolbar disabled:opacity-50"
              title="Salvar lançamentos neste dispositivo"
            >
              <Save size={16} />
              Salvar
            </button>
          )}
          {showEntriesCloudSync && onPullEntriesFromSupabase && (
            <button
              type="button"
              onClick={() => void onPullEntriesFromSupabase()}
              disabled={isSyncingEntries}
              className="neu-btn-toolbar disabled:opacity-50"
              title="Atualizar a lista com os dados do Supabase"
            >
              {isSyncingEntries ? (
                <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />
              ) : (
                <CloudDownload size={16} />
              )}
              Sincronizar
            </button>
          )}
          <button
            type="button"
            onClick={onOpenChangePassword}
            className="neu-btn-toolbar"
            title="Alterar senha"
          >
            <Lock size={16} />
            <span className="hidden xl:inline">Alterar senha</span>
          </button>
          <button
            type="button"
            onClick={onExportCSV}
            className="neu-btn-toolbar"
            title="Exportar todos os lançamentos em CSV"
          >
            <FileDown size={16} />
            CSV
          </button>
          {onExportCSVCurrentMonth && (
            <button
              type="button"
              onClick={onExportCSVCurrentMonth}
              className="neu-btn-toolbar"
              title="Exportar lançamentos do mês atual"
            >
              <FileDown size={16} />
              Mês
            </button>
          )}
        </div>
        <div className="relative md:hidden shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="neu-btn p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="neu-dropdown absolute right-0 top-full mt-0.5 py-0.5 w-44 rounded-xl z-50">
              {showEntriesCloudSync && onSaveEntriesToSupabase && (
                <button
                  type="button"
                  disabled={isSyncingEntries}
                  onClick={() => {
                    void onSaveEntriesToSupabase();
                    setMenuOpen(false);
                  }}
                  className="neu-list-menu-item disabled:opacity-50"
                >
                  <Save size={16} />
                  Salvar
                </button>
              )}
              {!showEntriesCloudSync && onSaveEntriesLocal && (
                <button
                  type="button"
                  disabled={isSyncingEntries}
                  onClick={() => {
                    onSaveEntriesLocal();
                    setMenuOpen(false);
                  }}
                  className="neu-list-menu-item disabled:opacity-50"
                >
                  <Save size={16} />
                  Salvar
                </button>
              )}
              {showEntriesCloudSync && onPullEntriesFromSupabase && (
                <button
                  type="button"
                  disabled={isSyncingEntries}
                  onClick={() => {
                    void onPullEntriesFromSupabase();
                    setMenuOpen(false);
                  }}
                  className="neu-list-menu-item disabled:opacity-50"
                >
                  {isSyncingEntries ? (
                    <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />
                  ) : (
                    <CloudDownload size={16} />
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
                className="neu-list-menu-item"
              >
                <FileDown size={16} />
                Exportar CSV
              </button>
              {onExportCSVCurrentMonth && (
                <button
                  type="button"
                  onClick={() => {
                    onExportCSVCurrentMonth();
                    setMenuOpen(false);
                  }}
                  className="neu-list-menu-item"
                >
                  <FileDown size={16} />
                  Exportar mês
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onOpenChangePassword();
                  setMenuOpen(false);
                }}
                className="neu-list-menu-item"
              >
                <Lock size={16} />
                Alterar senha
              </button>
            </div>
          )}
        </div>
        <div className="relative shrink-0">
          <button onClick={onNewEntry} className="neu-btn-primary btn-action">
            <Plus size={16} />
            <span className="hidden sm:inline">Novo Registro</span>
            <span className="sm:hidden">Novo</span>
          </button>
          {showNewEntryHint && (
            <GuidedTooltip text="Comece criando o seu primeiro lançamento por aqui." />
          )}
        </div>
      </div>
    </div>
  );
}
