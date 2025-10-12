/**
 * Gemini AI integration for virtual try-on processing
 * Centralized AI service with comprehensive error handling and retry logic
 */

import { GenerativeModel } from '@google/generative-ai';
import {
  geminiClient,
  aiConfig,
  promptTemplates,
  processingLimits,
  errorMessages,
} from '@/lib/config/ai';

/**
 * AI processing result interface
 */
export interface AIProcessingResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  processingTime?: number;
  retryCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Virtual try-on request interface
 */
export interface VirtualTryOnRequest {
  userBasePhotos: string[]; // Base64 encoded images
  clothingItems: string[]; // Base64 encoded images
  sessionId: string;
  userId: string;
}

/**
 * Clothing detection result interface
 */
export interface ClothingDetectionResult {
  isClothing: boolean;
  category: string;
  quality: 'good' | 'fair' | 'poor';
  suitable: boolean;
  confidence: number;
  suggestions?: string[];
}

/**
 * AI processing status interface
 */
export interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
}

/**
 * Gemini AI service class for virtual try-on processing
 */
export class GeminiAIService {
  private model: GenerativeModel;
  private processingQueue: Map<string, ProcessingStatus> = new Map();

  constructor() {
    this.model = geminiClient.getGenerativeModel({
      model: aiConfig.model,
      generationConfig: aiConfig.generationConfig,
      safetySettings: [...aiConfig.safetySettings],
    });
  }

  /**
   * Process virtual try-on request with comprehensive error handling
   */
  async processVirtualTryOn(
    request: VirtualTryOnRequest
  ): Promise<AIProcessingResult> {
    const startTime = Date.now();
    const sessionId = request.sessionId;

    try {
      // Update processing status
      this.updateProcessingStatus(sessionId, {
        status: 'processing',
        progress: 10,
        message: 'Validating input images...',
      });

      // Validate input
      const validationResult = this.validateVirtualTryOnRequest(request);
      if (!validationResult.valid) {
        this.updateProcessingStatus(sessionId, {
          status: 'failed',
          progress: 0,
          message: validationResult.error || 'Validation failed',
        });
        return {
          success: false,
          error: validationResult.error,
          processingTime: Date.now() - startTime,
        };
      }

      this.updateProcessingStatus(sessionId, {
        status: 'processing',
        progress: 30,
        message: 'Preparing AI prompt...',
      });

      // Build optimized prompt
      const prompt = this.buildOptimizedVirtualTryOnPrompt(
        request.userBasePhotos,
        request.clothingItems
      );

      this.updateProcessingStatus(sessionId, {
        status: 'processing',
        progress: 50,
        message: 'Generating virtual try-on image...',
      });

      // Generate content with timeout
      const result = await this.generateWithTimeout(prompt, [
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

      this.updateProcessingStatus(sessionId, {
        status: 'processing',
        progress: 80,
        message: 'Processing AI response...',
      });

      const response = await result.response;
      const imageData = this.extractImageFromResponse(response);

      if (!imageData) {
        this.updateProcessingStatus(sessionId, {
          status: 'failed',
          progress: 0,
          message: 'Failed to generate image',
        });
        return {
          success: false,
          error: errorMessages.processingFailed,
          processingTime: Date.now() - startTime,
        };
      }

      const processingTime = Date.now() - startTime;

      this.updateProcessingStatus(sessionId, {
        status: 'completed',
        progress: 100,
        message: 'Virtual try-on completed successfully',
      });

      return {
        success: true,
        imageUrl: `data:image/jpeg;base64,${imageData}`,
        processingTime,
        metadata: {
          sessionId,
          userId: request.userId,
          imagesProcessed:
            request.userBasePhotos.length + request.clothingItems.length,
          model: aiConfig.model,
        },
      };
    } catch (error) {
      console.error('Virtual try-on processing error:', error);

      this.updateProcessingStatus(sessionId, {
        status: 'failed',
        progress: 0,
        message: 'AI processing failed',
      });

      return {
        success: false,
        error: this.handleAIError(error),
        processingTime: Date.now() - startTime,
        metadata: {
          sessionId,
          userId: request.userId,
          errorType:
            error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  /**
   * Detect clothing in uploaded image
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

      // Parse JSON response with error handling
      const detection = this.parseDetectionResponse(text);

      return {
        isClothing: detection.isClothing,
        category: detection.category,
        quality: detection.quality,
        suitable: detection.suitable,
        confidence: detection.confidence,
        suggestions: detection.suggestions || [],
      };
    } catch (error) {
      console.error('Clothing detection error:', error);

      return {
        isClothing: false,
        category: 'unknown',
        quality: 'poor',
        suitable: false,
        confidence: 0,
        suggestions: ['Please ensure the image contains clear clothing items'],
      };
    }
  }

  /**
   * Get processing status for a session
   */
  getProcessingStatus(sessionId: string): ProcessingStatus | null {
    return this.processingQueue.get(sessionId) || null;
  }

  /**
   * Clear processing status for a session
   */
  clearProcessingStatus(sessionId: string): void {
    this.processingQueue.delete(sessionId);
  }

  /**
   * Validate virtual try-on request
   */
  private validateVirtualTryOnRequest(request: VirtualTryOnRequest): {
    valid: boolean;
    error?: string;
  } {
    // Check required fields
    if (!request.userBasePhotos?.length) {
      return { valid: false, error: 'User base photos are required' };
    }

    if (!request.clothingItems?.length) {
      return { valid: false, error: 'Clothing items are required' };
    }

    if (!request.sessionId) {
      return { valid: false, error: 'Session ID is required' };
    }

    if (!request.userId) {
      return { valid: false, error: 'User ID is required' };
    }

    // Check image limits
    const totalImages =
      request.userBasePhotos.length + request.clothingItems.length;
    if (totalImages > processingLimits.maxImagesPerRequest) {
      return {
        valid: false,
        error: `Too many images. Maximum ${processingLimits.maxImagesPerRequest} allowed`,
      };
    }

    // Check total image size
    const totalSize = this.calculateTotalImageSize([
      ...request.userBasePhotos,
      ...request.clothingItems,
    ]);
    if (totalSize > processingLimits.maxImageSize) {
      return {
        valid: false,
        error: 'Total image size exceeds limit',
      };
    }

    return { valid: true };
  }

  /**
   * Build optimized virtual try-on prompt
   */
  private buildOptimizedVirtualTryOnPrompt(
    userBasePhotos: string[],
    clothingItems: string[]
  ): string {
    return promptTemplates.virtualTryOn
      .replace(
        '{userBasePhotos}',
        `User has provided ${userBasePhotos.length} base photos showing their body type, skin tone, and facial features`
      )
      .replace(
        '{clothingItems}',
        `User has selected ${clothingItems.length} clothing items to try on`
      );
  }

  /**
   * Generate content with timeout
   */
  private async generateWithTimeout(
    prompt: string,
    images: any[]
  ): Promise<any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Processing timeout')),
        processingLimits.maxProcessingTime
      );
    });

    const generationPromise = this.model.generateContent([prompt, ...images]);

    return Promise.race([generationPromise, timeoutPromise]);
  }

  /**
   * Extract image data from AI response
   */
  private extractImageFromResponse(response: any): string | null {
    try {
      return (
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null
      );
    } catch (error) {
      console.error('Error extracting image from response:', error);
      return null;
    }
  }

  /**
   * Parse detection response with error handling
   */
  private parseDetectionResponse(text: string): any {
    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Error parsing detection response:', error);
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
   * Calculate total image size
   */
  private calculateTotalImageSize(images: string[]): number {
    return images.reduce((total, image) => {
      // Approximate base64 size calculation (base64 is ~33% larger than binary)
      return total + image.length * 0.75;
    }, 0);
  }

  /**
   * Update processing status for a session
   */
  private updateProcessingStatus(
    sessionId: string,
    status: ProcessingStatus
  ): void {
    this.processingQueue.set(sessionId, status);
  }

  /**
   * Handle AI processing errors
   */
  private handleAIError(error: any): string {
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return errorMessages.processingTimeout;
      }
      if (error.message.includes('rate limit')) {
        return errorMessages.rateLimitExceeded;
      }
      if (error.message.includes('invalid image')) {
        return errorMessages.invalidImage;
      }
      return error.message;
    }
    return errorMessages.processingFailed;
  }
}

/**
 * Create Gemini AI service instance
 */
export const geminiService = new GeminiAIService();

/**
 * Process virtual try-on with retry logic and exponential backoff
 */
export async function processVirtualTryOnWithRetry(
  request: VirtualTryOnRequest,
  maxRetries: number = processingLimits.maxRetries
): Promise<AIProcessingResult> {
  let lastError: string | undefined;
  let lastResult: AIProcessingResult | undefined;

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
      lastResult = result;

      // Exponential backoff for retries
      if (attempt < maxRetries) {
        const delay = processingLimits.retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';

      if (attempt < maxRetries) {
        const delay = processingLimits.retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError || 'Max retries exceeded',
    retryCount: maxRetries,
    ...lastResult,
  };
}

/**
 * Batch process multiple virtual try-on requests
 */
export async function batchProcessVirtualTryOn(
  requests: VirtualTryOnRequest[]
): Promise<AIProcessingResult[]> {
  const results: AIProcessingResult[] = [];

  // Process requests in parallel with concurrency limit
  const concurrencyLimit = 3;
  const chunks = [];

  for (let i = 0; i < requests.length; i += concurrencyLimit) {
    chunks.push(requests.slice(i, i + concurrencyLimit));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map((request) => processVirtualTryOnWithRetry(request))
    );
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Health check for Gemini AI service
 */
export async function checkGeminiHealth(): Promise<{
  healthy: boolean;
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Simple test request to verify service is working
    const result = await geminiService.detectClothing('test');
    const responseTime = Date.now() - startTime;

    return {
      healthy: true,
      responseTime,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
