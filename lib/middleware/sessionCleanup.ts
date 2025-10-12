/**
 * Session Cleanup Middleware
 * Automatically cleans up old sessions when user accesses the app
 */

import { createSupabaseServerClient } from '@/lib/config/supabase';
import { SessionManager } from '@/lib/services/sessionManager';

export class SessionCleanupMiddleware {
  /**
   * Clean up sessions for a user
   * Called when user accesses the app
   */
  static async cleanupUserSessions(userId: string): Promise<{
    cleaned: number;
    success: boolean;
  }> {
    try {
      console.log(
        `Session cleanup middleware: Cleaning sessions for user ${userId}`
      );

      const result = await SessionManager.cleanupOldSessions(userId);

      if (result.cleaned > 0) {
        console.log(
          `✅ Session cleanup middleware: Cleaned ${result.cleaned} old sessions for user ${userId}`
        );
      }

      return {
        cleaned: result.cleaned,
        success: true,
      };
    } catch (error) {
      console.error('Session cleanup middleware error:', error);
      return {
        cleaned: 0,
        success: false,
      };
    }
  }

  /**
   * Check if user has active sessions and clean them up
   */
  static async checkAndCleanupSessions(userId: string): Promise<boolean> {
    try {
      const supabase = await createSupabaseServerClient();

      // Check for active sessions
      const { data: activeSessions, error } = await supabase
        .from('try_on_sessions')
        .select('id, status, created_at')
        .eq('user_id', userId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking active sessions:', error);
        return false;
      }

      if (!activeSessions || activeSessions.length <= 1) {
        // No cleanup needed
        return true;
      }

      // Clean up old sessions
      const cleanupResult = await this.cleanupUserSessions(userId);
      return cleanupResult.success;
    } catch (error) {
      console.error('Check and cleanup sessions error:', error);
      return false;
    }
  }
}
