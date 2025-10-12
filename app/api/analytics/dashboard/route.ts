import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';
import { AnalyticsService } from '@/lib/services/analytics';
import { logger } from '@/lib/utils/logger';

/**
 * Analytics Dashboard API
 * Provides analytics data for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Check authentication
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

    // Check if user is admin (you can implement your own admin check)
    const { data: userProfile } = await supabase
      .from('users')
      .select('tier')
      .eq('id', user.id)
      .single();

    if (userProfile?.tier !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const startDate = new Date(
      searchParams.get('startDate') ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const endDate = new Date(searchParams.get('endDate') || new Date());

    // Get dashboard data
    const dashboardData = await AnalyticsService.getDashboardData(
      startDate,
      endDate
    );

    // Get additional metrics
    const { data: topPages } = await supabase
      .from('analytics_events')
      .select('properties')
      .eq('event', 'page_view')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    const pageCounts: Record<string, number> = {};
    topPages?.forEach((event) => {
      const page = event.properties?.page;
      if (page) {
        pageCounts[page] = (pageCounts[page] || 0) + 1;
      }
    });

    const topPagesList = Object.entries(pageCounts)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get error rates
    const { count: totalEvents } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    const { count: errorEvents } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event', 'error')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    const errorRate = totalEvents ? (errorEvents || 0) / totalEvents : 0;

    // Get user growth
    const { data: userGrowth } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    const userGrowthData =
      userGrowth?.map((user, index) => ({
        date: user.created_at,
        cumulative: index + 1,
      })) || [];

    return NextResponse.json({
      success: true,
      data: {
        ...dashboardData,
        topPages: topPagesList,
        errorRate,
        userGrowth: userGrowthData,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Analytics dashboard error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
