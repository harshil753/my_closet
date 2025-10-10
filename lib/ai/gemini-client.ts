/**
 * Gemini AI client for virtual try-on processing
 * Handles AI image generation and processing
 */

import { GenerativeModel } from '@google/generative-ai';
import {
  geminiClient,
  aiConfig,
  promptTemplates,
  processingLimits,
} from '@/lib/config/ai';

/**
 * AI processing result
 */
export interface AIProcessingResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  processingTime?: number;
  retryCount?: number;
}

/**
 * Virtual try-on request
 */
export interface VirtualTryOnRequest {
  userBasePhotos: string[]; // Base64 encoded images
  clothingItems: string[]; // Base64 encoded images
  sessionId: string;
}

/**
 * Clothing detection result
 */
export interface ClothingDetectionResult {
  isClothing: boolean;
  category: string;
  quality: 'good' | 'fair' | 'poor';
  suitable: boolean;
  confidence: number;
}

/**
 * Gemini AI service class
 */
export class GeminiAIService {
  private model: GenerativeModel;

  constructor() {
    this.model = geminiClient.getGenerativeModel({
      model: aiConfig.model,
      generationConfig: aiConfig.generationConfig,
      safetySettings: [...aiConfig.safetySettings],
    });
  }

  /**
   * Process virtual try-on request
   */
  async processVirtualTryOn(
    request: VirtualTryOnRequest
  ): Promise<AIProcessingResult> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!request.userBasePhotos.length || !request.clothingItems.length) {
        return {
          success: false,
          error: 'Missing required images for virtual try-on',
        };
      }

      // Check image sizes
      const totalSize = this.calculateTotalImageSize([
        ...request.userBasePhotos,
        ...request.clothingItems,
      ]);
      if (totalSize > processingLimits.maxImageSize) {
        return {
          success: false,
          error: 'Total image size exceeds limit',
        };
      }

      // Prepare prompt
      const prompt = this.buildVirtualTryOnPrompt(
        request.userBasePhotos,
        request.clothingItems
      );

      // Generate image
      const result = await this.model.generateContent([
        prompt,
        ...request.userBasePhotos.map((photo) => ({
          inlineData: {
            data: photo,
            mimeType: 'image/jpeg',
          },
        })),
        ...request.clothingItems.map((item) => ({
          inlineData: {
            data: item,
            mimeType: 'image/jpeg',
          },
        })),
      ]);

      const response = await result.response;
      const imageData =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!imageData) {
        return {
          success: false,
          error: 'Failed to generate image',
        };
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        imageUrl: `data:image/jpeg;base64,${imageData}`,
        processingTime,
      };
    } catch (error) {
      console.error('Virtual try-on processing error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI processing failed',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Detect if image contains clothing
   */
  async detectClothing(imageBase64: string): Promise<ClothingDetectionResult> {
    try {
      const result = await this.model.generateContent([
        promptTemplates.clothingDetection,
        {
          inlineData: {
            data: imageBase64,
            mimeType: 'image/jpeg',
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const detection = JSON.parse(text);

      return {
        isClothing: detection.isClothing,
        category: detection.category,
        quality: detection.quality,
        suitable: detection.suitable,
        confidence: detection.confidence,
      };
    } catch (error) {
      console.error('Clothing detection error:', error);

      return {
        isClothing: false,
        category: 'unknown',
        quality: 'poor',
        suitable: false,
        confidence: 0,
      };
    }
  }

  /**
   * Build virtual try-on prompt
   */
  private buildVirtualTryOnPrompt(
    userBasePhotos: string[],
    clothingItems: string[]
  ): string {
    return promptTemplates.virtualTryOn
      .replace(
        '{userBasePhotos}',
        `User has provided ${userBasePhotos.length} base photos`
      )
      .replace(
        '{clothingItems}',
        `User has selected ${clothingItems.length} clothing items`
      );
  }

  /**
   * Calculate total image size
   */
  private calculateTotalImageSize(images: string[]): number {
    return images.reduce((total, image) => {
      // Approximate base64 size calculation
      return total + image.length * 0.75;
    }, 0);
  }

  // Note: validateImage function removed as it's not currently used
  // Will be re-implemented when image validation is needed
}

/**
 * Create Gemini AI service instance
 */
export const geminiService = new GeminiAIService();

/**
 * Process virtual try-on with retry logic
 */
export async function processVirtualTryOnWithRetry(
  request: VirtualTryOnRequest,
  maxRetries: number = processingLimits.maxRetries
): Promise<AIProcessingResult> {
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await geminiService.processVirtualTryOn(request);

      if (result.success) {
        return {
          ...result,
          retryCount: attempt,
        };
      }

      lastError = result.error;

      // Wait before retry
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, processingLimits.retryDelay)
        );
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';

      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, processingLimits.retryDelay)
        );
      }
    }
  }

  return {
    success: false,
    error: lastError || 'Max retries exceeded',
    retryCount: maxRetries,
  };
}
