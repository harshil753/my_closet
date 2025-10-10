/**
 * Page Header Component
 * Consistent page headers with title, description, and actions
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

/**
 * Breadcrumb item interface
 */
interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Page header props
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Page header component
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className = '',
  size = 'md',
}: PageHeaderProps) {
  const sizeClasses = {
    sm: 'py-4',
    md: 'py-6',
    lg: 'py-8',
  };

  const titleSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  return (
    <div
      className={cn(
        'border-b border-gray-200 bg-white',
        sizeClasses[size],
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-4">
            <Breadcrumb items={breadcrumbs} />
          </div>
        )}

        {/* Header Content */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className={cn('font-bold text-gray-900', titleSizes[size])}>
              {title}
            </h1>

            {description && (
              <p
                className={cn(
                  'mt-2 text-gray-600',
                  size === 'sm' ? 'text-sm' : 'text-base'
                )}
              >
                {description}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * Section header for subsections
 */
export function SectionHeader({
  title,
  description,
  actions,
  className = '',
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>

        {actions && <div className="ml-4">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * Card header for cards and panels
 */
export function CardHeader({
  title,
  description,
  actions,
  className = '',
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border-b border-gray-200 px-6 py-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>

        {actions && <div className="ml-4">{actions}</div>}
      </div>
    </div>
  );
}
