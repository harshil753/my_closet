/**
 * AI-Powered Clothing Detection Service
 * 
 * This service uses AI to validate and analyze uploaded clothing images.
 * It provides automatic category detection, quality assessment, and
 * metadata extraction to improve the user experience.
 */

import { ClothingCategory } from '@/lib/types/common';

/**
 * Clothing detection result
 */
export interface ClothingDetectionResult {
  success: boolean;
  confidence: number;
  detectedCategory: ClothingCategory | null;
  suggestedCategory: ClothingCategory | null;
  qualityScore: number;
  detectedAttributes: {
    color?: string;
    style?: string;
    pattern?: string;
    material?: string;
  };
  suggestions: string[];
  warnings: string[];
  error?: string;
}

/**
 * Image analysis result
 */
export interface ImageAnalysisResult {
  isClothing: boolean;
  clothingType: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  recommendations: string[];
}

/**
 * AI Clothing Detection Service
 */
export class ClothingDetectionService {
  private apiKey: string;
  private baseUrl: string;
  
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }
  }
  
  /**
   * Analyze clothing image and provide detection results
   * 
   * @param imageUrl - URL of the image to analyze
   * @param userCategory - Category selected by user
   * @returns Detection result with suggestions and validation
   */
  async analyzeClothingImage(
    imageUrl: string,
    userCategory: ClothingCategory
  ): Promise<ClothingDetectionResult> {
    try {
      // Create analysis prompt
      const prompt = this.createAnalysisPrompt(userCategory);
      
      // Call Gemini API for image analysis
      const analysisResult = await this.callGeminiAPI(imageUrl, prompt);
      
      // Parse and validate the result
      const detectionResult = this.parseAnalysisResult(analysisResult, userCategory);
      
      return detectionResult;
      
    } catch (error) {
      console.error('Clothing detection error:', error);
      return {
        success: false,
        confidence: 0,
        detectedCategory: null,
        suggestedCategory: null,
        qualityScore: 0,
        detectedAttributes: {},
        suggestions: [],
        warnings: ['AI analysis failed. Please verify your selection manually.'],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Validate image quality for clothing detection
   * 
   * @param imageUrl - URL of the image to validate
   * @returns Image quality analysis
   */
  async validateImageQuality(imageUrl: string): Promise<ImageAnalysisResult> {
    try {
      const prompt = this.createQualityPrompt();
      const analysisResult = await this.callGeminiAPI(imageUrl, prompt);
      
      return this.parseQualityResult(analysisResult);
      
    } catch (error) {
      console.error('Image quality validation error:', error);
      return {
        isClothing: false,
        clothingType: 'unknown',
        quality: 'poor',
        issues: ['Unable to analyze image'],
        recommendations: ['Please try uploading a clearer image'],
      };
    }
  }
  
  /**
   * Get clothing suggestions based on detected attributes
   * 
   * @param attributes - Detected clothing attributes
   * @returns Array of styling suggestions
   */
  getClothingSuggestions(attributes: ClothingDetectionResult['detectedAttributes']): string[] {
    const suggestions: string[] = [];
    
    // Color-based suggestions
    if (attributes.color) {
      const color = attributes.color.toLowerCase();
      if (['black', 'navy', 'dark'].includes(color)) {
        suggestions.push('Great for formal occasions');
        suggestions.push('Pairs well with light colors');
      } else if (['white', 'cream', 'beige'].includes(color)) {
        suggestions.push('Perfect for summer outfits');
        suggestions.push('Versatile for layering');
      } else if (['red', 'pink', 'coral'].includes(color)) {
        suggestions.push('Bold choice for making a statement');
        suggestions.push('Great for special occasions');
      }
    }
    
    // Style-based suggestions
    if (attributes.style) {
      const style = attributes.style.toLowerCase();
      if (style.includes('casual')) {
        suggestions.push('Perfect for everyday wear');
        suggestions.push('Great for weekend outings');
      } else if (style.includes('formal')) {
        suggestions.push('Ideal for business meetings');
        suggestions.push('Perfect for special events');
      } else if (style.includes('sporty')) {
        suggestions.push('Great for active lifestyle');
        suggestions.push('Perfect for gym or outdoor activities');
      }
    }
    
    // Pattern-based suggestions
    if (attributes.pattern) {
      const pattern = attributes.pattern.toLowerCase();
      if (pattern.includes('striped')) {
        suggestions.push('Pairs well with solid colors');
        suggestions.push('Avoid mixing with other patterns');
      } else if (pattern.includes('polka')) {
        suggestions.push('Classic and timeless');
        suggestions.push('Great for retro-inspired looks');
      } else if (pattern.includes('floral')) {
        suggestions.push('Perfect for spring and summer');
        suggestions.push('Great for feminine styling');
      }
    }
    
    return suggestions;
  }
  
  /**
   * Create analysis prompt for Gemini API
   * 
   * @param userCategory - Category selected by user
   * @returns Formatted prompt string
   */
  private createAnalysisPrompt(userCategory: ClothingCategory): string {
    const categoryNames = {
      shirts_tops: 'shirts and tops',
      pants_bottoms: 'pants and bottoms',
      shoes: 'shoes',
    };
    
    return `
Analyze this clothing image and provide a detailed assessment. The user has categorized this as: ${categoryNames[userCategory]}.

Please provide:
1. The actual clothing type (shirt, pants, shoes, etc.)
2. The category it belongs to (shirts_tops, pants_bottoms, shoes)
3. Confidence level (0-100) that this is clothing
4. Quality score (0-100) for the image
5. Detected attributes:
   - Primary color
   - Style (casual, formal, sporty, etc.)
   - Pattern (solid, striped, floral, etc.)
   - Material (cotton, denim, leather, etc.)
6. Any issues with the image (blurry, poor lighting, etc.)
7. Recommendations for better photos

Format your response as JSON with these fields:
{
  "isClothing": boolean,
  "clothingType": string,
  "detectedCategory": "shirts_tops" | "pants_bottoms" | "shoes",
  "confidence": number,
  "qualityScore": number,
  "attributes": {
    "color": string,
    "style": string,
    "pattern": string,
    "material": string
  },
  "issues": string[],
  "recommendations": string[]
}
    `.trim();
  }
  
  /**
   * Create quality validation prompt
   * 
   * @returns Formatted prompt string
   */
  private createQualityPrompt(): string {
    return `
Analyze this image for clothing detection quality. Assess:

1. Is this clearly a clothing item?
2. What type of clothing is it?
3. Image quality (excellent, good, fair, poor)
4. Any issues that would affect AI processing:
   - Blurry or unclear
   - Poor lighting
   - Background interference
   - Item not fully visible
   - Multiple items in frame
5. Recommendations for better photos

Format your response as JSON:
{
  "isClothing": boolean,
  "clothingType": string,
  "quality": "excellent" | "good" | "fair" | "poor",
  "issues": string[],
  "recommendations": string[]
}
    `.trim();
  }
  
  /**
   * Call Gemini API for image analysis
   * 
   * @param imageUrl - URL of the image
   * @param prompt - Analysis prompt
   * @returns API response
   */
  private async callGeminiAPI(imageUrl: string, prompt: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: await this.imageToBase64(imageUrl),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  }
  
  /**
   * Convert image URL to base64
   * 
   * @param imageUrl - Image URL
   * @returns Base64 encoded image
   */
  private async imageToBase64(imageUrl: string): Promise<string> {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return base64;
  }
  
  /**
   * Parse analysis result from Gemini API
   * 
   * @param apiResult - Raw API response
   * @param userCategory - User-selected category
   * @returns Parsed detection result
   */
  private parseAnalysisResult(apiResult: any, userCategory: ClothingCategory): ClothingDetectionResult {
    try {
      const content = apiResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error('No content in API response');
      }
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and format the result
      const confidence = Math.max(0, Math.min(100, parsed.confidence || 0));
      const qualityScore = Math.max(0, Math.min(100, parsed.qualityScore || 0));
      
      const detectedCategory = this.validateCategory(parsed.detectedCategory);
      const suggestedCategory = detectedCategory !== userCategory ? detectedCategory : null;
      
      const suggestions = this.getClothingSuggestions(parsed.attributes || {});
      
      return {
        success: true,
        confidence,
        detectedCategory,
        suggestedCategory,
        qualityScore,
        detectedAttributes: parsed.attributes || {},
        suggestions,
        warnings: parsed.issues || [],
      };
      
    } catch (error) {
      console.error('Error parsing analysis result:', error);
      return {
        success: false,
        confidence: 0,
        detectedCategory: null,
        suggestedCategory: null,
        qualityScore: 0,
        detectedAttributes: {},
        suggestions: [],
        warnings: ['Failed to parse AI analysis'],
        error: error instanceof Error ? error.message : 'Unknown parsing error',
      };
    }
  }
  
  /**
   * Parse quality validation result
   * 
   * @param apiResult - Raw API response
   * @returns Parsed quality result
   */
  private parseQualityResult(apiResult: any): ImageAnalysisResult {
    try {
      const content = apiResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error('No content in API response');
      }
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        isClothing: parsed.isClothing || false,
        clothingType: parsed.clothingType || 'unknown',
        quality: parsed.quality || 'poor',
        issues: parsed.issues || [],
        recommendations: parsed.recommendations || [],
      };
      
    } catch (error) {
      console.error('Error parsing quality result:', error);
      return {
        isClothing: false,
        clothingType: 'unknown',
        quality: 'poor',
        issues: ['Failed to analyze image quality'],
        recommendations: ['Please try uploading a clearer image'],
      };
    }
  }
  
  /**
   * Validate and normalize category
   * 
   * @param category - Category string from API
   * @returns Validated category or null
   */
  private validateCategory(category: string): ClothingCategory | null {
    const validCategories: ClothingCategory[] = ['shirts_tops', 'pants_bottoms', 'shoes'];
    
    if (validCategories.includes(category as ClothingCategory)) {
      return category as ClothingCategory;
    }
    
    // Try to map common variations
    const categoryMap: Record<string, ClothingCategory> = {
      'shirt': 'shirts_tops',
      'top': 'shirts_tops',
      'blouse': 'shirts_tops',
      'pants': 'pants_bottoms',
      'jeans': 'pants_bottoms',
      'shorts': 'pants_bottoms',
      'skirt': 'pants_bottoms',
      'shoe': 'shoes',
      'boot': 'shoes',
      'sneaker': 'shoes',
    };
    
    const normalized = category.toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (normalized.includes(key)) {
        return value;
      }
    }
    
    return null;
  }
}

/**
 * Utility functions for clothing detection
 */
export const ClothingDetectionUtils = {
  /**
   * Create detection service instance
   */
  create: () => new ClothingDetectionService(),
  
  /**
   * Get category display name
   */
  getCategoryDisplayName: (category: ClothingCategory): string => {
    const names = {
      shirts_tops: 'Shirts & Tops',
      pants_bottoms: 'Pants & Bottoms',
      shoes: 'Shoes',
    };
    return names[category];
  },
  
  /**
   * Format confidence score for display
   */
  formatConfidence: (confidence: number): string => {
    if (confidence >= 90) return 'Very High';
    if (confidence >= 70) return 'High';
    if (confidence >= 50) return 'Medium';
    if (confidence >= 30) return 'Low';
    return 'Very Low';
  },
  
  /**
   * Format quality score for display
   */
  formatQuality: (quality: number): string => {
    if (quality >= 90) return 'Excellent';
    if (quality >= 70) return 'Good';
    if (quality >= 50) return 'Fair';
    return 'Poor';
  },
};

export default ClothingDetectionService;
