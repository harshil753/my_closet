/**
 * Development API Route - Find Hidden Session
 * This route directly queries the database to find sessions that might be causing the tier limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';

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

    // Get ALL sessions for the user (no filtering)
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

    // Get sessions that the tier checker would count as "active"
    const tierCheckerActiveSessions =
      allSessions?.filter(
        (session) =>
          session.status === 'pending' || session.status === 'processing'
      ) || [];

    // Get sessions that might be in other states
    const otherSessions =
      allSessions?.filter(
        (session) =>
          session.status !== 'pending' && session.status !== 'processing'
      ) || [];

    return NextResponse.json({
      userId: user.id,
      totalSessions: allSessions?.length || 0,
      tierCheckerActiveCount: tierCheckerActiveSessions.length,
      tierCheckerActiveSessions: tierCheckerActiveSessions.map((s) => ({
        id: s.id,
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
      otherSessions: otherSessions.map((s) => ({
        id: s.id,
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
      allSessions:
        allSessions?.map((s) => ({
          id: s.id,
          status: s.status,
          created_at: s.created_at,
          updated_at: s.updated_at,
        })) || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Find hidden session error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
