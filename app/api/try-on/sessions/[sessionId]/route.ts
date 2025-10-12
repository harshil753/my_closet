import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
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

    const { sessionId } = await params;

    // Fetch the specific session
    const { data: session, error: sessionError } = await supabase
      .from('try_on_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      return NextResponse.json(
        {
          error: 'Session not found',
          details: sessionError.message,
        },
        { status: 404 }
      );
    }

    // Get count of selected items for this session
    const { count: itemCount } = await supabase
      .from('try_on_session_items')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    // Map database fields to frontend expected fields
    const mappedSession = {
      ...session,
      result_url: session.result_image_url, // Map result_image_url to result_url for frontend
      selected_items: Array(itemCount || 0).fill({}), // Create array with correct length for display
    };

    return NextResponse.json({
      success: true,
      session: mappedSession,
    });
  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
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

    const { sessionId } = await params;
    const body = await request.json();
    const { status, result_url, error_message } = body;

    // Update the session (only update fields that exist in the schema)
    const updateData: any = {
      status,
    };

    // Only add result_url if the column exists
    if (result_url) {
      updateData.result_url = result_url;
    }

    // Only add error_message if the column exists
    if (error_message) {
      updateData.error_message = error_message;
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('try_on_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to update session',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
