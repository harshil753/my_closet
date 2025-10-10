/**
 * Supabase client configuration
 * Centralized Supabase setup with proper environment handling
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '../config/environment';

/**
 * Client-side Supabase client for browser usage
 * Re-export from the main client file to avoid duplication
 */
export { supabase } from './client';

/**
 * Client component Supabase client with SSR support
 * Re-export from the main client file to avoid duplication
 */
export { createSupabaseClient } from './client';

/**
 * Server component Supabase client with SSR support
 */
export const createSupabaseServerClient = async () => {
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
 * Re-export from main client file to avoid duplication
 */
export { supabaseAdmin } from './client';

/**
 * Database table names
 */
export const tables = {
  users: 'users',
  clothingItems: 'clothing_items',
  tryOnSessions: 'try_on_sessions',
  userBasePhotos: 'user_base_photos',
  tryOnSessionItems: 'try_on_session_items',
} as const;
