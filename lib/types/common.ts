/**
 * Common types and utilities used across the application
 */

// Base entity interface with common fields
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

// User subscription tiers
export type UserTier = 'free' | 'premium';

// Image types for base photos
export type ImageType = 'front' | 'side' | 'full_body';

// Clothing categories
export type ClothingCategory = 'shirts_tops' | 'pants_bottoms' | 'shoes';

// Try-on session status
export type TryOnStatus = 'pending' | 'processing' | 'completed' | 'failed';

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// Paginated response
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// File upload metadata
export interface FileMetadata {
  filename: string;
  size: number;
  mimeType: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

// Tier limits configuration
export interface TierLimits {
  clothing_items: number;
  try_ons_per_month: number;
  current_month_usage: number;
  current_month: string;
}

// User preferences
export interface UserPreferences {
  notifications?: {
    email: boolean;
    push: boolean;
  };
  privacy?: {
    profile_public: boolean;
    show_closet: boolean;
  };
  display?: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Validation error
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
