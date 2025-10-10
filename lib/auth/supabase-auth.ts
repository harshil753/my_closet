/**
 * Supabase Authentication utilities
 * Centralized authentication handling with proper error management
 */

import { supabase } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/config/supabase';
import { User } from '@supabase/supabase-js';

/**
 * Authentication result types
 */
export interface AuthResult {
  success: boolean;
  user?: User | null;
  error?: string;
  data?: any;
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // User profile will be created automatically by database trigger
    // No need to manually create it here

    return {
      success: true,
      user: data.user,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // User profile should exist from database trigger
    // If it doesn't exist, it will be created on next login attempt

    return {
      success: true,
      user: data.user,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signOut();

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
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Get the current user session
 */
export async function getCurrentUser(): Promise<AuthResult> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Get the current user session (server-side)
 */
export async function getCurrentUserServer(): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Reset password for a user
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
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
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
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
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Authentication error messages
 */
export const authErrorMessages = {
  invalidCredentials: 'Invalid email or password',
  userNotFound: 'No account found with this email',
  emailAlreadyExists: 'An account with this email already exists',
  weakPassword: 'Password must be at least 6 characters long',
  invalidEmail: 'Please enter a valid email address',
  networkError: 'Network error. Please check your connection',
  sessionExpired: 'Your session has expired. Please sign in again',
  tooManyRequests: 'Too many attempts. Please try again later',
} as const;
