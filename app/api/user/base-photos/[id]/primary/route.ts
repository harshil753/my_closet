/**
 * Set Primary Base Photo API Route
 * Handles setting a base photo as the primary photo
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';

// PUT /api/user/base-photos/[id]/primary - Set photo as primary
export async function PUT(
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

    // Verify the photo belongs to the user
    const { data: photo, error: fetchError } = await supabase
      .from('user_base_photos')
      .select('*')
      .eq('id', photoId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Start a transaction to update primary status
    // First, unset all other primary photos
    const { error: unsetError } = await supabase
      .from('user_base_photos')
      .update({ is_primary: false })
      .eq('user_id', user.id)
      .eq('is_primary', true);

    if (unsetError) {
      console.error('Error unsetting primary photos:', unsetError);
      return NextResponse.json(
        { error: 'Failed to update primary status' },
        { status: 500 }
      );
    }

    // Set this photo as primary
    const { data: updatedPhoto, error: setError } = await supabase
      .from('user_base_photos')
      .update({ is_primary: true })
      .eq('id', photoId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (setError) {
      console.error('Error setting primary photo:', setError);
      return NextResponse.json(
        { error: 'Failed to set primary photo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      photo: updatedPhoto,
      message: 'Primary photo updated successfully',
    });
  } catch (error) {
    console.error('Base photo primary API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
