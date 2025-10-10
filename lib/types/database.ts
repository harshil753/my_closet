/**
 * Database types for Supabase
 * Generated types for the database schema
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
          preferences: Record<string, any> | null;
          tier: 'free' | 'premium';
          tier_limits: {
            clothing_items: number;
            try_ons_per_month: number;
            current_month_usage: number;
            current_month: string;
          } | null;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
          preferences?: Record<string, any> | null;
          tier?: 'free' | 'premium';
          tier_limits?: {
            clothing_items: number;
            try_ons_per_month: number;
            current_month_usage: number;
            current_month: string;
          } | null;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
          preferences?: Record<string, any> | null;
          tier?: 'free' | 'premium';
          tier_limits?: {
            clothing_items: number;
            try_ons_per_month: number;
            current_month_usage: number;
            current_month: string;
          } | null;
        };
      };
      clothing_items: {
        Row: {
          id: string;
          user_id: string;
          category: 'shirts_tops' | 'pants_bottoms' | 'shoes';
          name: string;
          image_url: string;
          thumbnail_url: string;
          uploaded_at: string;
          is_active: boolean;
          metadata: Record<string, any> | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: 'shirts_tops' | 'pants_bottoms' | 'shoes';
          name: string;
          image_url: string;
          thumbnail_url: string;
          uploaded_at?: string;
          is_active?: boolean;
          metadata?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: 'shirts_tops' | 'pants_bottoms' | 'shoes';
          name?: string;
          image_url?: string;
          thumbnail_url?: string;
          uploaded_at?: string;
          is_active?: boolean;
          metadata?: Record<string, any> | null;
        };
      };
      user_base_photos: {
        Row: {
          id: string;
          user_id: string;
          image_url: string;
          image_type: 'front' | 'side' | 'full_body';
          is_active: boolean;
          metadata: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          image_url: string;
          image_type: 'front' | 'side' | 'full_body';
          is_active?: boolean;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          image_url?: string;
          image_type?: 'front' | 'side' | 'full_body';
          is_active?: boolean;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
      };
      try_on_sessions: {
        Row: {
          id: string;
          user_id: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          metadata: Record<string, any> | null;
          created_at: string;
          completed_at: string | null;
          result_image_url: string | null;
          processing_time: number | null;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          metadata?: Record<string, any> | null;
          created_at?: string;
          completed_at?: string | null;
          result_image_url?: string | null;
          processing_time?: number | null;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          metadata?: Record<string, any> | null;
          created_at?: string;
          completed_at?: string | null;
          result_image_url?: string | null;
          processing_time?: number | null;
          error_message?: string | null;
        };
      };
      migrations: {
        Row: {
          id: number;
          name: string;
          executed_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          executed_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          executed_at?: string;
        };
      };
    };
    Functions: {
      exec_sql: {
        Args: {
          sql: string;
        };
        Returns: void;
      };
      check_tier_limits: {
        Args: {
          p_user_id: string;
          p_limit_type: 'clothing_items' | 'try_ons_per_month';
        };
        Returns: boolean;
      };
      update_monthly_usage: {
        Args: {
          p_user_id: string;
        };
        Returns: void;
      };
    };
  };
}
