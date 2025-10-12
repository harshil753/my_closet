/**
 * Performance optimization utilities
 * Image lazy loading, code splitting, and performance monitoring
 */

import { useEffect, useRef, useState } from 'react';

/**
 * Image lazy loading hook
 */
export function useLazyImage(src: string, options?: IntersectionObserverInit) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setImageSrc(src);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, options]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setIsLoaded(false);
  };

  return {
    imgRef,
    imageSrc,
    isLoaded,
    isInView,
    handleLoad,
    handleError,
  };
}

/**
 * Dynamic import utility for code splitting
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  return React.lazy(importFunc);
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance measurement
   */
  startMeasurement(name: string): void {
    performance.mark(`${name}-start`);
  }

  /**
   * End performance measurement
   */
  endMeasurement(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measure = performance.getEntriesByName(name, 'measure')[0];
    const duration = measure.duration;

    this.metrics.set(name, duration);
    return duration;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Clear performance metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }

  /**
   * Monitor Core Web Vitals
   */
  monitorWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Monitor Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.set('lcp', lastEntry.startTime);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(lcpObserver);

    // Monitor First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.metrics.set('fid', entry.processingStart - entry.startTime);
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
    this.observers.push(fidObserver);

    // Monitor Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.metrics.set('cls', clsValue);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(clsObserver);
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

/**
 * Image optimization utilities
 */
export class ImageOptimizer {
  /**
   * Generate responsive image sources
   */
  static generateResponsiveSources(
    baseUrl: string,
    sizes: number[] = [320, 640, 960, 1280, 1920]
  ): string {
    return sizes.map((size) => `${baseUrl}?w=${size} ${size}w`).join(', ');
  }

  /**
   * Generate WebP sources with fallback
   */
  static generateWebPSources(
    baseUrl: string,
    sizes: number[] = [320, 640, 960, 1280, 1920]
  ): { webp: string; fallback: string } {
    const webpSources = sizes
      .map((size) => `${baseUrl}?w=${size}&f=webp ${size}w`)
      .join(', ');

    const fallbackSources = sizes
      .map((size) => `${baseUrl}?w=${size} ${size}w`)
      .join(', ');

    return {
      webp: webpSources,
      fallback: fallbackSources,
    };
  }

  /**
   * Preload critical images
   */
  static preloadImage(src: string, as: 'image' = 'image'): void {
    if (typeof window === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = src;
    link.as = as;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  /**
   * Preload multiple images
   */
  static preloadImages(sources: string[]): void {
    sources.forEach((src) => this.preloadImage(src));
  }
}

/**
 * Bundle size analyzer
 */
export class BundleAnalyzer {
  private static instance: BundleAnalyzer;
  private chunks: Map<string, number> = new Map();

  static getInstance(): BundleAnalyzer {
    if (!BundleAnalyzer.instance) {
      BundleAnalyzer.instance = new BundleAnalyzer();
    }
    return BundleAnalyzer.instance;
  }

  /**
   * Track chunk size
   */
  trackChunk(chunkName: string, size: number): void {
    this.chunks.set(chunkName, size);
  }

  /**
   * Get bundle analysis
   */
  getAnalysis(): {
    totalSize: number;
    chunks: Record<string, number>;
    recommendations: string[];
  } {
    const chunks = Object.fromEntries(this.chunks);
    const totalSize = Object.values(chunks).reduce(
      (sum, size) => sum + size,
      0
    );

    const recommendations: string[] = [];

    // Check for large chunks
    Object.entries(chunks).forEach(([name, size]) => {
      if (size > 250000) {
        // 250KB
        recommendations.push(
          `Consider code splitting for ${name} (${Math.round(size / 1024)}KB)`
        );
      }
    });

    // Check total bundle size
    if (totalSize > 1000000) {
      // 1MB
      recommendations.push(
        'Total bundle size is large. Consider tree shaking and dead code elimination.'
      );
    }

    return {
      totalSize,
      chunks,
      recommendations,
    };
  }
}

/**
 * Memory usage monitor
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private measurements: number[] = [];

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Measure current memory usage
   */
  measure(): number | null {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return null;
    }

    const memory = (performance as any).memory;
    const used = memory.usedJSHeapSize;
    this.measurements.push(used);

    // Keep only last 100 measurements
    if (this.measurements.length > 100) {
      this.measurements = this.measurements.slice(-100);
    }

    return used;
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    current: number | null;
    average: number;
    peak: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    const current = this.measure();
    const average =
      this.measurements.length > 0
        ? this.measurements.reduce((sum, val) => sum + val, 0) /
          this.measurements.length
        : 0;
    const peak = Math.max(...this.measurements, 0);

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (this.measurements.length >= 10) {
      const recent = this.measurements.slice(-10);
      const older = this.measurements.slice(-20, -10);
      const recentAvg =
        recent.reduce((sum, val) => sum + val, 0) / recent.length;
      const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

      if (recentAvg > olderAvg * 1.1) trend = 'increasing';
      else if (recentAvg < olderAvg * 0.9) trend = 'decreasing';
    }

    return { current, average, peak, trend };
  }
}

/**
 * Performance optimization hooks
 */
export function usePerformanceOptimization() {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const monitor = PerformanceMonitor.getInstance();
  const memoryMonitor = MemoryMonitor.getInstance();

  useEffect(() => {
    // Start monitoring
    monitor.monitorWebVitals();

    // Measure memory usage periodically
    const memoryInterval = setInterval(() => {
      memoryMonitor.measure();
    }, 5000);

    // Update metrics
    const metricsInterval = setInterval(() => {
      setMetrics(monitor.getMetrics());
    }, 1000);

    return () => {
      clearInterval(memoryInterval);
      clearInterval(metricsInterval);
      monitor.cleanup();
    };
  }, [monitor, memoryMonitor]);

  return {
    metrics,
    memoryStats: memoryMonitor.getStats(),
    bundleAnalysis: BundleAnalyzer.getInstance().getAnalysis(),
  };
}
