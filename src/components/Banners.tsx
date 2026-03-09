type BannersProps = {
  showOfflineBanner: boolean;
  onDismissOffline: () => void;
  saveError: string | null;
  onDismissSaveError: () => void;
};

export function Banners({
  showOfflineBanner,
  onDismissOffline,
  saveError,
  onDismissSaveError,
}: BannersProps) {
  return (
    <>
      {showOfflineBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-4 max-w-5xl mx-auto">
          <p className="text-sm text-amber-800">
            Conexão com o servidor indisponível. Exibindo dados salvos neste dispositivo.
          </p>
          <button
            type="button"
            onClick={onDismissOffline}
            className="text-amber-700 hover:text-amber-900 font-medium text-sm whitespace-nowrap"
          >
            Dispensar
          </button>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between gap-4 max-w-5xl mx-auto">
          <p className="text-sm text-red-800">{saveError}</p>
          <button
            type="button"
            onClick={onDismissSaveError}
            className="text-red-700 hover:text-red-900 font-medium text-sm whitespace-nowrap"
          >
            Dispensar
          </button>
        </div>
      )}
    </>
  );
}
