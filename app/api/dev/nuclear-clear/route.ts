/**
 * Development API Route - Nuclear Clear
 * This route uses admin client to forcefully clear ALL sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from '@/lib/config/supabase';

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

    console.log('Nuclear clear for user:', user.id);

    // Use admin client for more direct access
    const adminSupabase = createSupabaseAdminClient();

    // Get all sessions first
    const { data: allSessions, error: fetchError } = await adminSupabase
      .from('try_on_sessions')
      .select('*')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('Error fetching sessions with admin client:', fetchError);
      return NextResponse.json(
        {
          error: 'Failed to fetch sessions',
          details: fetchError.message,
        },
        { status: 500 }
      );
    }

    console.log('Found sessions with admin client:', allSessions?.length || 0);

    if (!allSessions || allSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sessions found to clear',
        totalSessionsFound: 0,
        sessionsUpdated: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Force update ALL sessions to 'completed' status using admin client
    const { data: updatedSessions, error: updateError } = await adminSupabase
      .from('try_on_sessions')
      .update({
        status: 'completed',
      })
      .eq('user_id', user.id)
      .select();

    if (updateError) {
      console.error(
        'Error force clearing sessions with admin client:',
        updateError
      );
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

    console.log(
      'Successfully updated sessions with admin client:',
      updatedSessions?.length || 0
    );

    return NextResponse.json({
      success: true,
      message: `Nuclear cleared ${updatedSessions?.length || 0} sessions`,
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
    console.error('Nuclear clear error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
