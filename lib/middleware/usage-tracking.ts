/**
 * Usage tracking middleware for API routes
 * Automatically tracks user actions and enforces tier limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { TierService } from '../services/tierService';
import { TierLimitChecker } from '../utils/tierLimits';
import { logger } from '../utils/logger';

export interface UsageTrackingConfig {
  trackClothingUploads: boolean;
  trackTryOns: boolean;
  trackConcurrentSessions: boolean;
  enforceLimits: boolean;
  logUsage: boolean;
}

export interface UsageTrackingData {
  userId: string;
  action: string;
  metadata?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Usage tracking middleware factory
 */
export function createUsageTrackingMiddleware(config: UsageTrackingConfig) {
  return async function usageTrackingMiddleware(
    req: NextRequest,
    _res: NextResponse,
    next: () => Promise<void>
  ) {
    const startTime = Date.now();
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return next();
    }

    try {
      // Track the request
      await trackRequest(req, userId, config);

      // Execute the original handler
      await next();

      // Track successful completion
      await trackSuccess(req, userId, Date.now() - startTime, config);
    } catch (error) {
      // Track error
      await trackError(req, userId, error, Date.now() - startTime, config);
      throw error;
    }
  };
}

/**
 * Track specific user actions
 */
export class UsageTracker {
  /**
   * Track clothing item upload
   */
  static async trackClothingUpload(
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Enforce tier limits
      if (process.env.NODE_ENV === 'production') {
        await TierLimitChecker.enforceClothingUpload(userId);
      }

      // Track usage
      await TierService.trackUsage(userId, 'clothing_upload', metadata);

      logger.info('Clothing upload tracked', {
        userId,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to track clothing upload', error as Error, {
        userId,
        metadata,
      });
      throw error;
    }
  }

  /**
   * Track try-on session start
   */
  static async trackTryOnStart(
    userId: string,
    sessionId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Enforce tier limits
      if (process.env.NODE_ENV === 'production') {
        await TierLimitChecker.enforceTryOn(userId);
        await TierLimitChecker.enforceConcurrentSession(userId);
      }

      // Track usage
      await TierService.trackUsage(userId, 'try_on', {
        sessionId,
        ...metadata,
      });

      logger.info('Try-on start tracked', {
        userId,
        sessionId,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to track try-on start', error as Error, {
        userId,
        sessionId,
        metadata,
      });
      throw error;
    }
  }

  /**
   * Track try-on session completion
   */
  static async trackTryOnComplete(
    userId: string,
    sessionId: string,
    success: boolean,
    processingTime: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      logger.info('Try-on completion tracked', {
        userId,
        sessionId,
        success,
        processingTime,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to track try-on completion', error as Error, {
        userId,
        sessionId,
        success,
        processingTime,
        metadata,
      });
    }
  }

  /**
   * Track file deletion
   */
  static async trackFileDeletion(
    userId: string,
    fileType: 'clothing' | 'base_photo' | 'try_on_result',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      logger.info('File deletion tracked', {
        userId,
        fileType,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to track file deletion', error as Error, {
        userId,
        fileType,
        metadata,
      });
    }
  }

  /**
   * Track tier upgrade
   */
  static async trackTierUpgrade(
    userId: string,
    fromTier: string,
    toTier: string,
    billingInfo?: Record<string, any>
  ): Promise<void> {
    try {
      logger.info('Tier upgrade tracked', {
        userId,
        fromTier,
        toTier,
        billingInfo,
      });
    } catch (error) {
      logger.error('Failed to track tier upgrade', error as Error, {
        userId,
        fromTier,
        toTier,
        billingInfo,
      });
    }
  }

  /**
   * Track user login
   */
  static async trackLogin(
    userId: string,
    method: 'email' | 'social',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      logger.info('User login tracked', {
        userId,
        method,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to track login', error as Error, {
        userId,
        method,
        metadata,
      });
    }
  }

  /**
   * Track user logout
   */
  static async trackLogout(
    userId: string,
    sessionDuration: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      logger.info('User logout tracked', {
        userId,
        sessionDuration,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to track logout', error as Error, {
        userId,
        sessionDuration,
        metadata,
      });
    }
  }
}

/**
 * Analytics and reporting utilities
 */
export class UsageAnalytics {
  /**
   * Get usage statistics for a user
   */
  static async getUserStats(userId: string): Promise<{
    totalClothingItems: number;
    totalTryOns: number;
    monthlyTryOns: number;
    averageProcessingTime: number;
    mostUsedCategories: Array<{ category: string; count: number }>;
    storageUsage: number;
  }> {
    try {
      const usage = await TierService.getUserUsage(userId);

      // This would typically query the database for more detailed stats
      return {
        totalClothingItems: usage.clothing_items_used,
        totalTryOns: usage.try_ons_this_month,
        monthlyTryOns: usage.try_ons_this_month,
        averageProcessingTime: 0, // Would be calculated from try_on_sessions
        mostUsedCategories: [], // Would be calculated from clothing_items
        storageUsage: usage.storage_used_gb,
      };
    } catch (error) {
      logger.error('Failed to get user stats', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get system-wide usage statistics
   */
  static async getSystemStats(): Promise<{
    totalUsers: number;
    totalClothingItems: number;
    totalTryOns: number;
    averageProcessingTime: number;
    tierDistribution: Record<string, number>;
  }> {
    try {
      // This would typically query the database for system-wide stats
      return {
        totalUsers: 0,
        totalClothingItems: 0,
        totalTryOns: 0,
        averageProcessingTime: 0,
        tierDistribution: {},
      };
    } catch (error) {
      logger.error('Failed to get system stats', error as Error);
      throw error;
    }
  }

  /**
   * Generate usage report for a user
   */
  static async generateUserReport(
    userId: string,
    period: 'week' | 'month' | 'year'
  ): Promise<{
    period: string;
    clothingItems: {
      uploaded: number;
      deleted: number;
      active: number;
    };
    tryOns: {
      total: number;
      successful: number;
      failed: number;
      averageProcessingTime: number;
    };
    storage: {
      used: number;
      limit: number;
      percentage: number;
    };
    recommendations: string[];
  }> {
    try {
      const usage = await TierService.getUserUsage(userId);
      const tier = await TierService.getUserTier(userId);

      return {
        period,
        clothingItems: {
          uploaded: usage.clothing_items_used,
          deleted: 0, // Would be calculated from audit logs
          active: usage.clothing_items_used,
        },
        tryOns: {
          total: usage.try_ons_this_month,
          successful: 0, // Would be calculated from try_on_sessions
          failed: 0, // Would be calculated from try_on_sessions
          averageProcessingTime: 0, // Would be calculated from try_on_sessions
        },
        storage: {
          used: usage.storage_used_gb,
          limit: tier.limits.storage_gb,
          percentage: (usage.storage_used_gb / tier.limits.storage_gb) * 100,
        },
        recommendations: [], // Would be generated based on usage patterns
      };
    } catch (error) {
      logger.error('Failed to generate user report', error as Error, {
        userId,
        period,
      });
      throw error;
    }
  }
}

// Helper functions
async function trackRequest(
  req: NextRequest,
  userId: string,
  _config: UsageTrackingConfig
): Promise<void> {
  if (!_config.logUsage) return;

  const data: UsageTrackingData = {
    userId,
    action: 'request_start',
    metadata: {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
    },
    timestamp: new Date().toISOString(),
    ipAddress: (req as any).ip || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
  };

  logger.info('Request tracked', data);
}

async function trackSuccess(
  req: NextRequest,
  userId: string,
  duration: number,
  _config: UsageTrackingConfig
): Promise<void> {
  if (!_config.logUsage) return;

  logger.info('Request completed successfully', {
    userId,
    duration,
    url: req.url,
  });
}

async function trackError(
  req: NextRequest,
  userId: string,
  error: unknown,
  duration: number,
  _config: UsageTrackingConfig
): Promise<void> {
  logger.error('Request failed', error as Error, {
    userId,
    duration,
    url: req.url,
  });
}
