/**
 * Individual Base Photo API Routes
 * Handles operations on specific base photos
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';

// DELETE /api/user/base-photos/[id] - Delete base photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: photoId } = await params;

    // Get the photo to verify ownership and get file info
    const { data: photo, error: fetchError } = await supabase
      .from('user_base_photos')
      .select('*')
      .eq('id', photoId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Delete from storage
    const filesToDelete = [photo.file_name];
    if (photo.thumbnail_url && photo.thumbnail_url !== photo.image_url) {
      // Extract thumbnail filename from URL
      const thumbnailFileName = photo.thumbnail_url.split('/').pop();
      if (thumbnailFileName) {
        filesToDelete.push(`base-photos/${thumbnailFileName}`);
      }
    }

    const { error: storageError } = await supabase.storage
      .from('closet-images')
      .remove(filesToDelete);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue with database deletion even if storage cleanup fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('user_base_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', user.id);

    if (dbError) {
      console.error('Database deletion error:', dbError);
      return NextResponse.json(
        { error: 'Failed to delete photo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Base photo deleted successfully',
    });
  } catch (error) {
    console.error('Base photo DELETE API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
