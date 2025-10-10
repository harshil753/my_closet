/**
 * Supabase Storage configuration and utilities
 * Handles file uploads, storage policies, and bucket management
 */

import { supabase } from './client';

/**
 * Storage bucket names
 */
export const STORAGE_BUCKETS = {
  CLOTHING_IMAGES: 'clothing-images',
  BASE_PHOTOS: 'base-photos',
  TRY_ON_RESULTS: 'try-on-results',
  THUMBNAILS: 'thumbnails',
} as const;

/**
 * Storage folder structure
 */
export const STORAGE_FOLDERS = {
  CLOTHING: 'clothing',
  BASE_PHOTOS: 'base-photos',
  TRY_ON_RESULTS: 'try-on-results',
  THUMBNAILS: 'thumbnails',
} as const;

/**
 * File upload configuration
 */
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_BASE_PHOTO_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  THUMBNAIL_SIZE: 300,
  COMPRESSION_QUALITY: 85,
} as const;

/**
 * Storage utility functions
 */
export class StorageService {
  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(
    bucket: string,
    path: string,
    file: File,
    options?: {
      upsert?: boolean;
      contentType?: string;
    }
  ): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: options?.upsert || false,
        contentType: options?.contentType || file.type,
      });

    return { data, error };
  }

  /**
   * Get public URL for a stored file
   */
  static getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Generate signed URL for private file access
   */
  static async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    return { data, error };
  }

  /**
   * Delete a file from storage
   */
  static async deleteFile(
    bucket: string,
    path: string
  ): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase.storage.from(bucket).remove([path]);

    return { data, error };
  }

  /**
   * List files in a bucket folder
   */
  static async listFiles(
    bucket: string,
    folder?: string
  ): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase.storage.from(bucket).list(folder);

    return { data, error };
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(
    bucket: string,
    path: string
  ): Promise<{ data: any; error: any }> {
    const { data } = await supabase.storage.from(bucket).getPublicUrl(path);

    return { data, error: null };
  }
}

/**
 * Storage path generators
 */
export class StoragePaths {
  /**
   * Generate clothing item image path
   */
  static clothingItem(
    userId: string,
    itemId: string,
    filename: string
  ): string {
    return `${STORAGE_FOLDERS.CLOTHING}/${userId}/${itemId}/${filename}`;
  }

  /**
   * Generate base photo path
   */
  static basePhoto(userId: string, photoId: string, filename: string): string {
    return `${STORAGE_FOLDERS.BASE_PHOTOS}/${userId}/${photoId}/${filename}`;
  }

  /**
   * Generate try-on result path
   */
  static tryOnResult(
    userId: string,
    sessionId: string,
    filename: string
  ): string {
    return `${STORAGE_FOLDERS.TRY_ON_RESULTS}/${userId}/${sessionId}/${filename}`;
  }

  /**
   * Generate thumbnail path
   */
  static thumbnail(userId: string, itemId: string, filename: string): string {
    return `${STORAGE_FOLDERS.THUMBNAILS}/${userId}/${itemId}/${filename}`;
  }
}

/**
 * File validation utilities
 */
export class FileValidator {
  /**
   * Validate file type
   */
  static validateMimeType(mimeType: string): boolean {
    return UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType as any);
  }

  /**
   * Validate file size
   */
  static validateFileSize(size: number, isBasePhoto: boolean = false): boolean {
    const maxSize = isBasePhoto
      ? UPLOAD_CONFIG.MAX_BASE_PHOTO_SIZE
      : UPLOAD_CONFIG.MAX_FILE_SIZE;

    return size <= maxSize;
  }

  /**
   * Validate file for upload
   */
  static validateFile(
    file: File,
    isBasePhoto: boolean = false
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!this.validateMimeType(file.type)) {
      errors.push(
        `File type ${file.type} is not allowed. Allowed types: ${UPLOAD_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    if (!this.validateFileSize(file.size, isBasePhoto)) {
      const maxSize = isBasePhoto
        ? UPLOAD_CONFIG.MAX_BASE_PHOTO_SIZE
        : UPLOAD_CONFIG.MAX_FILE_SIZE;
      errors.push(
        `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Storage policies configuration
 * These policies are applied to Supabase Storage buckets
 */
export const STORAGE_POLICIES = {
  // Clothing images bucket policies
  clothingImages: {
    bucket: STORAGE_BUCKETS.CLOTHING_IMAGES,
    policies: [
      {
        name: 'Users can upload their own clothing images',
        policy: `(bucket_id = '${STORAGE_BUCKETS.CLOTHING_IMAGES}'::text) AND (auth.uid()::text = (storage.foldername(name))[1])`,
        operation: 'INSERT',
      },
      {
        name: 'Users can view their own clothing images',
        policy: `(bucket_id = '${STORAGE_BUCKETS.CLOTHING_IMAGES}'::text) AND (auth.uid()::text = (storage.foldername(name))[1])`,
        operation: 'SELECT',
      },
      {
        name: 'Users can update their own clothing images',
        policy: `(bucket_id = '${STORAGE_BUCKETS.CLOTHING_IMAGES}'::text) AND (auth.uid()::text = (storage.foldername(name))[1])`,
        operation: 'UPDATE',
      },
      {
        name: 'Users can delete their own clothing images',
        policy: `(bucket_id = '${STORAGE_BUCKETS.CLOTHING_IMAGES}'::text) AND (auth.uid()::text = (storage.foldername(name))[1])`,
        operation: 'DELETE',
      },
    ],
  },

  // Base photos bucket policies
  basePhotos: {
    bucket: STORAGE_BUCKETS.BASE_PHOTOS,
    policies: [
      {
        name: 'Users can upload their own base photos',
        policy: `(bucket_id = '${STORAGE_BUCKETS.BASE_PHOTOS}'::text) AND (auth.uid()::text = (storage.foldername(name))[1])`,
        operation: 'INSERT',
      },
      {
        name: 'Users can view their own base photos',
        policy: `(bucket_id = '${STORAGE_BUCKETS.BASE_PHOTOS}'::text) AND (auth.uid()::text = (storage.foldername(name))[1])`,
        operation: 'SELECT',
      },
      {
        name: 'Users can update their own base photos',
        policy: `(bucket_id = '${STORAGE_BUCKETS.BASE_PHOTOS}'::text) AND (auth.uid()::text = (storage.foldername(name))[1])`,
        operation: 'UPDATE',
      },
      {
        name: 'Users can delete their own base photos',
        policy: `(bucket_id = '${STORAGE_BUCKETS.BASE_PHOTOS}'::text) AND (auth.uid()::text = (storage.foldername(name))[1])`,
        operation: 'DELETE',
      },
    ],
  },

  // Try-on results bucket policies
  tryOnResults: {
    bucket: STORAGE_BUCKETS.TRY_ON_RESULTS,
    policies: [
      {
        name: 'Users can view their own try-on results',
        policy: `(bucket_id = '${STORAGE_BUCKETS.TRY_ON_RESULTS}'::text) AND (auth.uid()::text = (storage.foldername(name))[1])`,
        operation: 'SELECT',
      },
      {
        name: 'System can upload try-on results',
        policy: `(bucket_id = '${STORAGE_BUCKETS.TRY_ON_RESULTS}'::text) AND (auth.role() = 'service_role')`,
        operation: 'INSERT',
      },
      {
        name: 'System can update try-on results',
        policy: `(bucket_id = '${STORAGE_BUCKETS.TRY_ON_RESULTS}'::text) AND (auth.role() = 'service_role')`,
        operation: 'UPDATE',
      },
      {
        name: 'Users can delete their own try-on results',
        policy: `(bucket_id = '${STORAGE_BUCKETS.TRY_ON_RESULTS}'::text) AND (auth.uid()::text = (storage.foldername(name))[1])`,
        operation: 'DELETE',
      },
    ],
  },

  // Thumbnails bucket policies
  thumbnails: {
    bucket: STORAGE_BUCKETS.THUMBNAILS,
    policies: [
      {
        name: 'Users can view their own thumbnails',
        policy: `(bucket_id = '${STORAGE_BUCKETS.THUMBNAILS}'::text) AND (auth.uid()::text = (storage.foldername(name))[1])`,
        operation: 'SELECT',
      },
      {
        name: 'System can manage thumbnails',
        policy: `(bucket_id = '${STORAGE_BUCKETS.THUMBNAILS}'::text) AND (auth.role() = 'service_role')`,
        operation: 'ALL',
      },
    ],
  },
} as const;
