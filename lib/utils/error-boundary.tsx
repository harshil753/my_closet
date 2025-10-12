/**
 * React Error Boundary component for graceful error handling
 * Catches JavaScript errors anywhere in the component tree
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundaryError, AppError } from './errors';
import { logger } from './logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: AppError;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error: new ErrorBoundaryError('ErrorBoundary', error),
      errorId: Math.random().toString(36).substr(2, 9),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = new ErrorBoundaryError('ErrorBoundary', error, {
      componentStack: errorInfo.componentStack,
    });

    // Log the error
    logger.error('React Error Boundary caught an error', appError, {
      errorId: this.state.errorId,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }

    // Update state with the error
    this.setState({
      error: appError,
    });
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI or default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-medium text-gray-900">
                Something went wrong
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                We&apos;re sorry, but something unexpected happened. Please try
                refreshing the page.
              </p>
              {this.state.errorId && (
                <p className="mt-2 text-xs text-gray-400">
                  Error ID: {this.state.errorId}
                </p>
              )}
              <div className="mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                >
                  Refresh Page
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

/**
 * Higher-order component for error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook for error handling in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<AppError | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback(
    (error: Error, context?: Record<string, any>) => {
      const appError = new ErrorBoundaryError(
        'useErrorHandler',
        error,
        context
      );
      setError(appError);
      logger.error('Error caught by useErrorHandler', appError);
    },
    []
  );

  React.useEffect(() => {
    if (error) {
      // You can add additional error handling logic here
      logger.error('Error state updated', error);
    }
  }, [error]);

  return {
    error,
    handleError,
    resetError,
  };
}

/**
 * Error fallback component for specific error types
 */
export function ErrorFallback({
  error,
  resetError,
}: {
  error: AppError;
  resetError: () => void;
}) {
  const getErrorMessage = (code: string) => {
    const messages: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again.',
      AUTHENTICATION_ERROR: 'Please sign in to continue.',
      AUTHORIZATION_ERROR: "You don't have permission to perform this action.",
      NOT_FOUND: 'The requested resource was not found.',
      CONFLICT: 'This action conflicts with existing data.',
      RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
      TIER_LIMIT_EXCEEDED:
        "You've reached your plan limit. Consider upgrading your plan.",
      EXTERNAL_SERVICE_ERROR:
        'A service is temporarily unavailable. Please try again.',
      AI_PROCESSING_ERROR: 'AI processing failed. Please try again.',
      FILE_UPLOAD_ERROR:
        'File upload failed. Please check your file and try again.',
      COMPONENT_ERROR:
        'A component error occurred. Please try refreshing the page.',
      INTERNAL_ERROR: 'Something went wrong. Please try again.',
    };

    return messages[code] || 'An unexpected error occurred.';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div className="mt-4 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            {getErrorMessage(error.code)}
          </h3>
          <p className="mt-2 text-sm text-gray-500">{error.message}</p>
          <div className="mt-4 space-x-3">
            <button
              onClick={resetError}
              className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
