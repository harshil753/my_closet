/**
 * Clothing Upload API Route
 * 
 * This route handles clothing item uploads with tier limit enforcement.
 * It validates user limits, processes images, and stores metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { withTierEnforcement } from '@/lib/middleware/tierEnforcement';
import { TierService } from '@/lib/services/tierService';
import { ClothingCategory } from '@/lib/types/common';

// Clothing item interface
interface ClothingItemData {
  name: string;
  category: ClothingCategory;
  image: File;
  metadata: {
    color?: string;
    brand?: string;
    size?: string;
    notes?: string;
  };
}

/**
 * POST /api/upload/clothing
 * Upload a new clothing item with tier limit enforcement
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from request (assuming auth middleware has set this)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Enforce tier limits for clothing items
    const tierEnforcement = withTierEnforcement('clothing_items', {
      strict: true,
      trackUsage: true,
    });
    
    const tierResponse = await tierEnforcement(request, userId);
    if (tierResponse) {
      return tierResponse; // Tier limit exceeded
    }
    
    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const category = formData.get('category') as ClothingCategory;
    const image = formData.get('image') as File;
    const metadataJson = formData.get('metadata') as string;
    
    // Validate required fields
    if (!name || !category || !image) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate category
    const validCategories: ClothingCategory[] = ['shirts_tops', 'pants_bottoms', 'shoes'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      );
    }
    
    // Parse metadata
    let metadata = {};
    try {
      metadata = JSON.parse(metadataJson || '{}');
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid metadata format' },
        { status: 400 }
      );
    }
    
    // Validate image file
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (image.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Image too large. Maximum size: 50MB' },
        { status: 400 }
      );
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid image type. Allowed: JPEG, PNG, WebP' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabase = createClient();
    
    // Upload image to Supabase Storage
    const imagePath = `clothing/${userId}/${Date.now()}-${image.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('clothing-images')
      .upload(imagePath, image, {
        contentType: image.type,
        upsert: false,
      });
    
    if (uploadError) {
      console.error('Image upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload image' },
        { status: 500 }
      );
    }
    
    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('clothing-images')
      .getPublicUrl(imagePath);
    
    // Create thumbnail (simplified - in production, you'd use the image processor)
    const thumbnailPath = `clothing/${userId}/thumbnails/${Date.now()}-thumb-${image.name}`;
    const { data: thumbnailData, error: thumbnailError } = await supabase.storage
      .from('clothing-images')
      .upload(thumbnailPath, image, {
        contentType: image.type,
        upsert: false,
      });
    
    if (thumbnailError) {
      console.error('Thumbnail upload error:', thumbnailError);
      // Continue without thumbnail
    }
    
    const { data: thumbnailUrlData } = supabase.storage
      .from('clothing-images')
      .getPublicUrl(thumbnailPath);
    
    // Insert clothing item into database
    const { data: itemData, error: dbError } = await supabase
      .from('clothing_items')
      .insert({
        user_id: userId,
        name,
        category,
        image_url: urlData.publicUrl,
        thumbnail_url: thumbnailUrlData?.publicUrl || urlData.publicUrl,
        metadata,
        is_active: true,
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to save clothing item' },
        { status: 500 }
      );
    }
    
    // Update usage tracking
    try {
      await supabase.rpc('increment_usage_tracking', {
        user_id: userId,
        resource_type: 'clothing_items',
        increment_amount: 1,
      });
    } catch (error) {
      console.error('Usage tracking error:', error);
      // Don't fail the request for tracking errors
    }
    
    return NextResponse.json({
      success: true,
      data: itemData,
      message: 'Clothing item uploaded successfully',
    });
    
  } catch (error) {
    console.error('Clothing upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload/clothing
 * Get user's clothing items with tier status
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const supabase = createClient();
    
    // Get clothing items
    const { data: items, error: itemsError } = await supabase
      .from('clothing_items')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false });
    
    if (itemsError) {
      console.error('Database error:', itemsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch clothing items' },
        { status: 500 }
      );
    }
    
    // Get tier status
    const tierStatus = await TierService.getUserTierStatus(userId);
    
    return NextResponse.json({
      success: true,
      data: {
        items,
        tierStatus,
      },
    });
    
  } catch (error) {
    console.error('Clothing fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}