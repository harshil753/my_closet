/**
 * Tier enforcement system and usage tracking
 * Manages user tier limits, usage tracking, and upgrade/downgrade logic
 */

import { createSupabaseServerClient } from '../config/supabase';
import { TierLimits, UserTier } from '../types/common';
import { TierLimitError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface TierConfig {
  name: UserTier;
  limits: {
    clothing_items: number;
    try_ons_per_month: number;
    storage_gb: number;
    concurrent_sessions: number;
  };
  features: {
    ai_processing: boolean;
    priority_support: boolean;
    advanced_analytics: boolean;
  };
}

export interface UsageStats {
  clothing_items_used: number;
  try_ons_this_month: number;
  storage_used_gb: number;
  active_sessions: number;
  monthly_reset_date: string;
}

export interface TierUpgradeOptions {
  targetTier: UserTier;
  billingCycle: 'monthly' | 'yearly';
  price: number;
  features: string[];
}

/**
 * Tier configuration for different subscription levels
 */
export const TIER_CONFIGS: Record<UserTier, TierConfig> = {
  free: {
    name: 'free',
    limits: {
      clothing_items: 100,
      try_ons_per_month: 100,
      storage_gb: 1,
      concurrent_sessions: 1,
    },
    features: {
      ai_processing: true,
      priority_support: false,
      advanced_analytics: false,
    },
  },
  premium: {
    name: 'premium',
    limits: {
      clothing_items: 1000,
      try_ons_per_month: 1000,
      storage_gb: 10,
      concurrent_sessions: 3,
    },
    features: {
      ai_processing: true,
      priority_support: true,
      advanced_analytics: true,
    },
  },
};

export class TierService {
  /**
   * Get user's current tier configuration
   */
  static async getUserTier(userId: string): Promise<TierConfig> {
    const supabase = await createSupabaseServerClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Failed to get user tier', error, { userId });
      throw new Error('Failed to get user tier');
    }

    return TIER_CONFIGS[user.tier as UserTier];
  }

  /**
   * Get user's current usage statistics
   */
  static async getUserUsage(userId: string): Promise<UsageStats> {
    const [clothingCount, tryOnCount, storageUsage, activeSessions] =
      await Promise.all([
        this.getClothingItemsCount(userId),
        this.getTryOnsThisMonth(userId),
        this.getStorageUsage(userId),
        this.getActiveSessionsCount(userId),
      ]);

    return {
      clothing_items_used: clothingCount,
      try_ons_this_month: tryOnCount,
      storage_used_gb: storageUsage,
      active_sessions: activeSessions,
      monthly_reset_date: this.getMonthlyResetDate(),
    };
  }

  /**
   * Check if user can perform an action based on tier limits
   */
  static async checkTierLimit(
    userId: string,
    action: 'clothing_upload' | 'try_on' | 'concurrent_session',
    _metadata?: Record<string, any>
  ): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: boolean }> {
    const tier = await this.getUserTier(userId);
    const usage = await this.getUserUsage(userId);

    switch (action) {
      case 'clothing_upload':
        if (usage.clothing_items_used >= tier.limits.clothing_items) {
          return {
            allowed: false,
            reason: `Clothing items limit reached (${usage.clothing_items_used}/${tier.limits.clothing_items})`,
            upgradeRequired: tier.name === 'free',
          };
        }
        break;

      case 'try_on':
        if (usage.try_ons_this_month >= tier.limits.try_ons_per_month) {
          return {
            allowed: false,
            reason: `Monthly try-ons limit reached (${usage.try_ons_this_month}/${tier.limits.try_ons_per_month})`,
            upgradeRequired: tier.name === 'free',
          };
        }
        break;

      case 'concurrent_session':
        if (usage.active_sessions >= tier.limits.concurrent_sessions) {
          return {
            allowed: false,
            reason: `Concurrent sessions limit reached (${usage.active_sessions}/${tier.limits.concurrent_sessions})`,
            upgradeRequired: tier.name === 'free',
          };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Enforce tier limits and throw error if exceeded
   */
  static async enforceTierLimit(
    userId: string,
    action: 'clothing_upload' | 'try_on' | 'concurrent_session',
    _metadata?: Record<string, any>
  ): Promise<void> {
    const check = await this.checkTierLimit(userId, action, _metadata);

    if (!check.allowed) {
      const tier = await this.getUserTier(userId);
      const usage = await this.getUserUsage(userId);

      let limit: string;
      let current: number;
      let max: number;

      switch (action) {
        case 'clothing_upload':
          limit = 'clothing_items';
          current = usage.clothing_items_used;
          max = tier.limits.clothing_items;
          break;
        case 'try_on':
          limit = 'try_ons_per_month';
          current = usage.try_ons_this_month;
          max = tier.limits.try_ons_per_month;
          break;
        case 'concurrent_session':
          limit = 'concurrent_sessions';
          current = usage.active_sessions;
          max = tier.limits.concurrent_sessions;
          break;
        default:
          throw new Error('Unknown action');
      }

      throw new TierLimitError(limit, current, max, {
        userId,
        action,
        tier: tier.name,
        upgradeRequired: check.upgradeRequired,
      });
    }
  }

  /**
   * Track usage for an action
   */
  static async trackUsage(
    userId: string,
    action: 'clothing_upload' | 'try_on' | 'concurrent_session',
    _metadata?: Record<string, any>
  ): Promise<void> {
    const tier = await this.getUserTier(userId);

    // Update tier limits in database
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('users')
      .update({
        tier_limits: this.updateTierLimits(tier, action),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to track usage', error, {
        userId,
        action,
        metadata: _metadata,
      });
      throw new Error('Failed to track usage');
    }

    logger.info('Usage tracked', { userId, action, metadata: _metadata });
  }

  /**
   * Upgrade user tier
   */
  static async upgradeTier(
    userId: string,
    newTier: UserTier,
    billingInfo?: Record<string, any>
  ): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('users')
      .update({
        tier: newTier,
        tier_limits: this.getDefaultTierLimits(newTier),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to upgrade tier', error, {
        userId,
        newTier,
        billingInfo,
      });
      throw new Error('Failed to upgrade tier');
    }

    logger.info('Tier upgraded', { userId, newTier, billingInfo });
  }

  /**
   * Downgrade user tier
   */
  static async downgradeTier(
    userId: string,
    newTier: UserTier,
    reason?: string
  ): Promise<void> {
    // Check if user's current usage exceeds new tier limits
    const usage = await this.getUserUsage(userId);
    const newTierConfig = TIER_CONFIGS[newTier];

    if (usage.clothing_items_used > newTierConfig.limits.clothing_items) {
      throw new Error(
        'Cannot downgrade: clothing items usage exceeds new tier limit'
      );
    }

    if (usage.try_ons_this_month > newTierConfig.limits.try_ons_per_month) {
      throw new Error(
        'Cannot downgrade: monthly try-ons usage exceeds new tier limit'
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('users')
      .update({
        tier: newTier,
        tier_limits: this.getDefaultTierLimits(newTier),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to downgrade tier', error, {
        userId,
        newTier,
        reason,
      });
      throw new Error('Failed to downgrade tier');
    }

    logger.info('Tier downgraded', { userId, newTier, reason });
  }

  /**
   * Get tier upgrade options for user
   */
  static async getUpgradeOptions(
    userId: string
  ): Promise<TierUpgradeOptions[]> {
    const currentTier = await this.getUserTier(userId);

    if (currentTier.name === 'premium') {
      return []; // Already at highest tier
    }

    return [
      {
        targetTier: 'premium',
        billingCycle: 'monthly',
        price: 9.99,
        features: [
          '1000 clothing items',
          '1000 try-ons per month',
          '10GB storage',
          '3 concurrent sessions',
          'Priority support',
          'Advanced analytics',
        ],
      },
      {
        targetTier: 'premium',
        billingCycle: 'yearly',
        price: 99.99,
        features: [
          '1000 clothing items',
          '1000 try-ons per month',
          '10GB storage',
          '3 concurrent sessions',
          'Priority support',
          'Advanced analytics',
          '2 months free',
        ],
      },
    ];
  }

  /**
   * Reset monthly usage (called by cron job)
   */
  static async resetMonthlyUsage(): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('users')
      .update({
        tier_limits: {
          clothing_items: 100,
          try_ons_per_month: 100,
          current_month_usage: 0,
          current_month: new Date().toISOString().slice(0, 7),
        },
        updated_at: new Date().toISOString(),
      })
      .neq('tier', 'premium'); // Only reset free tier users

    if (error) {
      logger.error('Failed to reset monthly usage', error);
      throw new Error('Failed to reset monthly usage');
    }

    logger.info('Monthly usage reset completed');
  }

  // Private helper methods
  private static async getClothingItemsCount(userId: string): Promise<number> {
    const supabase = await createSupabaseServerClient();
    const { count, error } = await supabase
      .from('clothing_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to get clothing items count', error, { userId });
      return 0;
    }

    return count || 0;
  }

  private static async getTryOnsThisMonth(userId: string): Promise<number> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from('try_on_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${currentMonth}-01T00:00:00Z`);

    if (error) {
      logger.error('Failed to get try-ons count', error, { userId });
      return 0;
    }

    return count || 0;
  }

  private static async getStorageUsage(_userId: string): Promise<number> {
    // This would typically query Supabase Storage API
    // For now, return a placeholder
    return 0;
  }

  private static async getActiveSessionsCount(userId: string): Promise<number> {
    const { createSupabaseAdminClient } = await import('@/lib/config/supabase');
    const supabase = createSupabaseAdminClient();
    const { count, error } = await supabase
      .from('try_on_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['pending', 'processing']);

    if (error) {
      logger.error('Failed to get active sessions count', error, { userId });
      return 0;
    }

    return count || 0;
  }

  private static getMonthlyResetDate(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }

  private static updateTierLimits(
    tier: TierConfig,
    _action: string
  ): TierLimits {
    // This would update the tier_limits JSON field in the database
    // Implementation depends on the specific database schema
    return {
      clothing_items: tier.limits.clothing_items,
      try_ons_per_month: tier.limits.try_ons_per_month,
      current_month_usage: 0, // This would be incremented appropriately
      current_month: new Date().toISOString().slice(0, 7),
    };
  }

  private static getDefaultTierLimits(tier: UserTier): TierLimits {
    const config = TIER_CONFIGS[tier];
    return {
      clothing_items: config.limits.clothing_items,
      try_ons_per_month: config.limits.try_ons_per_month,
      current_month_usage: 0,
      current_month: new Date().toISOString().slice(0, 7),
    };
  }

  /**
   * Get tier configuration by tier name
   */
  static getTierConfig(tier: UserTier): TierConfig {
    return TIER_CONFIGS[tier];
  }
}
