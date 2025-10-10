/**
 * Supabase client configuration for lib/supabase/
 * Centralized Supabase client setup with proper environment handling
 */

import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/config/environment';
import { Database } from '@/lib/types/database';

/**
 * Global singleton instances to prevent multiple GoTrueClient warnings
 */
let supabaseBrowserInstance: ReturnType<typeof createBrowserClient> | null =
  null;

/**
 * Single client-side Supabase client for browser usage
 * Use this for ALL client-side operations in React components
 * Returns singleton instance to prevent multiple GoTrueClient warnings
 */
const getSupabaseClient = () => {
  if (!supabaseBrowserInstance) {
    console.log('Creating new Supabase client instance');
    supabaseBrowserInstance = createBrowserClient<Database>(
      env.supabase.url,
      env.supabase.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          headers: {
            'X-Client-Info': 'my-closet-virtual-try-on-singleton',
          },
        },
      }
    );
  } else {
    console.log('Reusing existing Supabase client instance');
  }
  return supabaseBrowserInstance;
};

/**
 * Client component Supabase client with SSR support
 * Use this in client components that need authentication
 * Returns a singleton instance to prevent multiple GoTrueClient warnings
 */
export const createSupabaseClient = () => {
  return getSupabaseClient();
};

/**
 * Default client export - use this for most client-side operations
 * Returns singleton instance to prevent multiple GoTrueClient warnings
 */
export const supabase = getSupabaseClient();

/**
 * Cleanup function to reset all singletons (useful for testing)
 */
export const resetSupabaseClients = () => {
  supabaseBrowserInstance = null;
  supabaseAdminInstance = null;
};

/**
 * Server component Supabase client with SSR support
 * Use this in server components and API routes
 * Moved to lib/supabase/server.ts to avoid client-side imports
 */

/**
 * Singleton Admin Supabase client instance
 * This prevents multiple GoTrueClient instances
 */
let supabaseAdminInstance: ReturnType<typeof createClient<Database>> | null =
  null;

/**
 * Admin Supabase client with service role key
 * Use only on server-side for administrative operations
 * WARNING: This client bypasses RLS policies
 * Returns singleton instance to prevent multiple GoTrueClient warnings
 */
const getSupabaseAdminInstance = () => {
  if (!supabaseAdminInstance) {
    console.log('Creating new Supabase admin client instance');
    supabaseAdminInstance = createClient<Database>(
      env.supabase.url,
      env.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            'X-Client-Info': 'my-closet-virtual-try-on-admin-singleton',
          },
        },
      }
    );
  } else {
    console.log('Reusing existing Supabase admin client instance');
  }
  return supabaseAdminInstance;
};

// Admin client should only be used server-side
export const supabaseAdmin = getSupabaseAdminInstance();

/**
 * Storage configuration and utilities
 */
export const storageConfig = {
  bucket: env.supabase.storageBucket,
  publicUrl: (path: string) =>
    `${env.supabase.url}/storage/v1/object/public/${env.supabase.storageBucket}/${path}`,
  uploadPath: (
    userId: string,
    type: 'clothing' | 'base-photos' | 'try-on-results',
    filename: string
  ) => `${type}/${userId}/${filename}`,
};

/**
 * Database table names as constants
 */
export const tables = {
  users: 'users',
  clothingItems: 'clothing_items',
  tryOnSessions: 'try_on_sessions',
  userBasePhotos: 'user_base_photos',
} as const;

/**
 * Storage bucket policies and validation
 */
export const storagePolicies = {
  clothingImages: {
    bucket: env.supabase.storageBucket,
    folder: 'clothing',
    maxFileSize: env.app.uploadMaxSize,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxWidth: 2048,
    maxHeight: 2048,
  },
  basePhotos: {
    bucket: env.supabase.storageBucket,
    folder: 'base-photos',
    maxFileSize: env.app.uploadMaxSize,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxWidth: 2048,
    maxHeight: 2048,
  },
  tryOnResults: {
    bucket: env.supabase.storageBucket,
    folder: 'try-on-results',
    maxFileSize: env.app.uploadMaxSize,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxWidth: 2048,
    maxHeight: 2048,
  },
} as const;

/**
 * Helper function to validate file uploads
 */
export function validateFileUpload(
  file: File,
  policy: (typeof storagePolicies)[keyof typeof storagePolicies]
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > policy.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${Math.round(policy.maxFileSize / 1024 / 1024)}MB`,
    };
  }

  // Check MIME type
  if (!policy.allowedMimeTypes.includes(file.type as any)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${policy.allowedMimeTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Helper function to get authenticated user
 */
export async function getAuthenticatedUser() {
  try {
    const { createSupabaseServerClient } = await import(
      '@/lib/config/supabase'
    );
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw new Error(`Authentication error: ${error.message}`);
    }

    return user;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Helper function to check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getAuthenticatedUser();
  return user !== null;
}
