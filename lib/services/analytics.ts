/**
 * Analytics and Usage Tracking Service
 * Tracks user interactions, performance metrics, and business KPIs
 */

import { createSupabaseServerClient } from '@/lib/config/supabase';
import { logger } from '@/lib/utils/logger';

export interface AnalyticsEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export interface PerformanceMetric {
  metric: string;
  value: number;
  unit: string;
  userId?: string;
  sessionId?: string;
  timestamp?: Date;
}

export interface UserEngagement {
  userId: string;
  sessionCount: number;
  totalTimeSpent: number;
  lastActive: Date;
  featuresUsed: string[];
}

export class AnalyticsService {
  /**
   * Track user events and interactions
   */
  static async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.from('analytics_events').insert({
        event: event.event,
        user_id: event.userId,
        session_id: event.sessionId,
        properties: event.properties || {},
        timestamp: event.timestamp || new Date().toISOString(),
      });

      if (error) {
        logger.error('Failed to track analytics event', error, {
          event: event.event,
          userId: event.userId,
        });
      } else {
        logger.info('Analytics event tracked', {
          event: event.event,
          userId: event.userId,
        });
      }
    } catch (error) {
      logger.error('Analytics tracking error', error, {
        event: event.event,
      });
    }
  }

  /**
   * Track performance metrics
   */
  static async trackPerformance(metric: PerformanceMetric): Promise<void> {
    try {
      const { error } = await this.supabase.from('performance_metrics').insert({
        metric: metric.metric,
        value: metric.value,
        unit: metric.unit,
        user_id: metric.userId,
        session_id: metric.sessionId,
        timestamp: metric.timestamp || new Date().toISOString(),
      });

      if (error) {
        logger.error('Failed to track performance metric', error, {
          metric: metric.metric,
          userId: metric.userId,
        });
      }
    } catch (error) {
      logger.error('Performance tracking error', error, {
        metric: metric.metric,
      });
    }
  }

  /**
   * Track user engagement metrics
   */
  static async trackEngagement(engagement: UserEngagement): Promise<void> {
    try {
      const { error } = await this.supabase.from('user_engagement').upsert({
        user_id: engagement.userId,
        session_count: engagement.sessionCount,
        total_time_spent: engagement.totalTimeSpent,
        last_active: engagement.lastActive.toISOString(),
        features_used: engagement.featuresUsed,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        logger.error('Failed to track user engagement', error, {
          userId: engagement.userId,
        });
      }
    } catch (error) {
      logger.error('Engagement tracking error', error, {
        userId: engagement.userId,
      });
    }
  }

  /**
   * Track page views
   */
  static async trackPageView(
    page: string,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackEvent({
      event: 'page_view',
      userId,
      sessionId,
      properties: {
        page,
        referrer: typeof window !== 'undefined' ? document.referrer : undefined,
        userAgent:
          typeof window !== 'undefined' ? navigator.userAgent : undefined,
      },
    });
  }

  /**
   * Track feature usage
   */
  static async trackFeatureUsage(
    feature: string,
    action: string,
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      event: 'feature_usage',
      userId,
      sessionId,
      properties: {
        feature,
        action,
        ...metadata,
      },
    });
  }

  /**
   * Track conversion events
   */
  static async trackConversion(
    conversionType: string,
    value?: number,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackEvent({
      event: 'conversion',
      userId,
      sessionId,
      properties: {
        conversionType,
        value,
      },
    });
  }

  /**
   * Get analytics dashboard data
   */
  static async getDashboardData(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    topFeatures: Array<{ feature: string; count: number }>;
    conversionRate: number;
  }> {
    try {
      // Get total users
      const { count: totalUsers } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get active users in date range
      const { count: activeUsers } = await this.supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: true })
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .not('user_id', 'is', null);

      // Get total sessions
      const { count: totalSessions } = await this.supabase
        .from('try_on_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get average session duration
      const { data: sessions } = await this.supabase
        .from('try_on_sessions')
        .select('processing_time')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('processing_time', 'is', null);

      const averageSessionDuration = sessions?.length
        ? sessions.reduce(
            (sum, session) => sum + (session.processing_time || 0),
            0
          ) / sessions.length
        : 0;

      // Get top features
      const { data: features } = await this.supabase
        .from('analytics_events')
        .select('properties')
        .eq('event', 'feature_usage')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      const featureCounts: Record<string, number> = {};
      features?.forEach((event) => {
        const feature = event.properties?.feature;
        if (feature) {
          featureCounts[feature] = (featureCounts[feature] || 0) + 1;
        }
      });

      const topFeatures = Object.entries(featureCounts)
        .map(([feature, count]) => ({ feature, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get conversion rate
      const { count: conversions } = await this.supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event', 'conversion')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      const conversionRate = totalSessions
        ? (conversions || 0) / totalSessions
        : 0;

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalSessions: totalSessions || 0,
        averageSessionDuration,
        topFeatures,
        conversionRate,
      };
    } catch (error) {
      logger.error('Failed to get dashboard data', error);
      throw error;
    }
  }

  /**
   * Track error events
   */
  static async trackError(
    error: Error,
    context: string,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackEvent({
      event: 'error',
      userId,
      sessionId,
      properties: {
        errorMessage: error.message,
        errorStack: error.stack,
        context,
        userAgent:
          typeof window !== 'undefined' ? navigator.userAgent : undefined,
      },
    });
  }
}
