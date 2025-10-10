/**
 * User Types and Models
 * TypeScript definitions for user-related entities
 */

/**
 * User tier enumeration
 */
export type UserTier = 'free' | 'premium';

/**
 * User preferences interface
 */
export interface UserPreferences {
  // Display preferences
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;

  // Notification preferences
  notifications?: {
    email?: boolean;
    push?: boolean;
    marketing?: boolean;
    updates?: boolean;
    reminders?: boolean;
  };

  // Privacy preferences
  privacy?: {
    profile_visibility?: 'public' | 'private' | 'friends';
    data_sharing?: boolean;
    analytics?: boolean;
  };

  // App preferences
  app?: {
    default_view?: 'grid' | 'list';
    items_per_page?: number;
    auto_upload?: boolean;
    image_quality?: 'low' | 'medium' | 'high';
  };

  // Custom preferences
  custom?: Record<string, any>;
}

/**
 * User tier limits interface
 */
export interface UserTierLimits {
  clothing_items: number;
  try_ons_per_month: number;
  current_month_usage: number;
  current_month: string;
  storage_limit_gb?: number;
  max_file_size_mb?: number;
  ai_processing_limit?: number;
}

/**
 * User profile interface
 */
export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  preferences: UserPreferences;
  tier: UserTier;
  tier_limits: UserTierLimits;

  // Optional fields
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  social_links?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };

  // Statistics
  stats?: {
    total_clothing_items: number;
    total_try_ons: number;
    account_age_days: number;
    last_active: string;
  };
}

/**
 * User creation input
 */
export interface CreateUserInput {
  email: string;
  display_name: string;
  password: string;
  preferences?: Partial<UserPreferences>;
}

/**
 * User update input
 */
export interface UpdateUserInput {
  display_name?: string;
  preferences?: Partial<UserPreferences>;
  bio?: string;
  location?: string;
  website?: string;
  social_links?: Partial<UserProfile['social_links']>;
}

/**
 * User authentication result
 */
export interface UserAuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  requires_verification?: boolean;
}

/**
 * User session interface
 */
export interface UserSession {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  device_info?: {
    user_agent: string;
    ip_address: string;
    location?: string;
  };
}

/**
 * User activity log
 */
export interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * User statistics
 */
export interface UserStats {
  total_clothing_items: number;
  total_try_ons: number;
  total_sessions: number;
  account_age_days: number;
  last_active: string;
  tier_usage: {
    clothing_items_used: number;
    clothing_items_remaining: number;
    try_ons_used_this_month: number;
    try_ons_remaining_this_month: number;
  };
  activity_summary: {
    items_uploaded_this_month: number;
    try_ons_this_month: number;
    most_used_category: string;
    favorite_brands: string[];
  };
}

/**
 * User tier upgrade/downgrade
 */
export interface UserTierChange {
  from_tier: UserTier;
  to_tier: UserTier;
  reason: string;
  effective_date: string;
  billing_cycle?: 'monthly' | 'yearly';
  price?: number;
}

/**
 * User data export
 */
export interface UserDataExport {
  user_profile: UserProfile;
  clothing_items: any[];
  try_on_sessions: any[];
  user_activities: UserActivity[];
  export_date: string;
  format: 'json' | 'csv' | 'xlsx';
}

/**
 * User data deletion request
 */
export interface UserDataDeletionRequest {
  user_id: string;
  reason: string;
  requested_at: string;
  processed_at?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

/**
 * User validation result
 */
export interface UserValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Type guards for user types
 */
export function isUserTier(value: string): value is UserTier {
  return ['free', 'premium'].includes(value);
}

/**
 * Utility functions for user management
 */
export const UserUtils = {
  /**
   * Get tier display name
   */
  getTierDisplayName(tier: UserTier): string {
    return tier === 'free' ? 'Free' : 'Premium';
  },

  /**
   * Check if user can perform action based on tier
   */
  canPerformAction(
    user: UserProfile,
    action: 'upload_item' | 'try_on' | 'bulk_upload'
  ): boolean {
    const limits = user.tier_limits;

    switch (action) {
      case 'upload_item':
        return limits.clothing_items > 0;
      case 'try_on':
        return limits.try_ons_per_month > limits.current_month_usage;
      case 'bulk_upload':
        return user.tier === 'premium';
      default:
        return false;
    }
  },

  /**
   * Get remaining usage for user
   */
  getRemainingUsage(user: UserProfile) {
    return {
      clothing_items: Math.max(0, user.tier_limits.clothing_items),
      try_ons_this_month: Math.max(
        0,
        user.tier_limits.try_ons_per_month -
          user.tier_limits.current_month_usage
      ),
    };
  },

  /**
   * Validate user profile
   */
  validateUserProfile(profile: Partial<UserProfile>): UserValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields validation
    if (!profile.email || !profile.email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (!profile.display_name || profile.display_name.trim().length < 2) {
      errors.push('Display name must be at least 2 characters');
    } else if (profile.display_name.length > 50) {
      errors.push('Display name must be 50 characters or less');
    }

    if (!profile.tier || !isUserTier(profile.tier)) {
      errors.push('Valid tier is required');
    }

    // Warnings
    if (!profile.avatar_url) {
      warnings.push('Consider adding a profile picture');
    }

    if (!profile.bio) {
      warnings.push('Consider adding a bio');
    }

    // Suggestions
    if (
      profile.tier === 'free' &&
      profile.tier_limits?.clothing_items &&
      profile.tier_limits.clothing_items >= 90
    ) {
      suggestions.push('Consider upgrading to Premium for more storage');
    }

    if (
      profile.tier === 'free' &&
      profile.tier_limits?.current_month_usage &&
      profile.tier_limits.current_month_usage >= 90
    ) {
      suggestions.push('Consider upgrading to Premium for more try-ons');
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  },

  /**
   * Generate user statistics
   */
  generateUserStats(user: UserProfile, activities: UserActivity[]): UserStats {
    const now = new Date();
    const createdDate = new Date(user.created_at);
    const accountAgeDays = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const thisMonth = now.toISOString().slice(0, 7); // YYYY-MM format
    const thisMonthActivities = activities.filter((activity) =>
      activity.created_at.startsWith(thisMonth)
    );

    return {
      total_clothing_items: user.tier_limits.clothing_items,
      total_try_ons: user.tier_limits.current_month_usage,
      total_sessions: activities.length,
      account_age_days: accountAgeDays,
      last_active: activities[0]?.created_at || user.created_at,
      tier_usage: {
        clothing_items_used: 0, // This would be calculated from actual data
        clothing_items_remaining: user.tier_limits.clothing_items,
        try_ons_used_this_month: user.tier_limits.current_month_usage,
        try_ons_remaining_this_month: Math.max(
          0,
          user.tier_limits.try_ons_per_month -
            user.tier_limits.current_month_usage
        ),
      },
      activity_summary: {
        items_uploaded_this_month: thisMonthActivities.filter(
          (a) => a.action === 'item_uploaded'
        ).length,
        try_ons_this_month: thisMonthActivities.filter(
          (a) => a.action === 'try_on_completed'
        ).length,
        most_used_category: 'shirts_tops', // This would be calculated from actual data
        favorite_brands: [], // This would be calculated from actual data
      },
    };
  },
};
