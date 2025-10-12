/**
 * Analytics Hook for Client-Side Tracking
 * Provides easy-to-use analytics functions for React components
 */

import { useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { AnalyticsService, AnalyticsEvent, PerformanceMetric } from '@/lib/services/analytics';

export interface UseAnalyticsReturn {
  trackEvent: (event: string, properties?: Record<string, any>) => void;
  trackPageView: (page: string) => void;
  trackFeatureUsage: (
    feature: string,
    action: string,
    metadata?: Record<string, any>
  ) => void;
  trackConversion: (conversionType: string, value?: number) => void;
  trackError: (error: Error, context: string) => void;
  trackPerformance: (metric: string, value: number, unit: string) => void;
}

export function useAnalytics(): UseAnalyticsReturn {
  const { user } = useAuth();

  const trackEvent = useCallback(
    (event: string, properties?: Record<string, any>) => {
      const eventData: AnalyticsEvent = { event };
      if (user?.id) eventData.userId = user.id;
      if (properties) eventData.properties = properties;
      AnalyticsService.trackEvent(eventData);
    },
    [user?.id]
  );

  const trackPageView = useCallback(
    (page: string) => {
      AnalyticsService.trackPageView(page, user?.id);
    },
    [user?.id]
  );

  const trackFeatureUsage = useCallback(
    (feature: string, action: string, metadata?: Record<string, any>) => {
      AnalyticsService.trackFeatureUsage(
        feature,
        action,
        user?.id,
        undefined,
        metadata
      );
    },
    [user?.id]
  );

  const trackConversion = useCallback(
    (conversionType: string, value?: number) => {
      AnalyticsService.trackConversion(conversionType, value, user?.id);
    },
    [user?.id]
  );

  const trackError = useCallback(
    (error: Error, context: string) => {
      AnalyticsService.trackError(error, context, user?.id);
    },
    [user?.id]
  );

  const trackPerformance = useCallback(
    (metric: string, value: number, unit: string) => {
      const perfData: PerformanceMetric = { metric, value, unit };
      if (user?.id) perfData.userId = user.id;
      AnalyticsService.trackPerformance(perfData);
    },
    [user?.id]
  );

  // Track page load performance
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const trackPageLoad = () => {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        if (navigation) {
          trackPerformance(
            'page_load_time',
            navigation.loadEventEnd - navigation.fetchStart,
            'ms'
          );
          trackPerformance(
            'dom_content_loaded',
            navigation.domContentLoadedEventEnd - navigation.fetchStart,
            'ms'
          );
          trackPerformance(
            'first_paint',
            navigation.loadEventEnd - navigation.fetchStart,
            'ms'
          );
        }
      };

      if (document.readyState === 'complete') {
        trackPageLoad();
      } else {
        window.addEventListener('load', trackPageLoad);
        return () => window.removeEventListener('load', trackPageLoad);
      }
    }
  }, [trackPerformance]);

  return {
    trackEvent,
    trackPageView,
    trackFeatureUsage,
    trackConversion,
    trackError,
    trackPerformance,
  };
}
