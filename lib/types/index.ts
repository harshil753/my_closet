/**
 * Type Definitions Export
 * Centralized exports for all TypeScript types and interfaces
 */

// Clothing types
export * from './clothing';

// User types
export * from './user';

// Try-on types
export * from './try-on';

// Re-export commonly used types
export type {
  ClothingItem,
  ClothingCategory,
  ClothingSize,
  ClothingColor,
  ClothingBrand,
  ClothingCondition,
  ClothingSeason,
  ClothingMaterial,
  ClothingMetadata,
  CreateClothingItemInput,
  UpdateClothingItemInput,
  ClothingItemQuery,
  ClothingItemResponse,
  ClothingItemStats,
  ClothingItemValidation,
} from './clothing';

export type {
  UserProfile,
  UserTier,
  UserPreferences,
  UserTierLimits,
  CreateUserInput,
  UpdateUserInput,
  UserAuthResult,
  UserSession,
  UserActivity,
  UserStats,
  UserTierChange,
  UserDataExport,
  UserDataDeletionRequest,
  UserValidation,
} from './user';

export type {
  TryOnSession,
  TryOnSessionStatus,
  TryOnSessionPriority,
  TryOnSessionItem,
  CreateTryOnSessionInput,
  UpdateTryOnSessionInput,
  TryOnSessionQuery,
  TryOnSessionResponse,
  TryOnResult,
  CreateTryOnResultInput,
  TryOnResultQuery,
  TryOnResultResponse,
  TryOnSessionStats,
  TryOnSessionValidation,
  TryOnSessionRetryConfig,
  TryOnSessionQueueItem,
  TryOnSessionBatch,
  TryOnSessionExport,
} from './try-on';

// Utility types
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
};

export type PaginatedResponse<T = any> = {
  items: T[];
  total: number;
  has_more: boolean;
  next_offset?: number;
  prev_offset?: number;
};

export type SortOrder = 'asc' | 'desc';

export type SortField<T = any> = keyof T;

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'like'
  | 'ilike'
  | 'regex'
  | 'is_null'
  | 'is_not_null';

export type FilterCondition<T = any> = {
  field: keyof T;
  operator: FilterOperator;
  value: any;
};

export type QueryOptions<T = any> = {
  filters?: FilterCondition<T>[];
  sort?: {
    field: SortField<T>;
    order: SortOrder;
  }[];
  limit?: number;
  offset?: number;
  search?: string;
};

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Database entity base type
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Timestamp utilities
export type Timestamp = string; // ISO 8601 format
export type DateString = string; // YYYY-MM-DD format
export type DateTimeString = string; // YYYY-MM-DDTHH:mm:ss.sssZ format

// ID utilities
export type UUID = string;
export type ID = string | number;

// File and media types
export interface FileUpload {
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  url: string;
  thumbnail_url?: string;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ApiError extends AppError {
  status: number;
  path: string;
  method: string;
}

// Event types
export interface AppEvent<T = any> {
  type: string;
  payload: T;
  timestamp: string;
  source: string;
}

// Configuration types
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  storage: {
    maxFileSize: number;
    allowedTypes: string[];
    bucket: string;
  };
  ai: {
    model: string;
    maxProcessingTime: number;
    retryAttempts: number;
  };
  features: {
    enableAnalytics: boolean;
    enableNotifications: boolean;
    enableSocialSharing: boolean;
  };
}

// Theme types
export type Theme = 'light' | 'dark' | 'auto';

export interface ThemeConfig {
  mode: Theme;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}
