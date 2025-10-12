/**
 * Fallback UI Components
 * Provides various fallback states for different scenarios
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Wifi,
  WifiOff,
  Loader2,
  FileX,
  Server,
  UserX,
} from 'lucide-react';

interface FallbackProps {
  onRetry?: () => void;
  onGoHome?: () => void;
  title?: string;
  message?: string;
  showRetry?: boolean;
  showHome?: boolean;
}

/**
 * Network error fallback
 */
export function NetworkErrorFallback({
  onRetry,
  onGoHome,
  title = 'Connection Lost',
  message = 'Please check your internet connection and try again.',
  showRetry = true,
  showHome = true,
}: FallbackProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <WifiOff className="mx-auto mb-4 h-12 w-12 text-orange-500" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mb-6 text-sm text-gray-600">{message}</p>

        <div className="space-y-3">
          {showRetry && onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          {showHome && onGoHome && (
            <Button variant="outline" onClick={onGoHome} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Server error fallback
 */
export function ServerErrorFallback({
  onRetry,
  onGoHome,
  title = 'Server Error',
  message = 'Our servers are experiencing issues. Please try again later.',
  showRetry = true,
  showHome = true,
}: FallbackProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <Server className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mb-6 text-sm text-gray-600">{message}</p>

        <div className="space-y-3">
          {showRetry && onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          {showHome && onGoHome && (
            <Button variant="outline" onClick={onGoHome} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Authentication error fallback
 */
export function AuthErrorFallback({
  onRetry,
  onGoHome,
  title = 'Authentication Required',
  message = 'Please log in to continue.',
  showRetry = false,
  showHome = true,
}: FallbackProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <UserX className="mx-auto mb-4 h-12 w-12 text-blue-500" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mb-6 text-sm text-gray-600">{message}</p>

        <div className="space-y-3">
          {showRetry && onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          {showHome && onGoHome && (
            <Button variant="outline" onClick={onGoHome} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Loading fallback
 */
export function LoadingFallback({
  title = 'Loading...',
  message = 'Please wait while we load your content.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{message}</p>
      </Card>
    </div>
  );
}

/**
 * Empty state fallback
 */
export function EmptyStateFallback({
  title = 'No Data',
  message = "There's nothing to show here yet.",
  actionLabel,
  onAction,
}: {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <FileX className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mb-6 text-sm text-gray-600">{message}</p>

        {actionLabel && onAction && (
          <Button onClick={onAction} className="w-full">
            {actionLabel}
          </Button>
        )}
      </Card>
    </div>
  );
}

/**
 * Generic error fallback
 */
export function GenericErrorFallback({
  onRetry,
  onGoHome,
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  showRetry = true,
  showHome = true,
}: FallbackProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mb-6 text-sm text-gray-600">{message}</p>

        <div className="space-y-3">
          {showRetry && onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          {showHome && onGoHome && (
            <Button variant="outline" onClick={onGoHome} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
