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
  onNewEntry: () => void;
  onOpenChangePassword: () => void;
  showNewEntryHint?: boolean;
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
  onNewEntry,
  onOpenChangePassword,
  showNewEntryHint,
  children,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F5F5F5] text-slate-900 font-sans selection:bg-emerald-100 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-[#F5F5F5]/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
          <Header
            onExportCSV={onExportCSV}
            onNewEntry={onNewEntry}
            onOpenChangePassword={onOpenChangePassword}
            showNewEntryHint={showNewEntryHint}
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
            <div className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-2 text-sm text-slate-600">
              Migrando dados para o servidor...
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        {isLoading ? (
          <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10">
            <LoadingSkeleton />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
