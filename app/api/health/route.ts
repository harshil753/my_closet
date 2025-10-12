import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';

/**
 * Health Check API Endpoint
 * Provides system health status for monitoring and load balancers
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Check database connectivity
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    const dbStatus = error ? 'unhealthy' : 'healthy';
    const responseTime = Date.now() - startTime;

    // Check environment variables
    const envStatus = {
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      gemini: !!process.env.GEMINI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
    };

    const overallStatus =
      dbStatus === 'healthy' && envStatus.supabase && envStatus.gemini
        ? 'healthy'
        : 'unhealthy';

    return NextResponse.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV,
        services: {
          database: {
            status: dbStatus,
            responseTime: `${responseTime}ms`,
          },
          environment: envStatus,
        },
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      },
      {
        status: overallStatus === 'healthy' ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
