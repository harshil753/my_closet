/**
 * Development API Route - Check if user_base_photos table exists
 * This route helps debug table existence issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to query the table to see if it exists
    const { data, error } = await supabase
      .from('user_base_photos')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json({
        tableExists: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
      });
    }

    return NextResponse.json({
      tableExists: true,
      message: 'user_base_photos table exists and is accessible',
    });
  } catch (error) {
    console.error('Table check error:', error);
    return NextResponse.json(
      {
        tableExists: false,
        error: 'Failed to check table',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
