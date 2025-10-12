/**
 * Development API Route - Force Clear Sessions
 * This route forcefully clears ALL sessions for the user, regardless of status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';

export async function POST(request: NextRequest) {
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

    // First, get all sessions to see what we're working with
    const { data: allSessions, error: fetchError } = await supabase
      .from('try_on_sessions')
      .select('*')
      .eq('user_id', user.id);

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

    console.log('Found sessions:', allSessions?.length || 0);

    // Force update ALL sessions to 'completed' status
    const { data: updatedSessions, error: updateError } = await supabase
      .from('try_on_sessions')
      .update({
        status: 'completed',
      })
      .eq('user_id', user.id)
      .select();

    if (updateError) {
      console.error('Error force clearing sessions:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to force clear sessions',
          details: updateError.message,
          code: updateError.code,
          hint: updateError.hint,
        },
        { status: 500 }
      );
    }

    console.log('Successfully updated sessions:', updatedSessions?.length || 0);

    return NextResponse.json({
      success: true,
      message: `Force cleared ${updatedSessions?.length || 0} sessions`,
      totalSessionsFound: allSessions?.length || 0,
      sessionsUpdated: updatedSessions?.length || 0,
      clearedSessions:
        updatedSessions?.map((s) => ({
          id: s.id,
          status: s.status,
          created_at: s.created_at,
          updated_at: s.updated_at,
        })) || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Force clear sessions error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
