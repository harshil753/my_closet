/**
 * Create User Profile API
 *
 * Creates a user profile record in the database after successful Supabase Auth registration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/config/supabase';

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

    console.log('Creating profile for user:', user.id, user.email);

    // Check if user profile already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { message: 'User profile already exists' },
        { status: 200 }
      );
    }

    // Create user profile
    console.log('Attempting to insert user profile with data:', {
      id: user.id,
      email: user.email,
      display_name:
        user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
    });

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        display_name:
          user.user_metadata?.display_name ||
          user.email?.split('@')[0] ||
          'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tier: 'free',
        tier_limits: {
          clothing_items: 100,
          try_ons_per_month: 100,
          current_month_usage: 0,
          current_month: new Date().toISOString().substring(0, 7),
        },
      })
      .select()
      .single();

    console.log('Insert result:', { data, error });

    if (error) {
      console.error('Error creating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'User profile created successfully', user: data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in create-profile API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
