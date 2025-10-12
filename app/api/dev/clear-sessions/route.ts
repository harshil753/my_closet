/**
 * Development API Route - Clear Active Sessions
 * This route helps clear active sessions for development/testing
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

    // Update all active sessions to 'completed' status
    const { data: sessions, error: updateError } = await supabase
      .from('try_on_sessions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .select();

    if (updateError) {
      console.error('Error clearing sessions:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to clear sessions',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${sessions?.length || 0} active sessions`,
      sessions: sessions || [],
    });
  } catch (error) {
    console.error('Clear sessions error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
