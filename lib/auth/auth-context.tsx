/**
 * Authentication Context Provider
 * Provides authentication state and methods throughout the application
 */

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  AuthResult,
} from './supabase-auth';

/**
 * Authentication context type
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  refreshUser: () => Promise<void>;
}

/**
 * Create authentication context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication provider component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    try {
      const result = await getCurrentUser();
      if (result.success) {
        setUser(result.user || null);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle authentication state changes
   */
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting initial session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in handler
   */
  const handleSignIn = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    const result = await signIn(email, password);
    if (result.success) {
      setUser(result.user || null);
    }
    return result;
  };

  /**
   * Sign up handler
   */
  const handleSignUp = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthResult> => {
    const result = await signUp(email, password, displayName);
    if (result.success) {
      setUser(result.user || null);
    }
    return result;
  };

  /**
   * Sign out handler
   */
  const handleSignOut = async (): Promise<AuthResult> => {
    const result = await signOut();
    if (result.success) {
      setUser(null);
    }
    return result;
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check if user is authenticated
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();

  return {
    isAuthenticated: !!user,
    isLoading: loading,
    user,
  };
}
