/**
 * Try-On Sessions API Routes
 * Implements creation and listing of try-on sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';
import {
  ErrorHandler,
  ValidationError,
  TierLimitError,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import { TierLimitChecker } from '@/lib/utils/tierLimits';
import { UsageTracker } from '@/lib/middleware/usage-tracking';
import { SessionManager } from '@/lib/services/sessionManager';

/**
 * POST /api/try-on/sessions
 * Create try-on session
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const clothing_item_ids = Array.isArray(body?.clothing_item_ids)
      ? (body.clothing_item_ids as string[])
      : [];

    // Validate input
    if (!clothing_item_ids || clothing_item_ids.length === 0) {
      throw new ValidationError('clothing_item_ids array is required');
    }

    if (clothing_item_ids.length > 5) {
      throw new ValidationError(
        'A maximum of 5 clothing items can be selected'
      );
    }

    // Automatically clean up old sessions before creating new one
    console.log(
      `Auto-cleaning old sessions for user ${user.id} before creating new try-on`
    );
    const cleanupResult = await SessionManager.cleanupOldSessions(user.id);
    console.log(`Cleaned up ${cleanupResult.cleaned} old sessions`);

    // Force close any remaining active sessions to ensure new session can be created
    console.log(
      `Force closing any remaining active sessions for user ${user.id}`
    );
    const forceCloseResult = await SessionManager.forceCloseAllSessions(
      user.id
    );
    console.log(`Force closed ${forceCloseResult} remaining sessions`);

    // Skip session check - always allow new session creation after cleanup
    console.log(`Proceeding with new session creation for user ${user.id}`);

    // Enforce tier limits (monthly try-ons only - concurrent sessions handled by SessionManager)
    await TierLimitChecker.enforceTryOn(user.id);

    // Validate that clothing items belong to the user and are active
    const { data: items, error: itemsError } = await supabase
      .from('clothing_items')
      .select('id')
      .eq('user_id', user.id)
      .in('id', clothing_item_ids)
      .eq('is_active', true);

    if (itemsError) {
      logger.error('Failed to validate clothing items', itemsError, {
        userId: user.id,
      });
      throw new ValidationError('Failed to validate clothing items');
    }

    if (!items || items.length !== clothing_item_ids.length) {
      throw new ValidationError('Some clothing items are invalid or inactive');
    }

    // Create session in pending state
    const { data: session, error: createError } = await supabase
      .from('try_on_sessions')
      .insert({
        user_id: user.id,
        status: 'pending',
        metadata: {},
      })
      .select()
      .single();

    if (createError || !session) {
      logger.error('Failed to create try-on session', createError as any, {
        userId: user.id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Create session items
    const sessionItems = clothing_item_ids.map((cid) => ({
      session_id: session.id,
      clothing_item_id: cid,
    }));

    console.log('Linking clothing items to session:', {
      sessionId: session.id,
      clothingItemIds: clothing_item_ids,
      sessionItems,
    });

    const { error: linkError } = await supabase
      .from('try_on_session_items')
      .insert(sessionItems);

    if (linkError) {
      console.error('Failed to link clothing items to session:', linkError);
      logger.error('Failed to link clothing items to session', linkError, {
        userId: user.id,
        sessionId: session.id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to link clothing items' },
        { status: 500 }
      );
    }

    console.log('Successfully linked clothing items to session');

    // Track usage
    await UsageTracker.trackTryOnStart(user.id, session.id);

    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof TierLimitError) {
      const { statusCode, response } = ErrorHandler.handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

/**
 * GET /api/try-on/sessions
 * Get user try-on sessions with optional status filter and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // For listing, allow optional query filter; require auth for user context
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit cannot exceed 100' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('try_on_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: sessions, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch try-on sessions', error, {
        userId: user.id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sessions || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
