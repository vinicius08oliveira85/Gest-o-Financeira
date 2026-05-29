import type { ReactNode } from 'react';
import { Header } from './Header';
import { Banners } from './Banners';
import { LoadingSkeleton } from './LoadingSkeleton';

type MainLayoutProps = {
  isLoading: boolean;
  isMigrating?: boolean;
  showOfflineBanner: boolean;
  onDismissOffline: () => void;
  saveError: string | null;
  onDismissSaveError: () => void;
  onRetryOffline?: () => void;
  onRetrySaveError?: () => void;
  onExportCSV: () => void;
  onExportCSVCurrentMonth?: () => void;
  onNewEntry: () => void;
  onOpenChangePassword: () => void;
  /** Sem Supabase: backup no dispositivo */
  onSaveEntriesLocal?: () => void;
  /** Com Supabase: gravar alterações locais no servidor */
  onSaveEntriesToSupabase?: () => void | Promise<void>;
  /** Com Supabase: buscar estado do servidor (sem enviar delta) */
  onPullEntriesFromSupabase?: () => void | Promise<void>;
  isSyncingEntries?: boolean;
  showEntriesCloudSync?: boolean;
  children: ReactNode;
};

export function MainLayout({
  isLoading,
  isMigrating = false,
  showOfflineBanner,
  onDismissOffline,
  saveError,
  onDismissSaveError,
  onRetryOffline,
  onRetrySaveError,
  onExportCSV,
  onExportCSVCurrentMonth,
  onNewEntry,
  onOpenChangePassword,
  onSaveEntriesLocal,
  onSaveEntriesToSupabase,
  onPullEntriesFromSupabase,
  isSyncingEntries,
  showEntriesCloudSync,
  children,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen neu-bg text-slate-800 dark:text-slate-100 font-sans selection:bg-emerald-100 dark:selection:bg-emerald-900/40 flex flex-col">
      <header className="sticky top-0 z-40 neu-header">
        <div className="app-container header-shell">
          <Header
            onExportCSV={onExportCSV}
            onExportCSVCurrentMonth={onExportCSVCurrentMonth}
            onNewEntry={onNewEntry}
            onOpenChangePassword={onOpenChangePassword}
            onSaveEntriesLocal={onSaveEntriesLocal}
            onSaveEntriesToSupabase={onSaveEntriesToSupabase}
            onPullEntriesFromSupabase={onPullEntriesFromSupabase}
            isSyncingEntries={isSyncingEntries}
            showEntriesCloudSync={showEntriesCloudSync}
          />
          <Banners
            showOfflineBanner={showOfflineBanner}
            onDismissOffline={onDismissOffline}
            saveError={saveError}
            onDismissSaveError={onDismissSaveError}
            onRetryOffline={onRetryOffline}
            onRetrySaveError={onRetrySaveError}
          />
          {isMigrating && (
            <div className="neu-banner rounded-lg px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300">
              Migrando dados para o servidor...
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        {isLoading ? (
          <div className="app-container page-stack">
            <LoadingSkeleton />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
