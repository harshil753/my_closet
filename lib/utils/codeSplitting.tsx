/**
 * Code splitting utilities for performance optimization
 * Dynamic imports, lazy loading, and bundle optimization
 */

import React, { ComponentType, Suspense } from 'react';
import { createLazyComponent } from './performance';

/**
 * Loading fallback component
 */
const LoadingFallback: React.FC<{ message?: string }> = ({
  message = 'Loading...',
}) => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">{message}</span>
  </div>
);

/**
 * Error boundary for lazy components
 */
class LazyComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || (() => (
        <div className="p-4 text-red-600">
          Failed to load component. Please refresh the page.
        </div>
      ));
      return <FallbackComponent />;
    }

    return this.props.children;
  }
}

/**
 * Create lazy component with error boundary and loading fallback
 */
export function createLazyComponentWithFallback<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options?: {
    fallback?: ComponentType;
    errorFallback?: ComponentType;
    loadingMessage?: string;
  }
) {
  const LazyComponent = createLazyComponent(importFunc);
  
  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <LazyComponentErrorBoundary fallback={options?.errorFallback}>
      <Suspense fallback={<LoadingFallback message={options?.loadingMessage} />}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </LazyComponentErrorBoundary>
  ));
}

/**
 * Route-based code splitting
 */
export const LazyPages = {
  // Auth pages
  Login: createLazyComponentWithFallback(
    () => import('@/app/(auth)/login/page'),
    { loadingMessage: 'Loading login...' }
  ),
  Register: createLazyComponentWithFallback(
    () => import('@/app/(auth)/register/page'),
    { loadingMessage: 'Loading registration...' }
  ),
  
  // Dashboard pages
  Closet: createLazyComponentWithFallback(
    () => import('@/app/(dashboard)/closet/page'),
    { loadingMessage: 'Loading closet...' }
  ),
  Upload: createLazyComponentWithFallback(
    () => import('@/app/(dashboard)/upload/page'),
    { loadingMessage: 'Loading upload...' }
  ),
  TryOn: createLazyComponentWithFallback(
    () => import('@/app/(dashboard)/try-on/page'),
    { loadingMessage: 'Loading try-on...' }
  ),
  Profile: createLazyComponentWithFallback(
    () => import('@/app/(dashboard)/profile/page'),
    { loadingMessage: 'Loading profile...' }
  ),
  
  // Feature components
  ClosetView: createLazyComponentWithFallback(
    () => import('@/components/features/closet/ClosetView'),
    { loadingMessage: 'Loading closet view...' }
  ),
  ClothingUploadForm: createLazyComponentWithFallback(
    () => import('@/components/forms/ClothingUploadForm'),
    { loadingMessage: 'Loading upload form...' }
  ),
  TryOnResult: createLazyComponentWithFallback(
    () => import('@/components/features/try-on/TryOnResult'),
    { loadingMessage: 'Loading try-on result...' }
  ),
};

/**
 * Feature-based code splitting
 */
export const LazyFeatures = {
  // Closet features
  ClothingItemCard: createLazyComponentWithFallback(
    () => import('@/components/features/closet/ClothingItemCard'),
    { loadingMessage: 'Loading item...' }
  ),
  ClothingDetectionModal: createLazyComponentWithFallback(
    () => import('@/components/features/closet/ClothingDetectionModal'),
    { loadingMessage: 'Loading detection...' }
  ),
  
  // Try-on features
  ClothingSelector: createLazyComponentWithFallback(
    () => import('@/components/features/try-on/ClothingSelector'),
    { loadingMessage: 'Loading selector...' }
  ),
  ItemSelector: createLazyComponentWithFallback(
    () => import('@/components/features/try-on/ItemSelector'),
    { loadingMessage: 'Loading items...' }
  ),
  SelectionSummary: createLazyComponentWithFallback(
    () => import('@/components/features/try-on/SelectionSummary'),
    { loadingMessage: 'Loading summary...' }
  ),
};

/**
 * Utility-based code splitting
 */
export const LazyUtils = {
  // Charts and analytics
  AnalyticsDashboard: createLazyComponentWithFallback(
    () => import('@/components/analytics/AnalyticsDashboard'),
    { loadingMessage: 'Loading analytics...' }
  ),
  
  // Admin features
  AdminPanel: createLazyComponentWithFallback(
    () => import('@/components/admin/AdminPanel'),
    { loadingMessage: 'Loading admin panel...' }
  ),
  
  // Help and documentation
  HelpCenter: createLazyComponentWithFallback(
    () => import('@/components/help/HelpCenter'),
    { loadingMessage: 'Loading help...' }
  ),
};

/**
 * Dynamic import with retry logic
 */
export async function dynamicImportWithRetry<T>(
  importFunc: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await importFunc();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Preload components for better performance
 */
export class ComponentPreloader {
  private static preloadedComponents = new Set<string>();
  
  /**
   * Preload a component
   */
  static async preloadComponent(
    name: string,
    importFunc: () => Promise<any>
  ): Promise<void> {
    if (this.preloadedComponents.has(name)) {
      return;
    }
    
    try {
      await importFunc();
      this.preloadedComponents.add(name);
    } catch (error) {
      console.warn(`Failed to preload component ${name}:`, error);
    }
  }
  
  /**
   * Preload multiple components
   */
  static async preloadComponents(
    components: Record<string, () => Promise<any>>
  ): Promise<void> {
    const promises = Object.entries(components).map(([name, importFunc]) =>
      this.preloadComponent(name, importFunc)
    );
    
    await Promise.allSettled(promises);
  }
  
  /**
   * Check if component is preloaded
   */
  static isPreloaded(name: string): boolean {
    return this.preloadedComponents.has(name);
  }
}

/**
 * Bundle analyzer for development
 */
export class BundleAnalyzer {
  private static chunks = new Map<string, number>();
  
  /**
   * Track chunk size
   */
  static trackChunk(name: string, size: number): void {
    this.chunks.set(name, size);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Chunk ${name}: ${Math.round(size / 1024)}KB`);
    }
  }
  
  /**
   * Get bundle analysis
   */
  static getAnalysis(): {
    totalSize: number;
    largestChunks: Array<{ name: string; size: number }>;
    recommendations: string[];
  } {
    const chunks = Array.from(this.chunks.entries())
      .map(([name, size]) => ({ name, size }))
      .sort((a, b) => b.size - a.size);
    
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const largestChunks = chunks.slice(0, 5);
    
    const recommendations: string[] = [];
    
    // Check for large chunks
    chunks.forEach(chunk => {
      if (chunk.size > 250000) { // 250KB
        recommendations.push(
          `Consider splitting ${chunk.name} (${Math.round(chunk.size / 1024)}KB)`
        );
      }
    });
    
    // Check total size
    if (totalSize > 1000000) { // 1MB
      recommendations.push('Total bundle size is large. Consider tree shaking.');
    }
    
    return {
      totalSize,
      largestChunks,
      recommendations,
    };
  }
}

/**
 * Route-based preloading strategy
 */
export class RoutePreloader {
  private static preloadStrategies = new Map<string, () => Promise<any>>();
  
  /**
   * Register preload strategy for a route
   */
  static registerRoute(route: string, preloadFunc: () => Promise<any>): void {
    this.preloadStrategies.set(route, preloadFunc);
  }
  
  /**
   * Preload route components
   */
  static async preloadRoute(route: string): Promise<void> {
    const preloadFunc = this.preloadStrategies.get(route);
    if (preloadFunc) {
      await preloadFunc();
    }
  }
  
  /**
   * Preload routes based on user behavior
   */
  static async preloadBasedOnBehavior(currentRoute: string): Promise<void> {
    const preloadMap: Record<string, string[]> = {
      '/': ['/closet', '/upload'],
      '/closet': ['/try-on', '/upload'],
      '/upload': ['/closet', '/try-on'],
      '/try-on': ['/closet', '/profile'],
    };
    
    const routesToPreload = preloadMap[currentRoute] || [];
    
    await Promise.allSettled(
      routesToPreload.map(route => this.preloadRoute(route))
    );
  }
}
