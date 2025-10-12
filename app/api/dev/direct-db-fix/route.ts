/**
 * Development API Route - Direct Database Fix
 * This route directly manipulates the database to fix the tier limit issue
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

    console.log('Direct DB fix for user:', user.id);

    // Use admin client for direct database access
    const adminSupabase = createSupabaseAdminClient();

    // First, let's see what's actually in the database
    const { data: allSessions, error: fetchError } = await adminSupabase
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

    console.log('All sessions found:', allSessions?.length || 0);
    console.log(
      'Session details:',
      allSessions?.map((s) => ({
        id: s.id,
        status: s.status,
        created_at: s.created_at,
      }))
    );

    // Try multiple approaches to clear sessions
    const results = [];

    // Approach 1: Update all sessions to completed
    try {
      const { data: updateResult1, error: updateError1 } = await adminSupabase
        .from('try_on_sessions')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select();

      results.push({
        approach: 'Update to completed',
        success: !updateError1,
        error: updateError1,
        updated: updateResult1?.length || 0,
      });
    } catch (err) {
      results.push({
        approach: 'Update to completed',
        success: false,
        error: err,
      });
    }

    // Approach 2: Delete all sessions (more aggressive)
    try {
      const { data: deleteResult, error: deleteError } = await adminSupabase
        .from('try_on_sessions')
        .delete()
        .eq('user_id', user.id)
        .select();

      results.push({
        approach: 'Delete all sessions',
        success: !deleteError,
        error: deleteError,
        deleted: deleteResult?.length || 0,
      });
    } catch (err) {
      results.push({
        approach: 'Delete all sessions',
        success: false,
        error: err,
      });
    }

    // Approach 3: Update specific statuses
    try {
      const { data: updateResult3, error: updateError3 } = await adminSupabase
        .from('try_on_sessions')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing', 'failed'])
        .select();

      results.push({
        approach: 'Update specific statuses',
        success: !updateError3,
        error: updateError3,
        updated: updateResult3?.length || 0,
      });
    } catch (err) {
      results.push({
        approach: 'Update specific statuses',
        success: false,
        error: err,
      });
    }

    // Check final state
    const { data: finalSessions, error: finalError } = await adminSupabase
      .from('try_on_sessions')
      .select('*')
      .eq('user_id', user.id);

    console.log('Final sessions count:', finalSessions?.length || 0);

    return NextResponse.json({
      success: true,
      message: 'Direct DB fix attempted',
      userId: user.id,
      initialSessions: allSessions?.length || 0,
      finalSessions: finalSessions?.length || 0,
      results: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Direct DB fix error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
