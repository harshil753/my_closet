/**
 * Loading components for async operations
 * Various loading states and spinners
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'animate-spin rounded-full border-2 border-current border-t-transparent',
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Spinner.displayName = 'Spinner';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, text = 'Loading...', size = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col items-center justify-center space-y-2', className)}
      {...props}
    >
      <Spinner size={size} />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
);
LoadingSpinner.displayName = 'LoadingSpinner';

interface LoadingDotsProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
}

const LoadingDots = React.forwardRef<HTMLDivElement, LoadingDotsProps>(
  ({ className, text = 'Loading', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center space-x-1', className)}
      {...props}
    >
      <span className="text-sm text-muted-foreground">{text}</span>
      <div className="flex space-x-1">
        <div className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.3s]"></div>
        <div className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.15s]"></div>
        <div className="h-1 w-1 animate-bounce rounded-full bg-current"></div>
      </div>
    </div>
  )
);
LoadingDots.displayName = 'LoadingDots';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, width, height, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
      style={{ width, height }}
      {...props}
    />
  )
);
Skeleton.displayName = 'Skeleton';

interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading: boolean;
  text?: string;
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ className, isLoading, text = 'Loading...', children, ...props }, ref) => (
    <div ref={ref} className={cn('relative', className)} {...props}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoadingSpinner text={text} />
        </div>
      )}
    </div>
  )
);
LoadingOverlay.displayName = 'LoadingOverlay';

export {
  Spinner,
  LoadingSpinner,
  LoadingDots,
  Skeleton,
  LoadingOverlay,
};
