/**
 * Individual Clothing Item API Routes
 * Handles operations on specific clothing items by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/supabase-client';
import { UsageTracker } from '@/lib/middleware/usage-tracking';
import { ErrorHandler } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import { UpdateClothingItemInput } from '@/lib/types/clothing';

/**
 * GET /api/clothing-items/[id]
 * Get specific clothing item details
 */
export async function GET(
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

    const { id } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid item ID format' },
        { status: 400 }
      );
    }

    // Fetch clothing item
    const { data: item, error } = await supabase
      .from('clothing_items')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Clothing item not found' },
          { status: 404 }
        );
      }

      logger.error('Failed to fetch clothing item', error, {
        userId: user.id,
        itemId: id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch clothing item' },
        { status: 500 }
      );
    }

    logger.info('Clothing item fetched', {
      userId: user.id,
      itemId: id,
      category: item.category,
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
 * Update specific clothing item
 */
export async function PUT(
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

    const { id } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid item ID format' },
        { status: 400 }
      );
    }

    const body = await _request.json();
    const updates: UpdateClothingItemInput = body;

    // Validate updates
    if (
      updates.category &&
      !['shirts_tops', 'pants_bottoms', 'shoes'].includes(updates.category)
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

    if (
      updates.name &&
      (updates.name.length < 1 || updates.name.length > 100)
    ) {
      return NextResponse.json(
        { success: false, error: 'Name must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    // Check if item exists and belongs to user
    const { data: existingItem, error: checkError } = await supabase
      .from('clothing_items')
      .select('id, name, category')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Clothing item not found' },
          { status: 404 }
        );
      }

      logger.error('Failed to check clothing item ownership', checkError, {
        userId: user.id,
        itemId: id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to validate item' },
        { status: 500 }
      );
    }

    // Update item
    const { data: updatedItem, error: updateError } = await supabase
      .from('clothing_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update clothing item', updateError, {
        userId: user.id,
        itemId: id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to update clothing item' },
        { status: 500 }
      );
    }

    logger.info('Clothing item updated', {
      userId: user.id,
      itemId: id,
      updates,
      previousName: existingItem.name,
      newName: updatedItem.name,
    });

    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

/**
 * DELETE /api/clothing-items/[id]
 * Delete specific clothing item
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

    const { id } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid item ID format' },
        { status: 400 }
      );
    }

    // Get item details for cleanup
    const { data: itemToDelete, error: fetchError } = await supabase
      .from('clothing_items')
      .select('id, name, image_url, thumbnail_url, category')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Clothing item not found' },
          { status: 404 }
        );
      }

      logger.error('Failed to fetch clothing item for deletion', fetchError, {
        userId: user.id,
        itemId: id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch item' },
        { status: 500 }
      );
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('clothing_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      logger.error('Failed to delete clothing item', deleteError, {
        userId: user.id,
        itemId: id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to delete clothing item' },
        { status: 500 }
      );
    }

    // Clean up storage files (async)
    try {
      // Extract file paths from URLs
      const imagePath = itemToDelete.image_url.split(
        '/storage/v1/object/public/clothing-images/'
      )[1];
      const thumbnailPath = itemToDelete.thumbnail_url.split(
        '/storage/v1/object/public/clothing-images/'
      )[1];

      // Delete files from storage
      await supabase.storage.from('clothing-images').remove([imagePath]);

      // Only delete thumbnail if it's different from main image
      if (thumbnailPath !== imagePath) {
        await supabase.storage.from('clothing-images').remove([thumbnailPath]);
      }
    } catch (cleanupError) {
      logger.error('Failed to cleanup storage files', cleanupError as Error, {
        userId: user.id,
        itemId: id,
        imageUrl: itemToDelete.image_url,
        thumbnailUrl: itemToDelete.thumbnail_url,
      });
      // Don't fail the request if cleanup fails
    }

    // Track deletion
    await UsageTracker.trackFileDeletion(user.id, 'clothing', {
      itemId: id,
      itemName: itemToDelete.name,
      category: itemToDelete.category,
    });

    logger.info('Clothing item deleted', {
      userId: user.id,
      itemId: id,
      itemName: itemToDelete.name,
      category: itemToDelete.category,
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
        itemId: id,
        itemName: itemToDelete.name,
      },
    });
  } catch (error) {
    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
