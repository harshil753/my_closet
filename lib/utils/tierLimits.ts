/**
 * Tier limit checking utilities and middleware
 * Provides convenient functions for checking and enforcing tier limits
 */

import React from 'react';
import { TierService } from '../services/tierService';
import { TierLimitError } from './errors';
import { logger } from './logger';

export interface TierLimitCheck {
  allowed: boolean;
  reason?: string | undefined;
  upgradeRequired?: boolean | undefined;
  currentUsage: number;
  limit: number;
  remaining: number;
}

/**
 * Tier limit checking utilities
 */
export class TierLimitChecker {
  /**
   * Check if user can upload clothing items
   */
  static async checkClothingUpload(userId: string): Promise<TierLimitCheck> {
    const tier = await TierService.getUserTier(userId);
    const usage = await TierService.getUserUsage(userId);

    const allowed = usage.clothing_items_used < tier.limits.clothing_items;
    const remaining = tier.limits.clothing_items - usage.clothing_items_used;

    return {
      allowed,
      reason: allowed
        ? undefined
        : `Clothing items limit reached (${usage.clothing_items_used}/${tier.limits.clothing_items})`,
      upgradeRequired: !allowed && tier.name === 'free',
      currentUsage: usage.clothing_items_used,
      limit: tier.limits.clothing_items,
      remaining: Math.max(0, remaining),
    };
  }

  /**
   * Check if user can start a try-on session
   */
  static async checkTryOn(userId: string): Promise<TierLimitCheck> {
    const tier = await TierService.getUserTier(userId);
    const usage = await TierService.getUserUsage(userId);

    const allowed = usage.try_ons_this_month < tier.limits.try_ons_per_month;
    const remaining = tier.limits.try_ons_per_month - usage.try_ons_this_month;

    return {
      allowed,
      reason: allowed
        ? undefined
        : `Monthly try-ons limit reached (${usage.try_ons_this_month}/${tier.limits.try_ons_per_month})`,
      upgradeRequired: !allowed && tier.name === 'free',
      currentUsage: usage.try_ons_this_month,
      limit: tier.limits.try_ons_per_month,
      remaining: Math.max(0, remaining),
    };
  }

  /**
   * Check if user can start a concurrent session
   */
  static async checkConcurrentSession(userId: string): Promise<TierLimitCheck> {
    const tier = await TierService.getUserTier(userId);
    const usage = await TierService.getUserUsage(userId);

    const allowed = usage.active_sessions < tier.limits.concurrent_sessions;
    const remaining = tier.limits.concurrent_sessions - usage.active_sessions;

    return {
      allowed,
      reason: allowed
        ? undefined
        : `Concurrent sessions limit reached (${usage.active_sessions}/${tier.limits.concurrent_sessions})`,
      upgradeRequired: !allowed && tier.name === 'free',
      currentUsage: usage.active_sessions,
      limit: tier.limits.concurrent_sessions,
      remaining: Math.max(0, remaining),
    };
  }

  /**
   * Enforce clothing upload limit
   */
  static async enforceClothingUpload(userId: string): Promise<void> {
    const check = await this.checkClothingUpload(userId);

    if (!check.allowed) {
      const tier = await TierService.getUserTier(userId);
      const usage = await TierService.getUserUsage(userId);

      throw new TierLimitError(
        'clothing_items',
        usage.clothing_items_used,
        tier.limits.clothing_items,
        {
          userId,
          action: 'clothing_upload',
          upgradeRequired: check.upgradeRequired,
        }
      );
    }
  }

  /**
   * Enforce try-on limit
   */
  static async enforceTryOn(userId: string): Promise<void> {
    const check = await this.checkTryOn(userId);

    if (!check.allowed) {
      const tier = await TierService.getUserTier(userId);
      const usage = await TierService.getUserUsage(userId);

      throw new TierLimitError(
        'try_ons_per_month',
        usage.try_ons_this_month,
        tier.limits.try_ons_per_month,
        {
          userId,
          action: 'try_on',
          upgradeRequired: check.upgradeRequired,
        }
      );
    }
  }

  /**
   * Enforce concurrent session limit
   */
  static async enforceConcurrentSession(userId: string): Promise<void> {
    const check = await this.checkConcurrentSession(userId);

    if (!check.allowed) {
      const tier = await TierService.getUserTier(userId);
      const usage = await TierService.getUserUsage(userId);

      throw new TierLimitError(
        'concurrent_sessions',
        usage.active_sessions,
        tier.limits.concurrent_sessions,
        {
          userId,
          action: 'concurrent_session',
          upgradeRequired: check.upgradeRequired,
        }
      );
    }
  }

  /**
   * Get user's tier status and limits
   */
  static async getUserTierStatus(userId: string): Promise<{
    tier: string;
    limits: {
      clothing_items: TierLimitCheck;
      try_ons: TierLimitCheck;
      concurrent_sessions: TierLimitCheck;
    };
    usage: {
      clothing_items_used: number;
      try_ons_this_month: number;
      active_sessions: number;
    };
    upgradeOptions: Awaited<ReturnType<typeof TierService.getUpgradeOptions>>;
  }> {
    const [
      tier,
      usage,
      clothingCheck,
      tryOnCheck,
      sessionCheck,
      upgradeOptions,
    ] = await Promise.all([
      TierService.getUserTier(userId),
      TierService.getUserUsage(userId),
      this.checkClothingUpload(userId),
      this.checkTryOn(userId),
      this.checkConcurrentSession(userId),
      TierService.getUpgradeOptions(userId),
    ]);

    return {
      tier: tier.name,
      limits: {
        clothing_items: clothingCheck,
        try_ons: tryOnCheck,
        concurrent_sessions: sessionCheck,
      },
      usage: {
        clothing_items_used: usage.clothing_items_used,
        try_ons_this_month: usage.try_ons_this_month,
        active_sessions: usage.active_sessions,
      },
      upgradeOptions,
    };
  }

  /**
   * Check if user needs to upgrade for a specific action
   */
  static async needsUpgrade(userId: string): Promise<boolean> {
    const tier = await TierService.getUserTier(userId);

    if (tier.name === 'premium') {
      return false; // Already at highest tier
    }

    const checks = await Promise.all([
      this.checkClothingUpload(userId),
      this.checkTryOn(userId),
      this.checkConcurrentSession(userId),
    ]);

    return checks.some((check) => !check.allowed && check.upgradeRequired);
  }

  /**
   * Get upgrade recommendations for user
   */
  static async getUpgradeRecommendations(userId: string): Promise<{
    recommended: boolean;
    reasons: string[];
    benefits: string[];
  }> {
    const tier = await TierService.getUserTier(userId);
    const usage = await TierService.getUserUsage(userId);

    if (tier.name === 'premium') {
      return {
        recommended: false,
        reasons: [],
        benefits: [],
      };
    }

    const reasons: string[] = [];
    const benefits: string[] = [];

    // Check clothing items usage
    if (usage.clothing_items_used >= tier.limits.clothing_items * 0.8) {
      reasons.push(
        `You're using ${Math.round((usage.clothing_items_used / tier.limits.clothing_items) * 100)}% of your clothing items limit`
      );
      benefits.push('Store up to 1000 clothing items');
    }

    // Check try-ons usage
    if (usage.try_ons_this_month >= tier.limits.try_ons_per_month * 0.8) {
      reasons.push(
        `You're using ${Math.round((usage.try_ons_this_month / tier.limits.try_ons_per_month) * 100)}% of your monthly try-ons`
      );
      benefits.push('1000 try-ons per month');
    }

    // Check concurrent sessions
    if (usage.active_sessions >= tier.limits.concurrent_sessions) {
      reasons.push("You've reached your concurrent sessions limit");
      benefits.push('Run up to 3 concurrent try-on sessions');
    }

    return {
      recommended: reasons.length > 0,
      reasons,
      benefits: [
        ...benefits,
        'Priority support',
        'Advanced analytics',
        '10GB storage',
      ],
    };
  }
}

/**
 * Middleware for API routes to check tier limits
 */
export function withTierLimitCheck(
  action: 'clothing_upload' | 'try_on' | 'concurrent_session'
) {
  return async function tierLimitMiddleware(
    req: { user?: { id: string } },
    res: {
      status: (code: number) => {
        json: (data: unknown) => unknown;
      };
    },
    next: () => void
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Check tier limits
      await TierService.enforceTierLimit(userId, action);

      // Track usage
      await TierService.trackUsage(userId, action);

      next();
    } catch (error) {
      if (error instanceof TierLimitError) {
        return res.status(402).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.context,
            upgradeRequired: error.context?.upgradeRequired,
          },
        });
      }

      logger.error('Tier limit middleware error', error as Error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
}

/**
 * React hook for tier limit checking
 */
export function useTierLimits(userId: string) {
  const [tierStatus, setTierStatus] = React.useState<Awaited<
    ReturnType<typeof TierLimitChecker.getUserTierStatus>
  > | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!userId) return;

    const loadTierStatus = async () => {
      try {
        setLoading(true);
        const status = await TierLimitChecker.getUserTierStatus(userId);
        setTierStatus(status);
        setError(null);
      } catch (err) {
        setError(err as Error);
        logger.error('Failed to load tier status', err as Error, { userId });
      } finally {
        setLoading(false);
      }
    };

    loadTierStatus();
  }, [userId]);

  const checkLimit = React.useCallback(
    async (action: string) => {
      try {
        switch (action) {
          case 'clothing_upload':
            return await TierLimitChecker.checkClothingUpload(userId);
          case 'try_on':
            return await TierLimitChecker.checkTryOn(userId);
          case 'concurrent_session':
            return await TierLimitChecker.checkConcurrentSession(userId);
          default:
            throw new Error('Unknown action');
        }
      } catch (err) {
        logger.error('Failed to check tier limit', err as Error, {
          userId,
          action,
        });
        throw err;
      }
    },
    [userId]
  );

  const enforceLimit = React.useCallback(
    async (action: string) => {
      try {
        switch (action) {
          case 'clothing_upload':
            await TierLimitChecker.enforceClothingUpload(userId);
            break;
          case 'try_on':
            await TierLimitChecker.enforceTryOn(userId);
            break;
          case 'concurrent_session':
            await TierLimitChecker.enforceConcurrentSession(userId);
            break;
          default:
            throw new Error('Unknown action');
        }
      } catch (err) {
        logger.error('Failed to enforce tier limit', err as Error, {
          userId,
          action,
        });
        throw err;
      }
    },
    [userId]
  );

  return {
    tierStatus,
    loading,
    error,
    checkLimit,
    enforceLimit,
    needsUpgrade:
      tierStatus?.limits &&
      Object.values(tierStatus.limits).some(
        (limit) => !limit.allowed && limit.upgradeRequired
      ),
  };
}
