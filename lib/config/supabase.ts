/**
 * Supabase client configuration
 * Centralized Supabase setup with proper environment handling
 */

import { createServerClient } from '@supabase/ssr';
import { env } from './environment';

/**
 * Client component Supabase client with SSR support
 * Re-export from main client file to avoid duplication
 */
export { createSupabaseClient, supabase } from '../supabase/client';

/**
 * Server component Supabase client with SSR support
 * This creates a new instance for each request (server-side only)
 * This is correct behavior for server components
 */
export const createSupabaseServerClient = async () => {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component context - this is expected
        }
      },
    },
  });
};

/**
 * Admin Supabase client with service role key
 * Only available server-side to prevent client-side GoTrueClient conflicts
 */
export const createSupabaseAdminClient = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'my-closet-virtual-try-on-admin-server',
      },
    },
  });
};

/**
 * Export admin client instance for backward compatibility
 */
export const supabaseAdmin = createSupabaseAdminClient();

/**
 * Storage configuration
 */
export const storageConfig = {
  bucket: env.supabase.storageBucket,
  publicUrl: (path: string) =>
    `${env.supabase.url}/storage/v1/object/public/${env.supabase.storageBucket}/${path}`,
};

/**
 * Database table names
 */
export const tables = {
  users: 'users',
  clothingItems: 'clothing_items',
  tryOnSessions: 'try_on_sessions',
  userBasePhotos: 'user_base_photos',
} as const;

/**
 * Storage bucket policies
 */
export const storagePolicies = {
  clothingImages: {
    bucket: env.supabase.storageBucket,
    folder: 'clothing',
    maxFileSize: env.app.uploadMaxSize,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  basePhotos: {
    bucket: env.supabase.storageBucket,
    folder: 'base-photos',
    maxFileSize: env.app.uploadMaxSize,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  tryOnResults: {
    bucket: env.supabase.storageBucket,
    folder: 'try-on-results',
    maxFileSize: env.app.uploadMaxSize,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
} as const;
