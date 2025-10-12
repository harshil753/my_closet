/**
 * Development API Route - Check All Sessions
 * This route shows ALL sessions in the database to identify cross-instance issues
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from '@/lib/config/supabase';

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

    console.log('Checking all sessions for user:', user.id);

    // Use admin client to see ALL sessions
    const adminSupabase = createSupabaseAdminClient();

    // Get all sessions for this user
    const { data: allSessions, error: fetchError } = await adminSupabase
      .from('try_on_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching sessions:', fetchError);
      return NextResponse.json(
        {
          error: 'Failed to fetch sessions',
          details: fetchError.message,
        },
        { status: 500 }
      );
    }

    // Categorize sessions by status
    const sessionsByStatus = {
      pending: allSessions?.filter((s) => s.status === 'pending') || [],
      processing: allSessions?.filter((s) => s.status === 'processing') || [],
      completed: allSessions?.filter((s) => s.status === 'completed') || [],
      failed: allSessions?.filter((s) => s.status === 'failed') || [],
      other:
        allSessions?.filter(
          (s) =>
            !['pending', 'processing', 'completed', 'failed'].includes(s.status)
        ) || [],
    };

    // Show recent sessions with details
    const recentSessions =
      allSessions?.slice(0, 10).map((s) => ({
        id: s.id,
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
        // Show if this might be from Vercel (recent creation)
        isRecent:
          new Date(s.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      })) || [];

    return NextResponse.json({
      success: true,
      userId: user.id,
      totalSessions: allSessions?.length || 0,
      sessionsByStatus: {
        pending: sessionsByStatus.pending.length,
        processing: sessionsByStatus.processing.length,
        completed: sessionsByStatus.completed.length,
        failed: sessionsByStatus.failed.length,
        other: sessionsByStatus.other.length,
      },
      activeSessions:
        sessionsByStatus.pending.length + sessionsByStatus.processing.length,
      recentSessions: recentSessions,
      message:
        'This shows ALL sessions across all app instances (local + Vercel)',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Check all sessions error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
