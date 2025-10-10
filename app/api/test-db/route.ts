/**
 * Test Database Connection
 *
 * Simple endpoint to test database connectivity and table structure
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data,
    });
  } catch (error) {
    console.error('Error testing database:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
        details: error,
      },
      { status: 500 }
    );
  }
}
