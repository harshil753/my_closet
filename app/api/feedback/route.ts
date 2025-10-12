import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';
import { logger } from '@/lib/utils/logger';
import { AnalyticsService } from '@/lib/services/analytics';
import { GlobalErrorHandler } from '@/lib/utils/global-error-handler';

interface FeedbackData {
  type: 'bug' | 'feature' | 'general' | 'rating';
  rating?: number;
  subject: string;
  message: string;
  email?: string;
  userAgent?: string;
  url?: string;
}

/**
 * Feedback API Endpoint
 * Handles user feedback submissions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get authenticated user (optional)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const body: FeedbackData = await request.json();

    // Validate required fields
    if (!body.subject || !body.message) {
      return NextResponse.json(
        { success: false, error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    // Validate feedback type
    const validTypes = ['bug', 'feature', 'general', 'rating'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (body.rating && (body.rating < 1 || body.rating > 5)) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Get client IP
    const clientIP =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Insert feedback into database
    const { data: feedback, error: insertError } = await supabase
      .from('user_feedback')
      .insert({
        user_id: user?.id || null,
        type: body.type,
        rating: body.rating,
        subject: body.subject,
        message: body.message,
        email: body.email,
        user_agent: body.userAgent,
        url: body.url,
        ip_address: clientIP,
        status: 'new',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to insert feedback', insertError, {
        userId: user?.id,
        feedbackType: body.type,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    // Track feedback submission in analytics
    await AnalyticsService.trackEvent({
      event: 'feedback_submitted',
      userId: user?.id,
      properties: {
        type: body.type,
        rating: body.rating,
        hasEmail: !!body.email,
      },
    });

    // Track feature usage
    await AnalyticsService.trackFeatureUsage(
      'feedback',
      'submit',
      user?.id,
      undefined,
      {
        type: body.type,
        rating: body.rating,
      }
    );

    logger.info('Feedback submitted successfully', {
      feedbackId: feedback.id,
      userId: user?.id,
      type: body.type,
      rating: body.rating,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: feedback.id,
        message: 'Feedback submitted successfully',
      },
    });
  } catch (error) {
    logger.error('Feedback submission error', error);
    return GlobalErrorHandler.createErrorResponse(error, {
      endpoint: '/api/feedback',
      method: 'POST',
    });
  }
}

/**
 * Get feedback for admin users
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

    // Check if user is admin
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('user_feedback')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: feedback, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch feedback', error, { userId: user.id });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: feedback || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    logger.error('Feedback fetch error', error);
    return GlobalErrorHandler.createErrorResponse(error, {
      endpoint: '/api/feedback',
      method: 'GET',
    });
  }
}
