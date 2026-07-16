import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    if (error.message && (
      error.message.includes('Invalid Refresh Token') ||
      error.message.includes('refresh_token_not_found') ||
      error.message.includes('Refresh Token Not Found')
    )) {
      console.warn('Detected stale auth token error, clearing localStorage');
      try {
        localStorage.clear();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition-all"
            >
              Refresh Page
            </button>
            {this.state.error && (
              <div className="mt-6 text-left">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Error Details:</h3>
                <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-48 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                  {'\n\n'}
                  Stack: {this.state.error.stack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
