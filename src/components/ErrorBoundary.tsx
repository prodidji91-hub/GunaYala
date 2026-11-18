import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[Application ErrorBoundary] Uncaught UI error:', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F2] text-[#173D36] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E2D2BB] rounded-2xl p-8 text-center shadow-lg space-y-4">
            <h1 className="text-2xl font-serif font-semibold text-[#173D36]">
              Something went wrong
            </h1>
            <p className="text-sm text-[#4A5568] leading-relaxed">
              We encountered an unexpected display error. Please reload the page or contact our team on WhatsApp at +507 6444-3649 for assistance.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3 px-6 rounded-xl bg-[#173D36] hover:bg-[#1f5047] text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
