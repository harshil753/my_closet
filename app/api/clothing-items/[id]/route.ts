/**
 * Individual Clothing Item API Routes
 * Handles CRUD operations for a specific clothing item
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from '@/lib/config/supabase';
import { ErrorHandler } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/clothing-items/[id]
 * Retrieve a specific clothing item
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // For now, use admin client to bypass RLS issues
    // TODO: Implement proper authentication
    const supabase = createSupabaseAdminClient();

    const { id: itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'Item ID required' },
        { status: 400 }
      );
    }
    console.log('Getting clothing item:', itemId);

    // Get the specific item
    const { data: item, error } = await supabase
      .from('clothing_items')
      .select('*')
      .eq('id', itemId)
      .single();

    console.log('Item fetch result:', { item, error });

    if (error) {
      logger.error('Failed to fetch clothing item', error, {
        itemId,
      });
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    logger.info('Clothing item fetched', {
      itemId,
      name: item.name,
    });

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

/**
 * PUT /api/clothing-items/[id]
 * Update a specific clothing item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'Item ID required' },
        { status: 400 }
      );
    }
    console.log('Updating clothing item:', itemId, 'for user:', userId);

    // Parse request body
    const body = await request.json();
    const { name, category, metadata } = body;

    console.log('Update request body:', { name, category, metadata });

    // Validate input
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (
      !category ||
      !['shirts_tops', 'pants_bottoms', 'shoes'].includes(category)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid category. Must be one of: shirts_tops, pants_bottoms, shoes',
        },
        { status: 400 }
      );
    }

    // Check if item exists and belongs to user
    const { data: existingItem, error: checkError } = await supabase
      .from('clothing_items')
      .select('id, user_id, metadata')
      .eq('id', itemId)
      .single();

    console.log('Existing item check:', { existingItem, checkError });

    if (checkError || !existingItem) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    if (existingItem.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to edit this item',
        },
        { status: 403 }
      );
    }

    // Update the item
    const { data: updatedItem, error: updateError } = await supabase
      .from('clothing_items')
      .update({
        name,
        category,
        metadata: {
          ...(existingItem.metadata || {}),
          ...metadata,
        },
      })
      .eq('id', itemId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.log('Update error:', updateError);
      logger.error('Failed to update clothing item', updateError, {
        itemId,
        userId: userId,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to update item' },
        { status: 500 }
      );
    }

    logger.info('Clothing item updated', {
      itemId,
      userId: userId,
      name: updatedItem.name,
      category: updatedItem.category,
    });

    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    console.log('Unexpected error in PUT /api/clothing-items/[id]:', error);
    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

/**
 * DELETE /api/clothing-items/[id]
 * Delete a specific clothing item
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'Item ID required' },
        { status: 400 }
      );
    }

    // Check if item exists and belongs to user
    const { data: existingItem, error: checkError } = await supabase
      .from('clothing_items')
      .select('id, user_id, image_url, thumbnail_url')
      .eq('id', itemId)
      .single();

    if (checkError || !existingItem) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    if (existingItem.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to delete this item',
        },
        { status: 403 }
      );
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('clothing_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (deleteError) {
      logger.error('Failed to delete clothing item', deleteError, {
        itemId,
        userId: user.id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to delete item' },
        { status: 500 }
      );
    }

    // Clean up storage files (async)
    try {
      // Extract file path from URL
      const imagePath = existingItem.image_url.split(
        '/storage/v1/object/public/clothing-images/'
      )[1];
      const thumbnailPath = existingItem.thumbnail_url.split(
        '/storage/v1/object/public/clothing-images/'
      )[1];

      // Delete files from storage
      await supabase.storage.from('clothing-images').remove([imagePath]);
      if (thumbnailPath !== imagePath) {
        await supabase.storage.from('clothing-images').remove([thumbnailPath]);
      }
    } catch (cleanupError) {
      logger.error('Failed to cleanup storage files', cleanupError as Error, {
        itemId,
        userId: user.id,
      });
    }

    logger.info('Clothing item deleted', {
      itemId,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: { deleted: true, itemId },
    });
  } catch (error) {
    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
