/**
 * AI Clothing Detection API Route
 * 
 * This route provides AI-powered clothing detection and validation
 * for uploaded images. It analyzes images to detect clothing type,
 * validate categories, and provide quality assessments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ClothingDetectionService } from '@/lib/ai/clothingDetection';
import { ClothingCategory } from '@/lib/types/common';

/**
 * POST /api/ai/clothing-detection
 * Analyze clothing image with AI
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from request
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { imageUrl, category } = body;
    
    // Validate required fields
    if (!imageUrl || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: imageUrl, category' },
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
    
    // Initialize AI detection service
    const detectionService = new ClothingDetectionService();
    
    // Analyze the clothing image
    const detectionResult = await detectionService.analyzeClothingImage(imageUrl, category);
    
    // Validate image quality
    const qualityResult = await detectionService.validateImageQuality(imageUrl);
    
    // Combine results
    const result = {
      detection: detectionResult,
      quality: qualityResult,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    console.error('Clothing detection API error:', error);
    return NextResponse.json(
      { success: false, error: 'AI analysis failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/clothing-detection
 * Get detection suggestions and tips
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category') as ClothingCategory;
    
    // Get category-specific tips
    const tips = getCategoryTips(category);
    
    return NextResponse.json({
      success: true,
      data: {
        tips,
        supportedCategories: ['shirts_tops', 'pants_bottoms', 'shoes'],
        aiCapabilities: [
          'Automatic category detection',
          'Quality assessment',
          'Attribute extraction',
          'Styling suggestions',
        ],
      },
    });
    
  } catch (error) {
    console.error('Clothing detection tips error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get tips' },
      { status: 500 }
    );
  }
}

/**
 * Get category-specific tips for better AI detection
 * 
 * @param category - Clothing category
 * @returns Array of tips
 */
function getCategoryTips(category: ClothingCategory | null): string[] {
  const generalTips = [
    'Use good lighting for better AI detection',
    'Ensure the entire item is visible',
    'Use a plain background when possible',
    'Avoid blurry or low-quality images',
  ];
  
  if (!category) {
    return generalTips;
  }
  
  const categoryTips = {
    shirts_tops: [
      'Lay the shirt flat or hang it properly',
      'Show the front of the shirt clearly',
      'Include the collar and sleeves in the frame',
      'Avoid wrinkles and creases',
    ],
    pants_bottoms: [
      'Lay pants flat or hang them straight',
      'Show the full length of the pants',
      'Include the waistband and hem',
      'Avoid bunching or folding',
    ],
    shoes: [
      'Place shoes side by side',
      'Show the top view of the shoes',
      'Include the sole and heel',
      'Clean the shoes before photographing',
    ],
  };
  
  return [...generalTips, ...(categoryTips[category] || [])];
}
