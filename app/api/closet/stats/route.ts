/**
 * Closet Stats API Route
 * Provides statistics and summary data for the user's closet
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/config/supabase';
import { ErrorHandler } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/closet/stats
 * Get closet statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // For now, use admin client to bypass RLS issues
    // TODO: Implement proper authentication
    const supabase = createSupabaseAdminClient();

    // Get user ID from query params for now (temporary solution)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    console.log('Getting closet stats for user:', userId);

    // Get total items count
    const { data: items, error: itemsError } = await supabase
      .from('clothing_items')
      .select('id, category, uploaded_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (itemsError) {
      logger.error('Failed to fetch clothing items for stats', itemsError, {
        userId,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch closet statistics' },
        { status: 500 }
      );
    }

    // Calculate category counts
    const categoryCounts: Record<string, number> = {};
    items?.forEach((item: { category: string }) => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });

    // Get recent items (last 5)
    const recentItems =
      items
        ?.sort(
          (a: { uploaded_at: string }, b: { uploaded_at: string }) =>
            new Date(b.uploaded_at).getTime() -
            new Date(a.uploaded_at).getTime()
        )
        .slice(0, 5) || [];

    // For now, favorite items are just recent items
    // TODO: Implement proper favorites system
    const favoriteItems = recentItems.slice(0, 3);

    const stats = {
      totalItems: items?.length || 0,
      categoryCounts,
      recentItems,
      favoriteItems,
      shirtsTopsCount: categoryCounts.shirts_tops || 0,
    };

    logger.info('Closet stats fetched', {
      userId,
      totalItems: stats.totalItems,
      categoryCounts,
    });

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
