/**
 * User Tier Status API Route
 * Returns user's current tier and usage information
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';
import { TierService } from '@/lib/services/tierService';

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

    // Get user tier and usage information
    const [tierConfig, usageStats] = await Promise.all([
      TierService.getUserTier(user.id),
      TierService.getUserUsage(user.id),
    ]);

    return NextResponse.json({
      tier: tierConfig.name,
      limits: tierConfig.limits,
      usage: {
        active_sessions: usageStats.active_sessions,
        clothing_items_used: usageStats.clothing_items_used,
        try_ons_this_month: usageStats.try_ons_this_month,
        storage_used_gb: usageStats.storage_used_gb,
      },
      monthly_reset_date: usageStats.monthly_reset_date,
    });
  } catch (error) {
    console.error('Tier status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get tier status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
