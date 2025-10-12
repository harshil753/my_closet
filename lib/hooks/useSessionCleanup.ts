/**
 * Session Cleanup Hook
 * Provides session cleanup functionality for React components
 */

import { useCallback } from 'react';

export function useSessionCleanup() {
  /**
   * Clean up old sessions for the current user
   */
  const cleanupSessions = useCallback(async (): Promise<{
    success: boolean;
    cleaned: number;
    error?: string;
  }> => {
    try {
      console.log('Cleaning up sessions via hook...');

      const response = await fetch('/api/try-on/cleanup-sessions', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Session cleanup failed');
      }

      const result = await response.json();

      if (result.cleaned > 0) {
        console.log(`✅ Hook: Cleaned ${result.cleaned} old sessions`);
      }

      return {
        success: true,
        cleaned: result.cleaned,
      };
    } catch (error) {
      console.error('Session cleanup hook error:', error);
      return {
        success: false,
        cleaned: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, []);

  /**
   * Check if cleanup is needed and perform it
   */
  const checkAndCleanup = useCallback(async (): Promise<boolean> => {
    const result = await cleanupSessions();
    return result.success;
  }, [cleanupSessions]);

  return {
    cleanupSessions,
    checkAndCleanup,
  };
}
