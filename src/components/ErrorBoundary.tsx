import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside Admin Panel:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Go to dashboard via hash router to recover
    window.location.hash = '#/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-white p-8 shadow-xl backdrop-blur-md dark:bg-slate-900 dark:border-red-500/10">
            <div className="flex flex-col items-center text-center">
              {/* Error Icon */}
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
                <svg
                  className="h-8 w-8 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>

              <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Ups! Algo correu mal
              </h2>
              
              <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                Ocorreu um erro ao carregar esta secção. O resto do painel continua a funcionar normalmente.
              </p>

              {/* Technical details container */}
              {this.state.error && (
                <div className="mb-6 w-full rounded-lg bg-slate-50 p-4 text-left font-mono text-xs text-red-600 dark:bg-slate-950 dark:text-red-400 border border-slate-100 dark:border-slate-800 max-h-32 overflow-y-auto">
                  <strong>Erro:</strong> {this.state.error.message}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex w-full flex-col gap-3 sm:flex-row justify-center">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-all duration-200"
                >
                  Tentar novamente
                </button>
                <button
                  onClick={() => {
                    window.location.hash = '#/dashboard';
                    window.location.reload();
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
                >
                  Recarregar Painel
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
