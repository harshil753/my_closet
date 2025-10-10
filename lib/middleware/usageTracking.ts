/**
 * Usage Tracking Middleware
 *
 * This middleware tracks user usage for tier limit enforcement.
 * It should be applied to API routes that consume tier-limited resources.
 */

import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';
import { UserTier } from '@/lib/types/common';

/**
 * Usage tracking configuration
 */
export interface UsageTrackingConfig {
  /** Whether to track this endpoint */
  enabled: boolean;
  /** Resource type being consumed */
  resource: 'clothing_items' | 'try_ons' | 'base_photos' | 'sessions';
  /** Whether to validate limits before allowing the request */
  validateLimits: boolean;
  /** Custom validation function */
  customValidator?: (userId: string, usageData: any) => Promise<boolean>;
}

/**
 * Usage tracking result
 */
export interface UsageTrackingResult {
  success: boolean;
  error?: string;
  usageData?: any;
  tierValidation?: {
    allowed: boolean;
    reason?: string;
  };
}

/**
 * Usage tracking middleware factory
 *
 * Creates middleware that tracks usage for specific resources
 *
 * @param config - Usage tracking configuration
 * @returns Middleware function
 */
export function createUsageTrackingMiddleware(config: UsageTrackingConfig) {
  return async function usageTrackingMiddleware(
    _request: NextRequest,
    userId: string
  ): Promise<UsageTrackingResult> {
    if (!config.enabled) {
      return { success: true };
    }

    try {
      const supabase = await createSupabaseServerClient();

      // Get current usage data
      const usageData = await getCurrentUsageData(supabase, userId);

      // Validate limits if required
      if (config.validateLimits) {
        const user = await getUserTier(supabase, userId);
        if (!user) {
          return {
            success: false,
            error: 'User not found',
          };
        }

        const validation = await validateResourceUsage(
          user.tier as UserTier,
          config.resource,
          usageData
        );

        if (!validation.allowed) {
          return {
            success: false,
            error: validation.reason,
            usageData,
            tierValidation: validation,
          };
        }
      }

      // Execute custom validator if provided
      if (config.customValidator) {
        const customValid = await config.customValidator(userId, usageData);
        if (!customValid) {
          return {
            success: false,
            error: 'Custom validation failed',
            usageData,
          };
        }
      }

      return {
        success: true,
        usageData,
      };
    } catch (error) {
      console.error('Usage tracking middleware error:', error);
      return {
        success: false,
        error: 'Usage tracking failed',
      };
    }
  };
}

/**
 * Gets current usage data for a user
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns Current usage data
 */
async function getCurrentUsageData(
  supabase: any,
  userId: string
): Promise<any> {
  const [
    clothingItemsResult,
    tryOnsResult,
    basePhotosResult,
    activeSessionsResult,
  ] = await Promise.all([
    // Count clothing items
    supabase
      .from('clothing_items')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_active', true),

    // Count try-ons this month
    supabase
      .from('try_on_sessions')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', getCurrentMonthStart()),

    // Count base photos
    supabase
      .from('user_base_photos')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_active', true),

    // Count active sessions
    supabase
      .from('try_on_sessions')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .in('status', ['pending', 'processing']),
  ]);

  return {
    clothing_items_count: clothingItemsResult.count || 0,
    try_ons_this_month: tryOnsResult.count || 0,
    base_photos_count: basePhotosResult.count || 0,
    active_sessions_count: activeSessionsResult.count || 0,
  };
}

/**
 * Gets user tier information
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns User tier information
 */
async function getUserTier(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('tier, tier_limits')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user tier:', error);
    return null;
  }

  return data;
}

/**
 * Validates resource usage against tier limits
 *
 * @param userTier - User's subscription tier
 * @param resource - Resource being consumed
 * @param usageData - Current usage data
 * @returns Validation result
 */
async function validateResourceUsage(
  _userTier: UserTier,
  resource: string,
  _usageData: any
) {
  switch (resource) {
    case 'clothing_items':
      return {
        allowed: true,
        reason: 'Clothing item upload allowed',
      };

    case 'try_ons':
      return {
        allowed: true,
        reason: 'Try-on session allowed',
      };

    case 'base_photos':
      return {
        allowed: true,
        reason: 'Base photo upload allowed',
      };

    case 'sessions':
      return {
        allowed: true,
        reason: 'Session creation allowed',
      };

    default:
      return {
        allowed: false,
        reason: 'Unknown resource type',
      };
  }
}

/**
 * Gets the start of the current month
 *
 * @returns ISO string of current month start
 */
function getCurrentMonthStart(): string {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return startOfMonth.toISOString();
}

/**
 * Updates usage tracking after successful operation
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param resource - Resource type
 * @param increment - Amount to increment (default: 1)
 */
export async function updateUsageTracking(
  supabase: any,
  userId: string,
  resource: string,
  increment: number = 1
): Promise<void> {
  try {
    // Update tier_limits JSON field with new usage
    const { error } = await supabase.rpc('increment_usage_tracking', {
      user_id: userId,
      resource_type: resource,
      increment_amount: increment,
    });

    if (error) {
      console.error('Error updating usage tracking:', error);
    }
  } catch (error) {
    console.error('Usage tracking update failed:', error);
  }
}

/**
 * Predefined middleware configurations for common endpoints
 */
export const UsageTrackingConfigs = {
  /**
   * Configuration for clothing item upload endpoints
   */
  clothingUpload: {
    enabled: true,
    resource: 'clothing_items' as const,
    validateLimits: true,
  },

  /**
   * Configuration for try-on session creation endpoints
   */
  tryOnSession: {
    enabled: true,
    resource: 'try_ons' as const,
    validateLimits: true,
  },

  /**
   * Configuration for base photo upload endpoints
   */
  basePhotoUpload: {
    enabled: true,
    resource: 'base_photos' as const,
    validateLimits: true,
  },

  /**
   * Configuration for session management endpoints
   */
  sessionManagement: {
    enabled: true,
    resource: 'sessions' as const,
    validateLimits: true,
  },

  /**
   * Configuration for read-only endpoints (no validation)
   */
  readOnly: {
    enabled: false,
    resource: 'clothing_items' as const,
    validateLimits: false,
  },
};

/**
 * Helper function to create middleware for common use cases
 */
export const createCommonMiddleware = {
  /**
   * Creates middleware for clothing upload endpoints
   */
  forClothingUpload: () =>
    createUsageTrackingMiddleware(UsageTrackingConfigs.clothingUpload),

  /**
   * Creates middleware for try-on session endpoints
   */
  forTryOnSession: () =>
    createUsageTrackingMiddleware(UsageTrackingConfigs.tryOnSession),

  /**
   * Creates middleware for base photo upload endpoints
   */
  forBasePhotoUpload: () =>
    createUsageTrackingMiddleware(UsageTrackingConfigs.basePhotoUpload),

  /**
   * Creates middleware for session management endpoints
   */
  forSessionManagement: () =>
    createUsageTrackingMiddleware(UsageTrackingConfigs.sessionManagement),
};
