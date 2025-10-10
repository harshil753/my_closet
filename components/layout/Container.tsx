/**
 * Container Component
 * Responsive container with consistent spacing and max-width
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Container size variants
 */
type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Container component props
 */
interface ContainerProps {
  children: React.ReactNode;
  size?: ContainerSize;
  className?: string;
  padding?: boolean;
  center?: boolean;
}

/**
 * Container size classes
 */
const sizeClasses: Record<ContainerSize, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none'
};

/**
 * Container component
 */
export function Container({
  children,
  size = 'lg',
  className = '',
  padding = true,
  center = true
}: ContainerProps) {
  return (
    <div className={cn(
      sizeClasses[size],
      padding && 'px-4 sm:px-6 lg:px-8',
      center && 'mx-auto',
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Section container for page sections
 */
export function Section({
  children,
  className = '',
  background = 'white'
}: {
  children: React.ReactNode;
  className?: string;
  background?: 'white' | 'gray' | 'blue';
}) {
  const backgroundClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    blue: 'bg-blue-50'
  };

  return (
    <section className={cn(
      'py-12',
      backgroundClasses[background],
      className
    )}>
      <Container>
        {children}
      </Container>
    </section>
  );
}

/**
 * Grid container for responsive grids
 */
export function Grid({
  children,
  cols = 1,
  gap = 6,
  className = ''
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 4 | 6 | 8;
  className?: string;
}) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    12: 'grid-cols-12'
  };

  const gapClasses = {
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8'
  };

  return (
    <div className={cn(
      'grid',
      gridClasses[cols],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Flex container for flexible layouts
 */
export function Flex({
  children,
  direction = 'row',
  justify = 'start',
  align = 'start',
  wrap = false,
  gap = 4,
  className = ''
}: {
  children: React.ReactNode;
  direction?: 'row' | 'col';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  wrap?: boolean;
  gap?: 2 | 4 | 6 | 8;
  className?: string;
}) {
  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col'
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
  };

  const gapClasses = {
    2: 'gap-2',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8'
  };

  return (
    <div className={cn(
      'flex',
      directionClasses[direction],
      justifyClasses[justify],
      alignClasses[align],
      wrap && 'flex-wrap',
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}
