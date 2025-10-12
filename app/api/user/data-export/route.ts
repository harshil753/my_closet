/**
 * Data Export API Endpoint
 * Handles GDPR-compliant user data export requests
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

    const { format = 'json' } = await request.json();

    // Log export request for audit purposes
    await supabase.from('data_export_requests').insert({
      user_id: user.id,
      format,
      requested_at: new Date().toISOString(),
      status: 'processing',
    });

    // Generate user data export
    const exportData = await generateUserDataExport(user.id);

    if (exportData.success) {
      // Update export request status
      await supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          download_url: exportData.downloadUrl,
        })
        .eq('user_id', user.id)
        .eq('status', 'processing');

      return NextResponse.json({
        success: true,
        message: 'Your data export is ready',
        downloadUrl: exportData.downloadUrl,
        expiresAt: exportData.expiresAt,
      });
    } else {
      return NextResponse.json(
        {
          error: 'Data export failed',
          details: exportData.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateUserDataExport(userId: string) {
  try {
    // Get user profile data
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Get user base photos
    const { data: basePhotos, error: photosError } = await supabase
      .from('user_base_photos')
      .select('*')
      .eq('user_id', userId);

    if (photosError) throw photosError;

    // Get clothing items
    const { data: clothingItems, error: itemsError } = await supabase
      .from('clothing_items')
      .select('*')
      .eq('user_id', userId);

    if (itemsError) throw itemsError;

    // Get try-on sessions
    const { data: tryOnSessions, error: sessionsError } = await supabase
      .from('try_on_sessions')
      .select(
        `
        *,
        try_on_session_items (
          clothing_item_id
        )
      `
      )
      .eq('user_id', userId);

    if (sessionsError) throw sessionsError;

    // Get usage statistics
    const { data: usageStats } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId);

    // Compile export data
    const exportData = {
      export_info: {
        generated_at: new Date().toISOString(),
        user_id: userId,
        format: 'json',
        version: '1.0',
      },
      user_profile: {
        id: userProfile.id,
        email: userProfile.email,
        display_name: userProfile.display_name,
        created_at: userProfile.created_at,
        updated_at: userProfile.updated_at,
        tier: userProfile.tier,
        preferences: userProfile.preferences,
      },
      base_photos:
        basePhotos?.map((photo) => ({
          id: photo.id,
          image_type: photo.image_type,
          uploaded_at: photo.uploaded_at,
          is_active: photo.is_active,
          metadata: photo.metadata,
        })) || [],
      clothing_items:
        clothingItems?.map((item) => ({
          id: item.id,
          category: item.category,
          name: item.name,
          uploaded_at: item.uploaded_at,
          is_active: item.is_active,
          metadata: item.metadata,
        })) || [],
      try_on_sessions:
        tryOnSessions?.map((session) => ({
          id: session.id,
          status: session.status,
          created_at: session.created_at,
          completed_at: session.completed_at,
          processing_time: session.processing_time,
          clothing_items:
            session.try_on_session_items?.map(
              (item: any) => item.clothing_item_id
            ) || [],
        })) || [],
      usage_statistics: usageStats || [],
      data_summary: {
        total_base_photos: basePhotos?.length || 0,
        total_clothing_items: clothingItems?.length || 0,
        total_try_on_sessions: tryOnSessions?.length || 0,
        account_created: userProfile.created_at,
        last_activity: userProfile.updated_at,
      },
    };

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `user-data-export-${userId}-${timestamp}.json`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('data-exports')
      .upload(filename, JSON.stringify(exportData, null, 2), {
        contentType: 'application/json',
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    // Generate signed URL for download (expires in 7 days)
    const { data: signedUrlData } = await supabase.storage
      .from('data-exports')
      .createSignedUrl(filename, 7 * 24 * 60 * 60); // 7 days

    return {
      success: true,
      downloadUrl: signedUrlData?.signedUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Error generating data export:', error);
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

    // Get user's data export requests
    const { data: requests, error } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch export requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      requests: requests || [],
    });
  } catch (error) {
    console.error('Error fetching export requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
