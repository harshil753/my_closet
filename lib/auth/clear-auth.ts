/**
 * Clear Authentication Data
 *
 * Utility functions to clear cached authentication data for testing
 */

import { createSupabaseClient } from '@/lib/supabase/client';

/**
 * Clear all authentication data from localStorage and sessionStorage
 */
export function clearAuthData() {
  // Clear localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('auth'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // Clear sessionStorage
  const sessionKeysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('auth'))) {
      sessionKeysToRemove.push(key);
    }
  }
  sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));

  console.log('Authentication data cleared');
}

/**
 * Sign out and clear all auth data
 */
export async function signOutAndClear() {
  try {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    clearAuthData();
    console.log('Signed out and cleared auth data');
  } catch (error) {
    console.error('Error signing out:', error);
    // Still clear local data even if signOut fails
    clearAuthData();
  }
}

/**
 * Clear auth data and reload the page
 */
export function clearAuthAndReload() {
  clearAuthData();
  window.location.reload();
}
