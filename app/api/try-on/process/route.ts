import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';
import { TryOnProcessor } from '@/lib/ai/try-on-processor';
import { SessionManager } from '@/lib/services/sessionManager';
import {
  ErrorHandler,
  ValidationError,
  TierLimitError,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

// Force Node.js runtime for fs, stream, and other Node.js modules
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('Authentication failed in try-on process', authError || undefined, {
        endpoint: '/api/try-on/process',
      });
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId } = body;

    // Validate input
    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      throw new ValidationError('Session ID must be a non-empty string');
    }

    // Get the session details first
    const { data: session, error: sessionError } = await supabase
      .from('try_on_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      logger.error('Session not found or access denied', sessionError || undefined, {
        userId: user.id,
        sessionId,
      });
      return NextResponse.json(
        { success: false, error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Idempotency: if already processing or completed, do not start again
    if (session.status === 'processing') {
      logger.info('Session already processing', { sessionId, userId: user.id });
      return NextResponse.json({
        success: true,
        message: 'Already processing',
        sessionId: session.id,
      });
    }

    if (session.status === 'completed') {
      logger.info('Session already completed', { sessionId, userId: user.id });
      return NextResponse.json({
        success: true,
        message: 'Already completed',
        sessionId: session.id,
        resultUrl: session.result_image_url,
      });
    }

    if (session.status === 'failed') {
      logger.info('Session previously failed, allowing retry', {
        sessionId,
        userId: user.id,
        errorMessage: session.error_message,
      });
    }

    // Clean up old sessions AFTER verifying current session is valid
    // This prevents interfering with the current session
    await SessionManager.cleanupOldSessions(user.id, sessionId);

    // Get user's base photo - try multiple sources
    let basePhotoUrl = null;

    console.log('Looking for base photo for user:', user.id);

    // First, try to get from user_base_photos table
    const { data: basePhotos, error: basePhotoError } = await supabase
      .from('user_base_photos')
      .select('image_url, is_primary')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    console.log('user_base_photos query result:', {
      basePhotos,
      basePhotoError,
    });

    if (basePhotos && !basePhotoError) {
      basePhotoUrl = basePhotos.image_url;
      logger.info('Found base photo from user_base_photos', {
        userId: user.id,
        basePhotoUrl: basePhotoUrl.substring(0, 50) + '...',
      });
    } else {
      console.log(
        'No primary base photo found in user_base_photos, trying any base photo...'
      );

      // Try to get any base photo for this user (not just primary)
      const { data: anyBasePhoto, error: anyBasePhotoError } = await supabase
        .from('user_base_photos')
        .select('image_url')
        .eq('user_id', user.id)
        .single();

      console.log('Any base photo query result:', {
        anyBasePhoto,
        anyBasePhotoError,
      });

      if (anyBasePhoto && !anyBasePhotoError) {
        basePhotoUrl = anyBasePhoto.image_url;
        logger.info('Found base photo from user_base_photos (any photo)', {
          userId: user.id,
          basePhotoUrl: basePhotoUrl.substring(0, 50) + '...',
        });
      } else {
        console.log(
          'No base photo found in user_base_photos, trying user preferences...'
        );

        // If no base photo in user_base_photos, try to get from user profile
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        console.log('user preferences query result:', {
          userProfile,
          profileError,
        });

        if (
          userProfile &&
          userProfile.preferences &&
          userProfile.preferences.avatar_url
        ) {
          basePhotoUrl = userProfile.preferences.avatar_url;
          logger.info('Found base photo from user preferences', {
            userId: user.id,
            basePhotoUrl: basePhotoUrl.substring(0, 50) + '...',
          });
        }
      }
    }

    if (!basePhotoUrl) {
      logger.error('No base photo found for user', undefined, { userId: user.id });
      throw new ValidationError(
        'No base photo found. Please upload a base photo in your profile settings first.'
      );
    }

    // Get selected clothing items from try_on_session_items table
    const { data: sessionItems, error: sessionItemsError } = await supabase
      .from('try_on_session_items')
      .select('clothing_item_id')
      .eq('session_id', sessionId);

    if (sessionItemsError) {
      logger.error('Failed to fetch session items', sessionItemsError, {
        userId: user.id,
        sessionId,
      });
      throw new ValidationError('Failed to fetch session items');
    }

    if (!sessionItems || sessionItems.length === 0) {
      logger.error('No clothing items found for session', undefined, {
        userId: user.id,
        sessionId,
      });
      throw new ValidationError('No clothing items selected for this session');
    }

    logger.info('Found session items', {
      userId: user.id,
      sessionId,
      itemCount: sessionItems.length,
    });

    // Fetch clothing item details
    const { data: clothingItems, error: clothingError } = await supabase
      .from('clothing_items')
      .select('id, image_url, category, name')
      .in(
        'id',
        sessionItems.map((item) => item.clothing_item_id)
      );

    if (clothingError) {
      logger.error('Failed to fetch clothing items', clothingError, {
        userId: user.id,
        sessionId,
      });
      throw new ValidationError('Failed to fetch clothing items');
    }

    if (!clothingItems || clothingItems.length === 0) {
      logger.error('No clothing items found in database', undefined, {
        userId: user.id,
        sessionId,
      });
      throw new ValidationError('Selected clothing items not found');
    }

    logger.info('Found clothing items for processing', {
      userId: user.id,
      sessionId,
      clothingItems: clothingItems.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
      })),
    });

    // Update session status to processing
    const { error: updateError } = await supabase
      .from('try_on_sessions')
      .update({ status: 'processing' })
      .eq('id', sessionId);

    if (updateError) {
      logger.error(
        'Failed to update session status to processing',
        updateError,
        {
          userId: user.id,
          sessionId,
        }
      );
      throw new ValidationError('Failed to update session status');
    }

    logger.info('Starting AI processing', {
      userId: user.id,
      sessionId,
      basePhotoUrl: basePhotoUrl.substring(0, 50) + '...',
      clothingItemCount: clothingItems.length,
    });

    console.log('About to call TryOnProcessor.processTryOn with:', {
      sessionId,
      userId: user.id,
      basePhotoUrl: basePhotoUrl.substring(0, 50) + '...',
      clothingItems: clothingItems.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
      })),
    });

    // Process with AI
    const result = await TryOnProcessor.processTryOn({
      sessionId,
      userId: user.id,
      basePhotoUrl: basePhotoUrl,
      clothingItems: clothingItems.map((item) => ({
        id: item.id,
        imageUrl: item.image_url,
        category: item.category,
        name: item.name,
      })),
    });

    console.log('TryOnProcessor returned:', result);

    if (!result.success) {
      logger.error('AI processing failed', undefined, {
        userId: user.id,
        sessionId,
      });

      // Update session to failed
      await supabase
        .from('try_on_sessions')
        .update({
          status: 'failed',
          error_message: result.error,
        })
        .eq('id', sessionId);

      throw new ValidationError(result.error || 'AI processing failed');
    }

    logger.info('AI processing completed successfully', {
      userId: user.id,
      sessionId,
      processingTime: result.processingTime,
      resultUrl: result.resultUrl?.substring(0, 50) + '...',
    });

    // Debug: Log the full result URL
    console.log('Full result URL from AI processing:', result.resultUrl);

    // Update session to completed with result
    console.log('Updating session with result URL:', result.resultUrl);
    const { data: updatedSession, error: completionError } = await supabase
      .from('try_on_sessions')
      .update({
        status: 'completed',
        result_image_url: result.resultUrl,
        completed_at: new Date().toISOString(),
        processing_time: result.processingTime,
      })
      .eq('id', sessionId)
      .select();

    console.log('Database update result:', { updatedSession, completionError });

    if (completionError) {
      logger.error('Error updating session to completed', completionError, {
        userId: user.id,
        sessionId,
      });

      // Try updating without result_image_url if column doesn't exist
      const { error: fallbackError } = await supabase
        .from('try_on_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          processing_time: result.processingTime,
        })
        .eq('id', sessionId);

      if (fallbackError) {
        logger.error('Fallback update also failed', fallbackError, {
          userId: user.id,
          sessionId,
        });
        throw new ValidationError('Failed to update session status');
      } else {
        logger.info('Session updated to completed (without result_image_url)', {
          userId: user.id,
          sessionId,
        });
      }
    } else {
      logger.info('Session successfully updated to completed', {
        userId: user.id,
        sessionId,
        updatedSession: updatedSession?.[0]?.id,
      });
      console.log(
        'Session successfully updated with result URL:',
        result.resultUrl
      );
    }

    console.log('Returning API response with resultUrl:', result.resultUrl);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        status: 'completed',
        resultUrl: result.resultUrl,
        processingTime: result.processingTime,
        completedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Try-on processing error', error instanceof Error ? error : undefined, {
      endpoint: '/api/try-on/process',
    });

    if (error instanceof ValidationError) {
      const { statusCode, response } = ErrorHandler.handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }

    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
