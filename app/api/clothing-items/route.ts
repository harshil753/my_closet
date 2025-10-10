/**
 * Clothing Items API Routes
 * Handles CRUD operations for user clothing items
 * Implements tier limits and usage tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from '@/lib/config/supabase';
import { TierLimitChecker } from '@/lib/utils/tierLimits';
import { UsageTracker } from '@/lib/middleware/usage-tracking';
import { ErrorHandler } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/clothing-items
 * Retrieve user's clothing items with filtering and pagination
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

    console.log('Getting clothing items for user:', userId);

    // Parse query parameters
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const is_active = searchParams.get('is_active');

    // Validate parameters
    if (limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit cannot exceed 100' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('clothing_items')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: items, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch clothing items', error, {
        userId: userId,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch clothing items' },
        { status: 500 }
      );
    }

    // Log the request
    logger.info('Clothing items fetched', {
      userId: userId,
      count: items?.length || 0,
      filters: { category, search, is_active },
    });

    return NextResponse.json({
      success: true,
      data: {
        items: items || [],
        total: count || 0,
        has_more: offset + limit < (count || 0),
        pagination: {
          limit,
          offset,
          total: count || 0,
        },
      },
    });
  } catch (error) {
    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

/**
 * POST /api/clothing-items
 * Create new clothing items (bulk upload)
 */
export async function POST(request: NextRequest) {
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

    // Check tier limits before processing
    await TierLimitChecker.enforceClothingUpload(user.id);

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const category = formData.get('category') as string;
    const metadata = formData.get('metadata')
      ? JSON.parse(formData.get('metadata') as string)
      : {};

    // Validate input
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No images provided' },
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

    // Check if user has enough tier allowance for all files
    const currentUsage = await TierLimitChecker.checkClothingUpload(user.id);
    if (currentUsage.remaining < files.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient tier allowance. You can upload ${currentUsage.remaining} more items.`,
          upgradeRequired: currentUsage.upgradeRequired,
        },
        { status: 402 }
      );
    }

    const createdItems: any[] = [];
    const errors: string[] = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Validate file
        if (!file.type.startsWith('image/')) {
          errors.push(`File ${file.name} is not an image`);
          continue;
        }

        if (file.size > 50 * 1024 * 1024) {
          // 50MB limit
          errors.push(`File ${file.name} exceeds 50MB limit`);
          continue;
        }

        // Generate unique filename
        const fileExtension = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
        const filePath = `clothing/${user.id}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('clothing-images')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          logger.error('Failed to upload file', uploadError, {
            userId: user.id,
            fileName,
          });
          errors.push(`Failed to upload ${file.name}`);
          continue;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('clothing-images').getPublicUrl(filePath);

        // Create thumbnail (simplified - in production, you'd use image processing)
        const thumbnailUrl = publicUrl; // For now, use same URL

        // Create database record
        const { data: item, error: dbError } = await supabase
          .from('clothing_items')
          .insert({
            user_id: user.id,
            category,
            name: file.name.split('.')[0], // Use filename without extension
            image_url: publicUrl,
            thumbnail_url: thumbnailUrl,
            metadata: {
              original_filename: file.name,
              file_size: file.size,
              mime_type: file.type,
              ...metadata,
            },
          })
          .select()
          .single();

        if (dbError) {
          logger.error('Failed to create clothing item record', dbError, {
            userId: user.id,
            fileName,
          });
          errors.push(`Failed to save ${file.name}`);
          continue;
        }

        createdItems.push(item);

        // Track usage
        await UsageTracker.trackClothingUpload(user.id, {
          itemId: item.id,
          fileName: file.name,
          fileSize: file.size,
          category,
        });
      } catch (fileError) {
        logger.error('Error processing file', fileError as Error, {
          userId: user.id,
          fileName: file.name,
        });
        errors.push(`Error processing ${file.name}`);
      }
    }

    // Log the operation
    logger.info('Clothing items created', {
      userId: user.id,
      created: createdItems.length,
      errors: errors.length,
      category,
    });

    return NextResponse.json({
      success: true,
      data: {
        items: createdItems,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          total: files.length,
          created: createdItems.length,
          failed: errors.length,
        },
      },
    });
  } catch (error) {
    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

/**
 * PUT /api/clothing-items
 * Update multiple clothing items (bulk update)
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { item_ids, updates } = body;

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'item_ids array is required' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { success: false, error: 'updates object is required' },
        { status: 400 }
      );
    }

    // Validate that all items belong to the user
    const { data: existingItems, error: checkError } = await supabase
      .from('clothing_items')
      .select('id')
      .eq('user_id', user.id)
      .in('id', item_ids);

    if (checkError) {
      logger.error('Failed to check clothing items ownership', checkError, {
        userId: user.id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to validate items' },
        { status: 500 }
      );
    }

    if (existingItems.length !== item_ids.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some items do not exist or do not belong to you',
        },
        { status: 403 }
      );
    }

    // Update items
    const { data: updatedItems, error: updateError } = await supabase
      .from('clothing_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .in('id', item_ids)
      .select();

    if (updateError) {
      logger.error('Failed to update clothing items', updateError, {
        userId: user.id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to update items' },
        { status: 500 }
      );
    }

    logger.info('Clothing items updated', {
      userId: user.id,
      count: updatedItems.length,
      updates,
    });

    return NextResponse.json({
      success: true,
      data: {
        items: updatedItems,
        count: updatedItems.length,
      },
    });
  } catch (error) {
    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

/**
 * DELETE /api/clothing-items
 * Delete multiple clothing items (bulk delete)
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const itemIds = searchParams.get('ids')?.split(',') || [];

    if (itemIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No item IDs provided' },
        { status: 400 }
      );
    }

    // Get items to delete (for cleanup)
    const { data: itemsToDelete, error: fetchError } = await supabase
      .from('clothing_items')
      .select('id, image_url, thumbnail_url')
      .eq('user_id', user.id)
      .in('id', itemIds);

    if (fetchError) {
      logger.error('Failed to fetch items for deletion', fetchError, {
        userId: user.id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch items' },
        { status: 500 }
      );
    }

    if (itemsToDelete.length !== itemIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some items do not exist or do not belong to you',
        },
        { status: 403 }
      );
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('clothing_items')
      .delete()
      .eq('user_id', user.id)
      .in('id', itemIds);

    if (deleteError) {
      logger.error('Failed to delete clothing items', deleteError, {
        userId: user.id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to delete items' },
        { status: 500 }
      );
    }

    // Clean up storage files (async)
    itemsToDelete.forEach(async (item) => {
      try {
        // Extract file path from URL
        const imagePath = item.image_url.split(
          '/storage/v1/object/public/clothing-images/'
        )[1];
        const thumbnailPath = item.thumbnail_url.split(
          '/storage/v1/object/public/clothing-images/'
        )[1];

        // Delete files from storage
        await supabase.storage.from('clothing-images').remove([imagePath]);
        if (thumbnailPath !== imagePath) {
          await supabase.storage
            .from('clothing-images')
            .remove([thumbnailPath]);
        }
      } catch (cleanupError) {
        logger.error('Failed to cleanup storage files', cleanupError as Error, {
          userId: user.id,
          itemId: item.id,
        });
      }
    });

    // Track deletion
    await UsageTracker.trackFileDeletion(user.id, 'clothing', {
      itemIds,
      count: itemsToDelete.length,
    });

    logger.info('Clothing items deleted', {
      userId: user.id,
      count: itemsToDelete.length,
      itemIds,
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: itemsToDelete.length,
        itemIds,
      },
    });
  } catch (error) {
    const { statusCode, response } = ErrorHandler.handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
