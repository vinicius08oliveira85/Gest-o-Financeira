type BannersProps = {
  showOfflineBanner: boolean;
  onDismissOffline: () => void;
  saveError: string | null;
  onDismissSaveError: () => void;
  onRetryOffline?: () => void;
  onRetrySaveError?: () => void;
};

export function Banners({
  showOfflineBanner,
  onDismissOffline,
  saveError,
  onDismissSaveError,
  onRetryOffline,
  onRetrySaveError,
}: BannersProps) {
  return (
    <>
      {showOfflineBanner && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center justify-between gap-4 max-w-5xl mx-auto">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Conexão com o servidor indisponível. Exibindo dados salvos neste dispositivo.
          </p>
          <div className="flex items-center gap-2">
            {onRetryOffline && (
              <button
                type="button"
                onClick={onRetryOffline}
                className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 font-medium text-sm whitespace-nowrap"
              >
                Tentar novamente
              </button>
            )}
            <button
              type="button"
              onClick={onDismissOffline}
              className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 font-medium text-sm whitespace-nowrap"
            >
              Dispensar
            </button>
          </div>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2.5 flex items-center justify-between gap-4 max-w-5xl mx-auto">
          <p className="text-sm text-red-800 dark:text-red-200">{saveError}</p>
          <div className="flex items-center gap-2">
            {onRetrySaveError && (
              <button
                type="button"
                onClick={onRetrySaveError}
                className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 font-medium text-sm whitespace-nowrap"
              >
                Tentar novamente
              </button>
            )}
            <button
              type="button"
              onClick={onDismissSaveError}
              className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 font-medium text-sm whitespace-nowrap"
            >
              Dispensar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
