/**
 * Development API Route - Debug Session
 * Check what clothing items are linked to a specific session
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

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    console.log('Debugging session:', sessionId);

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('try_on_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found', details: sessionError },
        { status: 404 }
      );
    }

    // Get session items
    const { data: sessionItems, error: sessionItemsError } = await supabase
      .from('try_on_session_items')
      .select('clothing_item_id')
      .eq('session_id', sessionId);

    // Get clothing item details
    let clothingItems = [];
    if (sessionItems && sessionItems.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('clothing_items')
        .select('id, name, category, image_url')
        .in(
          'id',
          sessionItems.map((item) => item.clothing_item_id)
        );

      clothingItems = items || [];
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        created_at: session.created_at,
        metadata: session.metadata,
      },
      sessionItems: sessionItems || [],
      clothingItems: clothingItems,
      debug: {
        sessionItemsError,
        sessionItemsCount: sessionItems?.length || 0,
        clothingItemsCount: clothingItems.length,
      },
    });
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
