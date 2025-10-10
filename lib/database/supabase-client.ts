/**
 * Supabase database client and utilities
 * Centralized database operations with proper error handling
 */

import { supabaseAdmin } from '@/lib/config/supabase';

/**
 * Database operation result
 */
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

/**
 * User profile type
 */
export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  preferences: Record<string, any>;
  tier: 'free' | 'premium';
  tier_limits: {
    clothing_items: number;
    try_ons_per_month: number;
    current_month_usage: number;
    current_month: string;
  };
}

/**
 * Clothing item type
 */
export interface ClothingItem {
  id: string;
  user_id: string;
  category: 'shirts_tops' | 'pants_bottoms' | 'shoes';
  name: string;
  image_url: string;
  thumbnail_url: string;
  uploaded_at: string;
  is_active: boolean;
  metadata: Record<string, any>;
}

/**
 * User base photo type
 */
export interface UserBasePhoto {
  id: string;
  user_id: string;
  image_url: string;
  image_type: 'front' | 'side' | 'full_body';
  uploaded_at: string;
  is_active: boolean;
  metadata: Record<string, any>;
}

/**
 * Try-on session type
 */
export interface TryOnSession {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  result_image_url?: string;
  processing_time?: number;
  error_message?: string;
  metadata: Record<string, any>;
}

/**
 * Database service class
 */
export class DatabaseService {
  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<DatabaseResult<UserProfile>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as UserProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<DatabaseResult<UserProfile>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as UserProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      };
    }
  }

  /**
   * Get user's clothing items
   */
  async getClothingItems(
    userId: string,
    category?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DatabaseResult<ClothingItem[]>> {
    try {
      let query = supabaseAdmin
        .from('clothing_items')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error, count } = await query;

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as ClothingItem[],
        count: count || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      };
    }
  }

  /**
   * Create clothing item
   */
  async createClothingItem(
    userId: string,
    item: Omit<ClothingItem, 'id' | 'user_id' | 'uploaded_at'>
  ): Promise<DatabaseResult<ClothingItem>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('clothing_items')
        .insert({
          ...item,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as ClothingItem,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      };
    }
  }

  /**
   * Delete clothing item
   */
  async deleteClothingItem(
    userId: string,
    itemId: string
  ): Promise<DatabaseResult<void>> {
    try {
      const { error } = await supabaseAdmin
        .from('clothing_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      };
    }
  }

  /**
   * Get user's base photos
   */
  async getUserBasePhotos(userId: string): Promise<DatabaseResult<UserBasePhoto[]>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_base_photos')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as UserBasePhoto[],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      };
    }
  }

  /**
   * Create user base photo
   */
  async createUserBasePhoto(
    userId: string,
    photo: Omit<UserBasePhoto, 'id' | 'user_id' | 'uploaded_at'>
  ): Promise<DatabaseResult<UserBasePhoto>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_base_photos')
        .insert({
          ...photo,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as UserBasePhoto,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      };
    }
  }

  /**
   * Create try-on session
   */
  async createTryOnSession(
    userId: string,
    session: Omit<TryOnSession, 'id' | 'user_id' | 'created_at'>
  ): Promise<DatabaseResult<TryOnSession>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('try_on_sessions')
        .insert({
          ...session,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as TryOnSession,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      };
    }
  }

  /**
   * Update try-on session
   */
  async updateTryOnSession(
    sessionId: string,
    updates: Partial<TryOnSession>
  ): Promise<DatabaseResult<TryOnSession>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('try_on_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as TryOnSession,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      };
    }
  }

  /**
   * Check tier limits
   */
  async checkTierLimits(
    userId: string,
    limitType: 'clothing_items' | 'try_ons_per_month'
  ): Promise<DatabaseResult<boolean>> {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('check_tier_limits', {
          p_user_id: userId,
          p_limit_type: limitType,
        });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as boolean,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      };
    }
  }

  /**
   * Update monthly usage
   */
  async updateMonthlyUsage(userId: string): Promise<DatabaseResult<void>> {
    try {
      const { error } = await supabaseAdmin
        .rpc('update_monthly_usage', {
          p_user_id: userId,
        });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      };
    }
  }
}

// Create global instance
export const databaseService = new DatabaseService();
