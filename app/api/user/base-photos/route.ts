/**
 * Base Photos API Routes
 * Handles CRUD operations for user base photos
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';

// GET /api/user/base-photos - Get user's base photos
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's base photos
    console.log('Attempting to fetch base photos for user:', user.id);
    const { data: photos, error: photosError } = await supabase
      .from('user_base_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (photosError) {
      console.error('Error fetching base photos:', {
        code: photosError.code,
        message: photosError.message,
        details: photosError.details,
        hint: photosError.hint,
      });

      // If table doesn't exist, return empty array instead of error
      if (
        photosError.code === 'PGRST116' ||
        photosError.message?.includes('relation') ||
        photosError.message?.includes('does not exist') ||
        photosError.message?.includes(
          'relation "user_base_photos" does not exist'
        )
      ) {
        console.log(
          'user_base_photos table does not exist, returning empty array'
        );
        return NextResponse.json({ photos: [] });
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch base photos',
          details: photosError.message,
          code: photosError.code,
        },
        { status: 500 }
      );
    }

    console.log('Successfully fetched base photos:', photos?.length || 0);

    return NextResponse.json({ photos: photos || [] });
  } catch (error) {
    console.error('Base photos GET API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/user/base-photos - Upload new base photo
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const userId = formData.get('userId') as string;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 400 });
    }

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
        },
        { status: 400 }
      );
    }

    if (image.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large. Please upload an image smaller than 10MB.',
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = image.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}/base-photos/${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('closet-images')
      .upload(fileName, image, {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('closet-images')
      .getPublicUrl(fileName);

    // Create thumbnail (simplified - in production, you'd want proper image processing)
    const thumbnailFileName = fileName.replace(/\.[^/.]+$/, '-thumb$&');
    const { data: thumbnailData, error: thumbnailError } =
      await supabase.storage
        .from('closet-images')
        .upload(thumbnailFileName, image, {
          contentType: image.type,
          upsert: false,
        });

    const thumbnailUrl = thumbnailError
      ? urlData.publicUrl
      : supabase.storage.from('closet-images').getPublicUrl(thumbnailFileName)
          .data.publicUrl;

    // Check if this is the first photo (will be primary)
    const { data: existingPhotos } = await supabase
      .from('user_base_photos')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    const isPrimary = existingPhotos?.length === 0;

    // Save to database
    const { data: photoData, error: dbError } = await supabase
      .from('user_base_photos')
      .insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        thumbnail_url: thumbnailUrl,
        is_primary: isPrimary,
        file_name: fileName,
        file_size: image.size,
        content_type: image.type,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // If table doesn't exist, clean up files and return helpful error
      if (
        dbError.code === 'PGRST116' ||
        dbError.message?.includes('relation') ||
        dbError.message?.includes('does not exist')
      ) {
        await supabase.storage.from('closet-images').remove([fileName]);
        if (!thumbnailError) {
          await supabase.storage
            .from('closet-images')
            .remove([thumbnailFileName]);
        }
        return NextResponse.json(
          {
            error:
              'Base photos feature not available. Please run database migrations first.',
            code: 'TABLE_NOT_EXISTS',
          },
          { status: 503 }
        );
      }

      // Clean up uploaded file for other errors
      await supabase.storage.from('closet-images').remove([fileName]);
      if (!thumbnailError) {
        await supabase.storage
          .from('closet-images')
          .remove([thumbnailFileName]);
      }
      return NextResponse.json(
        { error: 'Failed to save photo metadata' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      photo: photoData,
      message: 'Base photo uploaded successfully',
    });
  } catch (error) {
    console.error('Base photos POST API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
