import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Wallet,
  Sun,
  Moon,
  MoreVertical,
  FileDown,
  Save,
  Cloud,
  CloudDownload,
  CloudOff,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

type HeaderProps = {
  onExportCSV: () => void;
  /** Exportar apenas lançamentos do mês atual */
  onExportCSVCurrentMonth?: () => void;
  onNewEntry: () => void;
  /** Sem nuvem: backup no localStorage */
  onSaveEntriesLocal?: () => void;
  /** Grava alterações locais na tabela do Appwrite */
  onSaveEntriesToCloud?: () => void | Promise<void>;
  /** Atualiza a app com os dados do Appwrite (somente leitura do servidor) */
  onPullEntriesFromCloud?: () => void | Promise<void>;
  isSyncingEntries?: boolean;
  showEntriesCloudSync?: boolean;
};

export function Header({
  onExportCSV,
  onExportCSVCurrentMonth,
  onNewEntry,
  onSaveEntriesLocal,
  onSaveEntriesToCloud,
  onPullEntriesFromCloud,
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="header-bar">
      <div className="flex items-center gap-2 min-w-0">
        <div className="neu-icon-badge-emerald p-2 rounded-lg shrink-0">
          <Wallet className="text-emerald-500 dark:text-emerald-400 w-5 h-5" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="font-semibold text-base sm:text-lg tracking-tight text-slate-900 dark:text-slate-100 truncate">
            Gestão Financeira
          </h1>
          {/* Escondido no celular: com ele a barra de ações quebrava para uma
              segunda linha e o cabeçalho fixo comia metade da tela. */}
          {!showEntriesCloudSync && (
            <span
              className="neu-inset hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap shrink-0"
              title="Sem nuvem — os dados são salvos apenas neste dispositivo"
            >
              <CloudOff size={11} aria-hidden />
              Local
            </span>
          )}
          {showEntriesCloudSync && (
            <span
              className="neu-inset hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium text-emerald-700 dark:text-emerald-300 whitespace-nowrap shrink-0"
              title={
                isSyncingEntries
                  ? 'Gravando alterações no Appwrite…'
                  : 'Dados salvos no Appwrite e disponíveis em qualquer dispositivo'
              }
              aria-live="polite"
            >
              {isSyncingEntries ? (
                <Loader2 size={11} className="animate-spin" aria-hidden />
              ) : (
                <Cloud size={11} aria-hidden />
              )}
              {isSyncingEntries ? 'Salvando' : 'Nuvem'}
            </span>
          )}
        </div>
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
          {showEntriesCloudSync && onSaveEntriesToCloud && (
            <button
              type="button"
              onClick={() => void onSaveEntriesToCloud()}
              disabled={isSyncingEntries}
              className="neu-btn-toolbar disabled:opacity-50"
              title="Gravar alterações locais no Appwrite"
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
          {showEntriesCloudSync && onPullEntriesFromCloud && (
            <button
              type="button"
              onClick={() => void onPullEntriesFromCloud()}
              disabled={isSyncingEntries}
              className="neu-btn-toolbar disabled:opacity-50"
              title="Atualizar a lista com os dados do Appwrite"
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
            className="neu-btn p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="neu-dropdown absolute right-0 top-full mt-0.5 py-0.5 w-44 rounded-xl z-50">
              {showEntriesCloudSync && onSaveEntriesToCloud && (
                <button
                  type="button"
                  disabled={isSyncingEntries}
                  onClick={() => {
                    void onSaveEntriesToCloud();
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
              {showEntriesCloudSync && onPullEntriesFromCloud && (
                <button
                  type="button"
                  disabled={isSyncingEntries}
                  onClick={() => {
                    void onPullEntriesFromCloud();
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
            </div>
          )}
        </div>
        <div className="shrink-0">
          <button onClick={onNewEntry} className="neu-btn-primary btn-action">
            <Plus size={16} />
            <span className="hidden sm:inline">Novo Registro</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
