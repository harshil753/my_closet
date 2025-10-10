/**
 * Tier Limit Enforcement Middleware
 *
 * This middleware provides comprehensive tier limit enforcement for clothing items
 * and other resources. It integrates with the existing tier service and provides
 * both API-level and component-level enforcement.
 */

import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';
import { TierService } from '@/lib/services/tierService';
import { UserTier } from '@/lib/types/common';

/**
 * Tier enforcement configuration
 */
export interface TierEnforcementConfig {
  /** Resource type being enforced */
  resource: 'clothing_items' | 'try_ons' | 'base_photos' | 'sessions';
  /** Whether to enforce limits strictly */
  strict: boolean;
  /** Custom error message */
  customMessage?: string;
  /** Whether to track usage after successful operation */
  trackUsage: boolean;
}

/**
 * Enforcement result
 */
export interface EnforcementResult {
  allowed: boolean;
  reason?: string | undefined;
  upgradeRequired?: boolean | undefined;
  currentUsage: number;
  limit: number;
  remaining: number;
}

/**
 * Main tier enforcement middleware
 */
export class TierEnforcement {
  constructor() {
    // Supabase client will be initialized in methods as needed
  }

  /**
   * Enforce tier limits for a specific resource
   *
   * @param userId - User ID
   * @param resource - Resource type
   * @param config - Enforcement configuration
   * @returns Enforcement result
   */
  async enforceLimit(
    userId: string,
    resource: TierEnforcementConfig['resource'],
    config: Partial<TierEnforcementConfig> = {}
  ): Promise<EnforcementResult> {
    const fullConfig: TierEnforcementConfig = {
      resource,
      strict: true,
      trackUsage: true,
      ...config,
    };

    try {
      // Get user tier and current usage
      const tier = await this.getUserTier(userId);
      const usage = await this.getUserUsage(userId);

      // Check if user can perform the action
      const canPerform = await this.checkResourceLimit(tier, usage, resource);

      if (!canPerform.allowed) {
        return {
          allowed: false,
          reason:
            fullConfig.customMessage || canPerform.reason || 'Limit exceeded',
          upgradeRequired: canPerform.upgradeRequired,
          currentUsage: canPerform.currentUsage,
          limit: canPerform.limit,
          remaining: canPerform.remaining,
        };
      }

      // If tracking is enabled and action is allowed, track the usage
      if (fullConfig.trackUsage) {
        await this.trackUsage(userId, resource);
      }

      return {
        allowed: true,
        currentUsage: canPerform.currentUsage + 1,
        limit: canPerform.limit,
        remaining: canPerform.remaining - 1,
      };
    } catch (error) {
      console.error('Tier enforcement error:', error);
      return {
        allowed: false,
        reason: 'Tier limit check failed',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
      };
    }
  }

  /**
   * Check if user can perform a specific action
   *
   * @param userId - User ID
   * @param action - Action type
   * @returns True if action is allowed
   */
  async canPerformAction(
    userId: string,
    action:
      | 'upload_clothing'
      | 'start_try_on'
      | 'upload_base_photo'
      | 'create_session'
  ): Promise<boolean> {
    const resourceMap = {
      upload_clothing: 'clothing_items' as const,
      start_try_on: 'try_ons' as const,
      upload_base_photo: 'base_photos' as const,
      create_session: 'sessions' as const,
    };

    const result = await this.enforceLimit(userId, resourceMap[action], {
      strict: false,
    });
    return result.allowed;
  }

  /**
   * Get user's tier information
   *
   * @param userId - User ID
   * @returns User tier information
   */
  private async getUserTier(userId: string): Promise<any> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('users')
      .select('tier, tier_limits')
      .eq('id', userId)
      .single();

    if (error) {
      // If user doesn't exist in users table, default to free tier
      console.log(
        'User not found in users table, defaulting to free tier:',
        error.message
      );
      return {
        tier: 'free',
        tier_limits: null,
      };
    }

    // If user exists but has no tier set, default to free
    if (!data.tier) {
      return {
        tier: 'free',
        tier_limits: data.tier_limits,
      };
    }

    return data;
  }

  /**
   * Get user's current usage
   *
   * @param userId - User ID
   * @returns Current usage data
   */
  private async getUserUsage(userId: string): Promise<any> {
    const supabase = await createSupabaseServerClient();
    const [clothingResult, tryOnResult, basePhotoResult, sessionResult] =
      await Promise.all([
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
          .gte('created_at', this.getCurrentMonthStart()),

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
      clothing_items_used: clothingResult.count || 0,
      try_ons_this_month: tryOnResult.count || 0,
      base_photos_used: basePhotoResult.count || 0,
      active_sessions: sessionResult.count || 0,
    };
  }

  /**
   * Check resource limit for a specific resource
   *
   * @param tier - User tier information
   * @param usage - Current usage data
   * @param resource - Resource type
   * @returns Limit check result
   */
  private async checkResourceLimit(
    tier: any,
    usage: any,
    resource: TierEnforcementConfig['resource']
  ): Promise<EnforcementResult> {
    const tierConfig = TierService.getTierConfig(tier.tier as UserTier);

    let limit: number;
    let currentUsage: number;

    switch (resource) {
      case 'clothing_items':
        limit = tierConfig.limits.clothing_items;
        currentUsage = usage.clothing_items_used;
        break;
      case 'try_ons':
        limit = tierConfig.limits.try_ons_per_month;
        currentUsage = usage.try_ons_this_month;
        break;
      case 'base_photos':
        limit = tierConfig.limits.storage_gb;
        currentUsage = usage.base_photos_used;
        break;
      case 'sessions':
        limit = tierConfig.limits.concurrent_sessions;
        currentUsage = usage.active_sessions;
        break;
      default:
        return {
          allowed: false,
          reason: 'Unknown resource type',
          currentUsage: 0,
          limit: 0,
          remaining: 0,
        };
    }

    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage < limit;

    return {
      allowed,
      reason: allowed
        ? undefined
        : `${resource} limit reached (${currentUsage}/${limit})`,
      upgradeRequired: !allowed && tier.tier === 'free',
      currentUsage,
      limit,
      remaining,
    };
  }

  /**
   * Track usage for a specific resource
   *
   * @param userId - User ID
   * @param resource - Resource type
   */
  private async trackUsage(
    userId: string,
    resource: TierEnforcementConfig['resource']
  ): Promise<void> {
    try {
      const supabase = await createSupabaseServerClient();
      // Update usage tracking in database
      const { error } = await supabase.rpc('increment_usage_tracking', {
        user_id: userId,
        resource_type: resource,
        increment_amount: 1,
      });

      if (error) {
        console.error('Failed to track usage:', error);
      }
    } catch (error) {
      console.error('Usage tracking error:', error);
    }
  }

  /**
   * Get current month start date
   *
   * @returns ISO string of current month start
   */
  private getCurrentMonthStart(): string {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return startOfMonth.toISOString();
  }
}

/**
 * API route middleware for tier enforcement
 */
export function withTierEnforcement(
  resource: TierEnforcementConfig['resource'],
  config: Partial<TierEnforcementConfig> = {}
) {
  return async function tierEnforcementMiddleware(
    _request: NextRequest,
    userId: string
  ): Promise<NextResponse | null> {
    const enforcement = new TierEnforcement();

    try {
      const result = await enforcement.enforceLimit(userId, resource, config);

      if (!result.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TIER_LIMIT_EXCEEDED',
              message: result.reason,
              details: {
                resource,
                currentUsage: result.currentUsage,
                limit: result.limit,
                remaining: result.remaining,
                upgradeRequired: result.upgradeRequired,
              },
            },
          },
          { status: 402 } // Payment Required
        );
      }

      return null; // Continue with request
    } catch (error) {
      console.error('Tier enforcement middleware error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Tier limit check failed',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * React hook for tier enforcement
 */
export function useTierEnforcement(userId: string) {
  const [enforcement, setEnforcement] = React.useState<TierEnforcement | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!userId) return;

    const initEnforcement = async () => {
      try {
        setLoading(true);
        const enforcementInstance = new TierEnforcement();
        setEnforcement(enforcementInstance);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    initEnforcement();
  }, [userId]);

  const checkLimit = React.useCallback(
    async (
      resource: TierEnforcementConfig['resource'],
      config?: Partial<TierEnforcementConfig>
    ) => {
      if (!enforcement) {
        throw new Error('Enforcement not initialized');
      }

      return await enforcement.enforceLimit(userId, resource, config);
    },
    [enforcement, userId]
  );

  const canPerformAction = React.useCallback(
    async (
      action:
        | 'upload_clothing'
        | 'start_try_on'
        | 'upload_base_photo'
        | 'create_session'
    ) => {
      if (!enforcement) {
        return false;
      }

      return await enforcement.canPerformAction(userId, action);
    },
    [enforcement, userId]
  );

  return {
    enforcement,
    loading,
    error,
    checkLimit,
    canPerformAction,
  };
}

/**
 * Utility functions for tier enforcement
 */
export const TierEnforcementUtils = {
  /**
   * Create enforcement instance
   */
  create: () => new TierEnforcement(),

  /**
   * Check if user needs upgrade
   */
  async needsUpgrade(userId: string): Promise<boolean> {
    const enforcement = new TierEnforcement();

    const checks = await Promise.all([
      enforcement.canPerformAction(userId, 'upload_clothing'),
      enforcement.canPerformAction(userId, 'start_try_on'),
      enforcement.canPerformAction(userId, 'upload_base_photo'),
      enforcement.canPerformAction(userId, 'create_session'),
    ]);

    return checks.some((canPerform) => !canPerform);
  },

  /**
   * Get upgrade recommendations
   */
  async getUpgradeRecommendations(userId: string): Promise<{
    recommended: boolean;
    reasons: string[];
    benefits: string[];
  }> {
    const enforcement = new TierEnforcement();
    const needsUpgrade = await this.needsUpgrade(userId);

    if (!needsUpgrade) {
      return {
        recommended: false,
        reasons: [],
        benefits: [],
      };
    }

    const reasons: string[] = [];
    const benefits: string[] = [
      'Store up to 1000 clothing items',
      '1000 try-ons per month',
      'Run up to 3 concurrent sessions',
      'Priority support',
      'Advanced analytics',
    ];

    // Check specific limits
    const canUpload = await enforcement.canPerformAction(
      userId,
      'upload_clothing'
    );
    if (!canUpload) {
      reasons.push("You've reached your clothing items limit");
    }

    const canTryOn = await enforcement.canPerformAction(userId, 'start_try_on');
    if (!canTryOn) {
      reasons.push("You've reached your monthly try-ons limit");
    }

    const canCreateSession = await enforcement.canPerformAction(
      userId,
      'create_session'
    );
    if (!canCreateSession) {
      reasons.push("You've reached your concurrent sessions limit");
    }

    return {
      recommended: reasons.length > 0,
      reasons,
      benefits,
    };
  },
};

export default TierEnforcement;
