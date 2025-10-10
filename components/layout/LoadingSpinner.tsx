/**
 * Loading Spinner Component
 * Various loading states and spinners for the application
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * Loading spinner props
 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

/**
 * Loading spinner component
 */
export function LoadingSpinner({ 
  size = 'md', 
  className = '',
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={cn(
          'animate-spin text-blue-600',
          sizeClasses[size]
        )} />
        {text && (
          <p className="text-sm text-gray-600">{text}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Page loading component
 */
export function PageLoading({ 
  text = 'Loading...' 
}: { 
  text?: string; 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="xl" text={text} />
      </div>
    </div>
  );
}

/**
 * Card loading component
 */
export function CardLoading({ 
  className = '' 
}: { 
  className?: string; 
}) {
  return (
    <div className={cn(
      'animate-pulse bg-white rounded-lg border border-gray-200 p-6',
      className
    )}>
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );
}

/**
 * Skeleton loading component
 */
export function Skeleton({ 
  className = '',
  lines = 3 
}: { 
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn('animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-gray-200 rounded',
            i === lines - 1 ? 'w-3/4' : 'w-full',
            i > 0 && 'mt-2'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Image loading component
 */
export function ImageLoading({ 
  className = '' 
}: { 
  className?: string; 
}) {
  return (
    <div className={cn(
      'animate-pulse bg-gray-200 rounded-lg flex items-center justify-center',
      className
    )}>
      <LoadingSpinner size="md" />
    </div>
  );
}

/**
 * Button loading component
 */
export function ButtonLoading({ 
  children,
  loading,
  className = ''
}: { 
  children: React.ReactNode;
  loading: boolean;
  className?: string;
}) {
  return (
    <button
      disabled={loading}
      className={cn(
        'flex items-center justify-center space-x-2',
        loading && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {loading && <LoadingSpinner size="sm" />}
      <span>{children}</span>
    </button>
  );
}

/**
 * Inline loading component
 */
export function InlineLoading({ 
  text = 'Loading...',
  className = ''
}: { 
  text?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center space-x-2 text-sm text-gray-600', className)}>
      <LoadingSpinner size="sm" />
      <span>{text}</span>
    </div>
  );
}

/**
 * Full screen loading overlay
 */
export function LoadingOverlay({ 
  text = 'Loading...',
  show = true 
}: { 
  text?: string;
  show?: boolean;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <div className="text-center">
        <LoadingSpinner size="xl" text={text} />
      </div>
    </div>
  );
}
