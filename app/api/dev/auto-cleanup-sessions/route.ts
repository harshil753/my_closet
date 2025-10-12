/**
 * Development API Route - Auto Cleanup Sessions
 * Automatically cleans up old sessions and keeps only the most recent one
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';
import { SessionManager } from '@/lib/services/sessionManager';

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

    console.log('Auto cleanup sessions for user:', user.id);

    // Clean up old sessions
    const result = await SessionManager.cleanupOldSessions(user.id);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.cleaned} old sessions`,
      cleaned: result.cleaned,
      activeSession: result.activeSession,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Auto cleanup sessions error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
