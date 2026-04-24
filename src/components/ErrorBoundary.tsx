import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0d0d0d] text-white p-8 space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold">程序异常已恢复</h1>
          <p className="text-zinc-500 text-sm max-w-md text-center">
             由于 API 连接波动或其他未知错误，页面触发了自动保护。请尝试刷新。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition-colors"
          >
            刷新页面
          </button>
          {this.state.error && (
            <pre className="text-[10px] text-zinc-700 bg-black/30 p-4 rounded mt-8 max-w-full overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
