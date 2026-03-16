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
  }

  handleRetry = (): void => {
    (this as ErrorBoundaryComponent).setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Algo deu errado</h1>
            <p className="text-slate-600 text-sm mb-6">
              Ocorreu um erro inesperado. Você pode tentar novamente ou recarregar a página.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="w-full py-3 px-4 rounded-xl font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors"
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
