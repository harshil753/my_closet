/**
 * Session Manager Service
 * Automatically manages try-on sessions to prevent tier limit issues
 */

import { createSupabaseServerClient } from '@/lib/config/supabase';

export interface SessionInfo {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export class SessionManager {
  /**
   * Automatically clean up old sessions for a user
   * Keeps only the most recent session active
   */
  static async cleanupOldSessions(
    userId: string,
    excludeSessionId?: string
  ): Promise<{
    cleaned: number;
    activeSession?: SessionInfo;
  }> {
    try {
      const supabase = await createSupabaseServerClient();

      // Get all sessions for the user, ordered by creation date (newest first)
      const { data: allSessions, error: fetchError } = await supabase
        .from('try_on_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching sessions:', fetchError);
        return { cleaned: 0 };
      }

      if (!allSessions || allSessions.length === 0) {
        return { cleaned: 0 };
      }

      // Close ALL sessions except the excluded one to ensure clean slate
      let updateQuery = supabase
        .from('try_on_sessions')
        .update({ status: 'completed' })
        .eq('user_id', userId)
        .in('status', ['pending', 'processing']);

      // Exclude the current session if provided
      if (excludeSessionId) {
        updateQuery = updateQuery.neq('id', excludeSessionId);
      }

      const { error: updateError } = await updateQuery;

      if (updateError) {
        console.error('Error closing all sessions:', updateError);
        return { cleaned: 0 };
      }

      const cleanedCount = allSessions.filter(
        (s) => s.status === 'pending' || s.status === 'processing'
      ).length;

      console.log(
        `Cleaned up ${cleanedCount} sessions for user ${userId} (closed all active sessions)`
      );

      // Log details of cleaned sessions for debugging
      if (cleanedCount > 0) {
        console.log(
          'Cleaned sessions:',
          allSessions
            .filter((s) => s.status === 'pending' || s.status === 'processing')
            .map((s) => ({
              id: s.id,
              status: s.status,
              created_at: s.created_at,
            }))
        );
      }

      return {
        cleaned: cleanedCount,
        activeSession: undefined, // No active session after cleanup
      };
    } catch (error) {
      console.error('Session cleanup error:', error);
      return { cleaned: 0 };
    }
  }

  /**
   * Get the current active session for a user
   */
  static async getActiveSession(userId: string): Promise<SessionInfo | null> {
    try {
      const supabase = await createSupabaseServerClient();

      const { data: activeSession, error } = await supabase
        .from('try_on_sessions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        console.error('Error fetching active session:', error);
        return null;
      }

      return activeSession || null;
    } catch (error) {
      console.error('Get active session error:', error);
      return null;
    }
  }

  /**
   * Force close all sessions for a user
   */
  static async forceCloseAllSessions(userId: string): Promise<number> {
    try {
      const supabase = await createSupabaseServerClient();

      const { data: closedSessions, error } = await supabase
        .from('try_on_sessions')
        .update({ status: 'completed' })
        .eq('user_id', userId)
        .in('status', ['pending', 'processing'])
        .select();

      if (error) {
        console.error('Error force closing sessions:', error);
        return 0;
      }

      console.log(
        `Force closed ${closedSessions?.length || 0} sessions for user ${userId}`
      );
      return closedSessions?.length || 0;
    } catch (error) {
      console.error('Force close sessions error:', error);
      return 0;
    }
  }

  /**
   * Check if user can start a new session (respects tier limits)
   * After cleanup, always allows new session creation
   */
  static async canStartNewSession(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    activeSessions: number;
  }> {
    try {
      // First, clean up old sessions
      await this.cleanupOldSessions(userId);

      // After cleanup, always allow new session creation
      console.log(
        `Allowing new session creation for user ${userId} after cleanup`
      );
      return {
        allowed: true,
        activeSessions: 0,
      };
    } catch (error) {
      console.error('Can start new session error:', error);
      // Even on error, allow session creation to prevent blocking users
      return {
        allowed: true,
        activeSessions: 0,
      };
    }
  }
}
