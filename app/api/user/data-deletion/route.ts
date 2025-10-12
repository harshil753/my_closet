/**
 * Data Deletion API Endpoint
 * Handles GDPR-compliant user data deletion requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const { confirmationText, reason } = await request.json();

    // Validate confirmation text
    if (confirmationText !== 'DELETE MY DATA') {
      return NextResponse.json(
        {
          error:
            'Invalid confirmation text. Please type "DELETE MY DATA" exactly.',
        },
        { status: 400 }
      );
    }

    // Log deletion request for audit purposes
    await supabase.from('data_deletion_requests').insert({
      user_id: user.id,
      reason: reason || 'User requested data deletion',
      requested_at: new Date().toISOString(),
      status: 'pending',
    });

    // Start data deletion process
    const deletionResult = await deleteUserData(user.id);

    if (deletionResult.success) {
      // Update deletion request status
      await supabase
        .from('data_deletion_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      return NextResponse.json({
        success: true,
        message: 'Your data has been successfully deleted',
        deletedItems: deletionResult.deletedItems,
      });
    } else {
      return NextResponse.json(
        {
          error: 'Data deletion failed',
          details: deletionResult.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Data deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function deleteUserData(userId: string) {
  const deletedItems = {
    user_base_photos: 0,
    clothing_items: 0,
    try_on_sessions: 0,
    storage_files: 0,
  };

  try {
    // Delete user base photos and associated storage files
    const { data: basePhotos } = await supabase
      .from('user_base_photos')
      .select('image_url')
      .eq('user_id', userId);

    if (basePhotos) {
      for (const photo of basePhotos) {
        // Extract file path from URL
        const url = new URL(photo.image_url);
        const filePath = url.pathname.split('/').slice(2).join('/');

        // Delete from storage
        await supabase.storage.from('user-photos').remove([filePath]);
      }

      const { error: photosError } = await supabase
        .from('user_base_photos')
        .delete()
        .eq('user_id', userId);

      if (photosError) throw photosError;
      deletedItems.user_base_photos = basePhotos.length;
    }

    // Delete clothing items and associated storage files
    const { data: clothingItems } = await supabase
      .from('clothing_items')
      .select('image_url, thumbnail_url')
      .eq('user_id', userId);

    if (clothingItems) {
      for (const item of clothingItems) {
        // Delete main image
        const mainUrl = new URL(item.image_url);
        const mainPath = mainUrl.pathname.split('/').slice(2).join('/');
        await supabase.storage.from('clothing-items').remove([mainPath]);

        // Delete thumbnail
        const thumbUrl = new URL(item.thumbnail_url);
        const thumbPath = thumbUrl.pathname.split('/').slice(2).join('/');
        await supabase.storage.from('clothing-items').remove([thumbPath]);
      }

      const { error: itemsError } = await supabase
        .from('clothing_items')
        .delete()
        .eq('user_id', userId);

      if (itemsError) throw itemsError;
      deletedItems.clothing_items = clothingItems.length;
    }

    // Delete try-on sessions and result images
    const { data: sessions } = await supabase
      .from('try_on_sessions')
      .select('result_image_url')
      .eq('user_id', userId)
      .not('result_image_url', 'is', null);

    if (sessions) {
      for (const session of sessions) {
        if (session.result_image_url) {
          const resultUrl = new URL(session.result_image_url);
          const resultPath = resultUrl.pathname.split('/').slice(2).join('/');
          await supabase.storage.from('try-on-results').remove([resultPath]);
        }
      }

      const { error: sessionsError } = await supabase
        .from('try_on_sessions')
        .delete()
        .eq('user_id', userId);

      if (sessionsError) throw sessionsError;
      deletedItems.try_on_sessions = sessions.length;
    }

    // Delete user profile and authentication data
    const { error: userError } = await supabase.auth.admin.deleteUser(userId);

    if (userError) throw userError;

    return {
      success: true,
      deletedItems,
    };
  } catch (error) {
    console.error('Error deleting user data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get user's data deletion requests
    const { data: requests, error } = await supabase
      .from('data_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch deletion requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      requests: requests || [],
    });
  } catch (error) {
    console.error('Error fetching deletion requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
