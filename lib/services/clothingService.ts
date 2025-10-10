/**
 * Clothing Items Service
 * Business logic for clothing item operations
 */

import { supabase } from '../supabase/client';
import {
  ClothingItem,
  CreateClothingItemInput,
  UpdateClothingItemInput,
} from '../types/clothing';
import { TierLimitChecker } from '../utils/tierLimits';
import { UsageTracker } from '../middleware/usage-tracking';
import { logger } from '../utils/logger';

export interface ClothingItemStats {
  total: number;
  byCategory: Record<string, number>;
  active: number;
  inactive: number;
  storageUsed: number;
}

export interface ClothingItemSearchResult {
  items: ClothingItem[];
  total: number;
  hasMore: boolean;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export class ClothingService {
  /**
   * Get clothing items for a user with filtering and pagination
   */
  static async getUserClothingItems(
    userId: string,
    filters: any = {},
    pagination: { limit: number; offset: number } = { limit: 50, offset: 0 }
  ): Promise<ClothingItemSearchResult> {
    try {
      let query = supabase
        .from('clothing_items')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('metadata->tags', filters.tags);
      }

      if (filters.color) {
        query = query.eq('metadata->color', filters.color);
      }

      if (filters.brand) {
        query = query.ilike('metadata->brand', `%${filters.brand}%`);
      }

      // Apply pagination
      query = query.range(
        pagination.offset,
        pagination.offset + pagination.limit - 1
      );

      const { data: items, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch clothing items', error, {
          userId,
          filters,
        });
        throw new Error('Failed to fetch clothing items');
      }

      return {
        items: items || [],
        total: count || 0,
        hasMore: pagination.offset + pagination.limit < (count || 0),
        pagination: {
          limit: pagination.limit,
          offset: pagination.offset,
          total: count || 0,
        },
      };
    } catch (error) {
      logger.error('Error in getUserClothingItems', error as Error, {
        userId,
        filters,
      });
      throw error;
    }
  }

  /**
   * Create a new clothing item
   */
  static async createClothingItem(
    userId: string,
    input: CreateClothingItemInput
  ): Promise<ClothingItem> {
    try {
      // Check tier limits
      await TierLimitChecker.enforceClothingUpload(userId);

      // Validate file
      if (
        !input.image_url.startsWith('data:image/') &&
        !input.image_url.startsWith('http')
      ) {
        throw new Error('File must be an image');
      }

      // File size validation would need to be done at upload time
      // if (input.file.size > 50 * 1024 * 1024) { // 50MB limit
      //   throw new Error('File size exceeds 50MB limit');
      // }

      // Generate unique filename from URL
      const fileExtension = input.image_url.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const filePath = `clothing/${userId}/${fileName}`;

      // Upload to Supabase Storage
      // Since we already have image_url, we don't need to upload again
      // const { data: uploadData, error: uploadError } = await supabase.storage
      //   .from('clothing-images')
      //   .upload(filePath, input.file, {
      //     contentType: input.file.type,
      //     upsert: false,
      //   });

      // if (uploadError) {
      //   logger.error('Failed to upload file', uploadError, { userId, fileName });
      //   throw new Error('Failed to upload file');
      // }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('clothing-images').getPublicUrl(filePath);

      // Create thumbnail (simplified - in production, use image processing)
      const thumbnailUrl = publicUrl; // For now, use same URL

      // Create database record
      const { data: item, error: dbError } = await supabase
        .from('clothing_items')
        .insert({
          user_id: userId,
          category: input.category,
          name: input.name || 'Clothing Item',
          image_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          metadata: {
            original_filename: 'uploaded_image',
            file_size: 0,
            mime_type: 'image/jpeg',
            ...input.metadata,
          },
        })
        .select()
        .single();

      if (dbError) {
        logger.error('Failed to create clothing item record', dbError, {
          userId,
          fileName,
        });
        throw new Error('Failed to create clothing item');
      }

      // Track usage
      await UsageTracker.trackClothingUpload(userId, {
        itemId: item.id,
        fileName: 'uploaded_image',
        fileSize: 0,
        category: input.category,
      });

      logger.info('Clothing item created', {
        userId,
        itemId: item.id,
        category: input.category,
        fileName: 'uploaded_image',
      });

      return item;
    } catch (error) {
      logger.error('Error in createClothingItem', error as Error, {
        userId,
        input,
      });
      throw error;
    }
  }

  /**
   * Update a clothing item
   */
  static async updateClothingItem(
    userId: string,
    itemId: string,
    updates: UpdateClothingItemInput
  ): Promise<ClothingItem> {
    try {
      // Check if item exists and belongs to user
      const { error: checkError } = await supabase
        .from('clothing_items')
        .select('id')
        .eq('id', itemId)
        .eq('user_id', userId)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          throw new Error('Clothing item not found');
        }
        throw new Error('Failed to validate item');
      }

      // Update item
      const { data: updatedItem, error: updateError } = await supabase
        .from('clothing_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        logger.error('Failed to update clothing item', updateError, {
          userId,
          itemId,
        });
        throw new Error('Failed to update clothing item');
      }

      logger.info('Clothing item updated', {
        userId,
        itemId,
        updates,
      });

      return updatedItem;
    } catch (error) {
      logger.error('Error in updateClothingItem', error as Error, {
        userId,
        itemId,
        updates,
      });
      throw error;
    }
  }

  /**
   * Delete a clothing item
   */
  static async deleteClothingItem(
    userId: string,
    itemId: string
  ): Promise<void> {
    try {
      // Get item details for cleanup
      const { data: itemToDelete, error: fetchError } = await supabase
        .from('clothing_items')
        .select('id, name, image_url, thumbnail_url, category')
        .eq('id', itemId)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Clothing item not found');
        }
        throw new Error('Failed to fetch item');
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('clothing_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      if (deleteError) {
        logger.error('Failed to delete clothing item', deleteError, {
          userId,
          itemId,
        });
        throw new Error('Failed to delete clothing item');
      }

      // Clean up storage files (async)
      try {
        const imagePath = itemToDelete.image_url.split(
          '/storage/v1/object/public/clothing-images/'
        )[1];
        const thumbnailPath = itemToDelete.thumbnail_url.split(
          '/storage/v1/object/public/clothing-images/'
        )[1];

        await supabase.storage.from('clothing-images').remove([imagePath]);

        if (thumbnailPath !== imagePath) {
          await supabase.storage
            .from('clothing-images')
            .remove([thumbnailPath]);
        }
      } catch (cleanupError) {
        logger.error('Failed to cleanup storage files', cleanupError as Error, {
          userId,
          itemId,
        });
        // Don't fail the request if cleanup fails
      }

      // Track deletion
      await UsageTracker.trackFileDeletion(userId, 'clothing', {
        itemId,
        itemName: itemToDelete.name,
        category: itemToDelete.category,
      });

      logger.info('Clothing item deleted', {
        userId,
        itemId,
        itemName: itemToDelete.name,
        category: itemToDelete.category,
      });
    } catch (error) {
      logger.error('Error in deleteClothingItem', error as Error, {
        userId,
        itemId,
      });
      throw error;
    }
  }

  /**
   * Get clothing item statistics for a user
   */
  static async getClothingItemStats(
    userId: string
  ): Promise<ClothingItemStats> {
    try {
      const { data: items, error } = await supabase
        .from('clothing_items')
        .select('category, is_active, metadata')
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to fetch clothing item stats', error, { userId });
        throw new Error('Failed to fetch clothing item stats');
      }

      const stats: ClothingItemStats = {
        total: items.length,
        byCategory: {},
        active: 0,
        inactive: 0,
        storageUsed: 0,
      };

      items.forEach((item: any) => {
        // Count by category
        stats.byCategory[item.category] =
          (stats.byCategory[item.category] || 0) + 1;

        // Count active/inactive
        if (item.is_active) {
          stats.active++;
        } else {
          stats.inactive++;
        }

        // Calculate storage used (simplified)
        const fileSize = item.metadata?.file_size || 0;
        stats.storageUsed += fileSize;
      });

      return stats;
    } catch (error) {
      logger.error('Error in getClothingItemStats', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Bulk update clothing items
   */
  static async bulkUpdateClothingItems(
    userId: string,
    itemIds: string[],
    updates: UpdateClothingItemInput
  ): Promise<ClothingItem[]> {
    try {
      // Validate that all items belong to the user
      const { data: existingItems, error: checkError } = await supabase
        .from('clothing_items')
        .select('id')
        .eq('user_id', userId)
        .in('id', itemIds);

      if (checkError) {
        logger.error('Failed to check clothing items ownership', checkError, {
          userId,
        });
        throw new Error('Failed to validate items');
      }

      if (existingItems.length !== itemIds.length) {
        throw new Error('Some items do not exist or do not belong to you');
      }

      // Update items
      const { data: updatedItems, error: updateError } = await supabase
        .from('clothing_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .in('id', itemIds)
        .select();

      if (updateError) {
        logger.error('Failed to bulk update clothing items', updateError, {
          userId,
        });
        throw new Error('Failed to update items');
      }

      logger.info('Clothing items bulk updated', {
        userId,
        count: updatedItems.length,
        updates,
      });

      return updatedItems;
    } catch (error) {
      logger.error('Error in bulkUpdateClothingItems', error as Error, {
        userId,
        itemIds,
        updates,
      });
      throw error;
    }
  }

  /**
   * Bulk delete clothing items
   */
  static async bulkDeleteClothingItems(
    userId: string,
    itemIds: string[]
  ): Promise<number> {
    try {
      // Get items to delete for cleanup
      const { data: itemsToDelete, error: fetchError } = await supabase
        .from('clothing_items')
        .select('id, name, image_url, thumbnail_url, category')
        .eq('user_id', userId)
        .in('id', itemIds);

      if (fetchError) {
        logger.error('Failed to fetch items for bulk deletion', fetchError, {
          userId,
        });
        throw new Error('Failed to fetch items');
      }

      if (itemsToDelete.length !== itemIds.length) {
        throw new Error('Some items do not exist or do not belong to you');
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('clothing_items')
        .delete()
        .eq('user_id', userId)
        .in('id', itemIds);

      if (deleteError) {
        logger.error('Failed to bulk delete clothing items', deleteError, {
          userId,
        });
        throw new Error('Failed to delete items');
      }

      // Clean up storage files (async)
      itemsToDelete.forEach(async (item: any) => {
        try {
          const imagePath = item.image_url.split(
            '/storage/v1/object/public/clothing-images/'
          )[1];
          const thumbnailPath = item.thumbnail_url.split(
            '/storage/v1/object/public/clothing-images/'
          )[1];

          await supabase.storage.from('clothing-images').remove([imagePath]);
          if (thumbnailPath !== imagePath) {
            await supabase.storage
              .from('clothing-images')
              .remove([thumbnailPath]);
          }
        } catch (cleanupError) {
          logger.error(
            'Failed to cleanup storage files',
            cleanupError as Error,
            {
              userId,
              itemId: item.id,
            }
          );
        }
      });

      // Track deletion
      await UsageTracker.trackFileDeletion(userId, 'clothing', {
        itemIds,
        count: itemsToDelete.length,
      });

      logger.info('Clothing items bulk deleted', {
        userId,
        count: itemsToDelete.length,
        itemIds,
      });

      return itemsToDelete.length;
    } catch (error) {
      logger.error('Error in bulkDeleteClothingItems', error as Error, {
        userId,
        itemIds,
      });
      throw error;
    }
  }
}
