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
  const isError = Boolean(saveError);
  if (!isError && !showOfflineBanner) return null;

  // Offline e falha de gravação são o mesmo problema (não está sincronizando).
  // Duas faixas empilhadas diziam a mesma coisa e comiam a primeira tela.
  const message = isError
    ? saveError!
    : 'Sem conexão com o servidor — exibindo os dados salvos neste dispositivo.';
  const onRetry = isError ? onRetrySaveError : onRetryOffline;
  const tone = isError
    ? {
        box: 'neu-banner-error',
        text: 'text-red-800 dark:text-red-200',
        action: 'text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100',
      }
    : {
        box: 'neu-banner-warn',
        text: 'text-amber-800 dark:text-amber-200',
        action: 'text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100',
      };
  const handleDismiss = () => {
    if (isError) onDismissSaveError();
    if (showOfflineBanner) onDismissOffline();
  };

  return (
    <div className={`${tone.box} rounded-xl banner-row`}>
      <p className={`text-sm ${tone.text}`}>{message}</p>
      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={`${tone.action} font-medium text-sm whitespace-nowrap`}
          >
            Tentar novamente
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className={`${tone.action} font-medium text-xs whitespace-nowrap`}
        >
          Dispensar
        </button>
      </div>
    </div>
  );
}
