import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check Gemini configuration
 * Access: GET /api/dev/gemini-status
 *
 * Note: Rate limiting has been disabled for development
 */
export async function GET(request: NextRequest) {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      geminiEnabled: process.env.GEMINI_ENABLED !== 'false',
      apiKeySet: !!process.env.GEMINI_API_KEY,
      apiKeyValue: process.env.GEMINI_API_KEY
        ? process.env.GEMINI_API_KEY.substring(0, 10) + '...'
        : 'NOT SET',
      rateLimiting: 'DISABLED for development',
      cooldowns: 'DISABLED for development',
      canMakeCall: true,
      message:
        'All rate limiting and cooldowns have been removed for development',
    };

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}
