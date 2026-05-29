import { Component, type ReactNode, type ErrorInfo } from 'react';

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryComponent = Component<ErrorBoundaryProps, ErrorBoundaryState>;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
    // Recarrega automaticamente quando um chunk desatualizado falha ao ser carregado
    if (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed') ||
      error.name === 'ChunkLoadError'
    ) {
      window.location.reload();
    }
  }

  handleRetry = (): void => {
    (this as ErrorBoundaryComponent).setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen neu-bg flex items-center justify-center p-[var(--page-px)]">
          <div className="w-full max-w-[min(100%,28rem)] neu-surface-lg rounded-2xl card-pad text-center">
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Algo deu errado</h1>
            <p className="text-slate-600 text-sm mb-6">
              Ocorreu um erro inesperado. Você pode tentar novamente ou recarregar a página.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="w-full neu-btn-primary py-3 px-4 rounded-xl font-medium"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return (this as ErrorBoundaryComponent).props.children;
  }
}
