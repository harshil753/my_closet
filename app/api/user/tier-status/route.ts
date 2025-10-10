/**
 * User Tier Status API Route
 *
 * Returns the current user's tier information and usage limits
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's tier information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tier, created_at')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    // Get clothing items count
    const { count: clothingCount, error: countError } = await supabase
      .from('clothing_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Error counting clothing items:', countError);
      return NextResponse.json(
        { success: false, error: 'Failed to count clothing items' },
        { status: 500 }
      );
    }

    // Determine tier limits
    const tier = userData?.tier || 'free';
    const limits = {
      free: {
        clothing_items: { limit: 10, allowed: (clothingCount || 0) < 10 },
      },
      premium: {
        clothing_items: { limit: 100, allowed: (clothingCount || 0) < 100 },
      },
    };

    const tierLimits = limits[tier as keyof typeof limits] || limits.free;
    const clothingLimit = tierLimits.clothing_items;
    const percentage = Math.round(
      ((clothingCount || 0) / clothingLimit.limit) * 100
    );

    const response = {
      success: true,
      data: {
        tier,
        usage: {
          clothing_items_used: clothingCount || 0,
        },
        limits: {
          clothing_items: {
            limit: clothingLimit.limit,
            allowed: clothingLimit.allowed,
            percentage,
            reason: !clothingLimit.allowed
              ? `You've reached your limit of ${clothingLimit.limit} clothing items. Upgrade to Premium for more storage.`
              : null,
          },
        },
        upgradeAvailable: tier === 'free',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Tier status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
