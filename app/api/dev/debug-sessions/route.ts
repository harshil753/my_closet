/**
 * Development API Route - Debug Sessions
 * This route helps debug session and tier limit issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';
import { TierLimitChecker } from '@/lib/utils/tierLimits';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all sessions for the user
    const { data: allSessions, error: sessionsError } = await supabase
      .from('try_on_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      return NextResponse.json(
        {
          error: 'Failed to fetch sessions',
          details: sessionsError.message,
        },
        { status: 500 }
      );
    }

    // Get active sessions (pending or processing)
    const activeSessions =
      allSessions?.filter(
        (session) =>
          session.status === 'pending' || session.status === 'processing'
      ) || [];

    // Check tier limits manually
    let tierCheckResult = null;
    try {
      await TierLimitChecker.enforceConcurrentSession(user.id);
      tierCheckResult = {
        status: 'PASSED',
        message: 'No concurrent session limit exceeded',
      };
    } catch (error) {
      tierCheckResult = {
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error,
      };
    }

    return NextResponse.json({
      userId: user.id,
      totalSessions: allSessions?.length || 0,
      activeSessions: activeSessions.length,
      allSessions:
        allSessions?.map((s) => ({
          id: s.id,
          status: s.status,
          created_at: s.created_at,
          updated_at: s.updated_at,
        })) || [],
      activeSessionsDetails: activeSessions.map((s) => ({
        id: s.id,
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
      tierCheckResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Debug sessions error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
