/**
 * Supabase exports
 * Centralized exports for all Supabase-related functionality
 */

export {
  supabase,
  createSupabaseClient,
  supabaseAdmin,
  storageConfig,
  tables,
  storagePolicies,
  validateFileUpload,
  getAuthenticatedUser,
  isAuthenticated,
} from './client';

export { createSupabaseServerClient } from './supabase-client';

// Re-export types from database client
export type {
  DatabaseResult,
  UserProfile,
  ClothingItem,
  UserBasePhoto,
  TryOnSession,
} from '../database/supabase-client';

// Re-export database service
export { DatabaseService, databaseService } from '../database/supabase-client';
