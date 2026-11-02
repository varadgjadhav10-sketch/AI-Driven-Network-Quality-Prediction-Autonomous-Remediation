import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Unknown runtime error',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render failed:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_#122947,_#071427_42%,_#020712)] px-4 text-slate-100">
        <div className="w-full max-w-2xl rounded-2xl border border-rose-500/35 bg-slate-950/85 p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-rose-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            Runtime Recovery Mode
          </div>
          <h1 className="text-2xl font-semibold text-slate-50">The dashboard failed to render.</h1>
          <p className="mt-2 text-sm text-slate-300">
            This usually happens after a hot reload or stale lazy-loaded chunk. Refresh to recover instantly.
          </p>
          <p className="mt-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3 font-mono text-xs text-slate-300">
            {this.state.message}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ui-btn ui-btn-primary px-4 py-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reload App
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="ui-btn ui-btn-secondary px-4 py-2"
            >
              Go to Landing
            </button>
          </div>
        </div>
      </div>
    );
  }
}
