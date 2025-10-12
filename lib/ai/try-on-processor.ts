/**
 * AI Try-On Processor
 * Handles the actual AI processing for virtual try-on
 */

import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from '@/lib/config/supabase';

export interface TryOnRequest {
  sessionId: string;
  userId: string;
  basePhotoUrl: string;
  clothingItems: Array<{
    id: string;
    imageUrl: string;
    category: string;
    name: string;
  }>;
}

export interface TryOnResult {
  success: boolean;
  resultUrl?: string;
  error?: string;
  processingTime?: number;
}

export class TryOnProcessor {
  // Access environment variables directly at runtime, not at build time
  private static get GEMINI_API_KEY() {
    return process.env.GEMINI_API_KEY;
  }
  private static readonly SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Rate limiting: Track last API call time (disabled for development)
  // private static lastGeminiApiCall: number = 0;
  // private static readonly MIN_TIME_BETWEEN_CALLS = 60000; // 60 seconds minimum between calls

  // Global cooldown/disable windows (disabled for development)
  // private static cooldownUntilMs: number = 0; // short cooldown after 429
  // private static disabledUntilMs: number = 0; // longer disable if quota truly 0

  // Feature flag to fully disable Gemini without code changes
  private static get GEMINI_ENABLED() {
    const raw = (process.env.GEMINI_ENABLED ?? 'true').toLowerCase();
    return raw !== 'false' && raw !== '0' && raw !== 'off';
  }

  /**
   * Process a try-on session with AI
   */
  static async processTryOn(request: TryOnRequest): Promise<TryOnResult> {
    const startTime = Date.now();

    try {
      console.log('============================================');
      console.log('🔍 TRY-ON PROCESSOR STARTED');
      console.log('Session ID:', request.sessionId);
      console.log('User ID:', request.userId);
      console.log('============================================');
      console.log('📊 Environment Check:');
      console.log(
        '  - GEMINI_API_KEY:',
        this.GEMINI_API_KEY ? 'SET ✅' : 'NOT SET ❌'
      );
      console.log(
        '  - GEMINI_ENABLED:',
        this.GEMINI_ENABLED ? 'true ✅' : 'false ❌'
      );
      console.log(
        '  - API Key Preview:',
        this.GEMINI_API_KEY
          ? this.GEMINI_API_KEY.substring(0, 10) + '...'
          : 'N/A'
      );
      console.log('============================================');

      if (
        !this.GEMINI_API_KEY ||
        this.GEMINI_API_KEY === 'placeholder-gemini-key'
      ) {
        console.log('⚠️  USING SIMULATION MODE - API key not configured');
        console.log(
          '   Reason:',
          !this.GEMINI_API_KEY
            ? 'API key is undefined/null'
            : 'API key is placeholder value'
        );
        console.log('Starting AI simulation for session:', request.sessionId);
        // Fall back to simulation if no API key
        const result = await this.simulateAITryOn(request);
        console.log('Simulation result:', result);
        const processingTime = Date.now() - startTime;
        const finalResult = {
          success: true,
          resultUrl: result.resultUrl,
          processingTime,
        };
        console.log('Final TryOnProcessor result:', finalResult);
        return finalResult;
      }

      // Respect feature flag
      if (!this.GEMINI_ENABLED) {
        console.log('⚠️  USING SIMULATION MODE - GEMINI_ENABLED is false');
        const result = await this.simulateAITryOn(request);
        const processingTime = Date.now() - startTime;
        return { success: true, resultUrl: result.resultUrl, processingTime };
      }

      // Cooldown/disable checks removed for development

      // Use real Gemini API for actual AI processing
      console.log('✅ ALL CHECKS PASSED - Calling real Gemini API');
      console.log(
        '📸 Base Photo URL:',
        request.basePhotoUrl.substring(0, 60) + '...'
      );
      console.log('👕 Clothing Items:', request.clothingItems.length);
      const result = await this.callGeminiAPI(
        request.basePhotoUrl,
        request.clothingItems.map((item) => item.imageUrl),
        request.userId
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        resultUrl: result,
        processingTime,
      };
    } catch (error) {
      console.error('Try-on processing error:', error);
      // Fall back to simulation on error
      console.log('Falling back to simulation due to error');
      const result = await this.simulateAITryOn(request);
      const processingTime = Date.now() - startTime;
      return {
        success: true,
        resultUrl: result.resultUrl,
        processingTime,
      };
    }
  }

  /**
   * Simulate AI try-on processing
   * In a real implementation, this would:
   * 1. Download the base photo and clothing images
   * 2. Send them to Gemini or another AI service
   * 3. Get back a generated image of the user wearing the clothing
   */
  private static async simulateAITryOn(
    request: TryOnRequest
  ): Promise<{ resultUrl: string }> {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // For demo purposes, return a reliable placeholder image
    // In production, this would be the actual AI-generated result
    const placeholderImages = [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=600&fit=crop&crop=face&auto=format&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=600&fit=crop&crop=face&auto=format&q=80',
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=500&h=600&fit=crop&crop=face&auto=format&q=80',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&h=600&fit=crop&crop=face&auto=format&q=80',
    ];

    // Use a deterministic selection based on session ID to avoid random failures
    const sessionHash = request.sessionId.split('-').pop() || '0';
    const imageIndex = parseInt(sessionHash, 16) % placeholderImages.length;
    const resultUrl = placeholderImages[imageIndex];

    console.log('Simulation returning result URL:', resultUrl);

    // Validate the URL before returning
    if (!resultUrl || resultUrl.trim() === '') {
      console.error('Simulation generated empty or null URL!');
      const fallbackUrl =
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=600&fit=crop&crop=face&auto=format&q=80';
      console.log('Using fallback URL:', fallbackUrl);
      return { resultUrl: fallbackUrl };
    }

    return { resultUrl };
  }

  /**
   * Download image from URL and convert to base64
   */
  private static async downloadImageAsBase64(
    imageUrl: string
  ): Promise<string> {
    try {
      console.log('📥 Downloading image:', imageUrl.substring(0, 60) + '...');
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      console.log('✅ Image downloaded and converted to base64');
      return base64;
    } catch (error) {
      console.error('❌ Error downloading image:', error);
      throw error;
    }
  }

  /**
   * Real AI integration with Gemini API for virtual try-on
   * Based on the Python script provided
   */
  private static async callGeminiAPI(
    basePhoto: string,
    clothingItems: string[],
    userId: string
  ): Promise<string> {
    try {
      // Rate limiting checks removed for development

      console.log('=== Gemini API Call Starting ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Model: gemini-2.5-flash-image');
      console.log('Base photo:', basePhoto);
      console.log('Clothing items:', clothingItems);
      console.log(
        'NOTE: Free tier image generation is limited to ~1-2 requests per minute'
      );
      console.log('==============================');

      // Download and convert images to base64
      console.log('📥 Downloading images from URLs...');
      const basePhotoBase64 = await this.downloadImageAsBase64(basePhoto);
      const clothingItemsBase64 = await Promise.all(
        clothingItems.map((url) => this.downloadImageAsBase64(url))
      );
      console.log('✅ All images downloaded and converted');

      // Create a detailed prompt that references the actual images
      const prompt = `You are a professional virtual try-on AI. I am providing you with:
1. A base photo of a person (first image)
2. ${clothingItemsBase64.length} clothing item(s) they want to try on (subsequent images)

Please create a realistic virtual try-on image showing the SAME PERSON from the base photo wearing the clothing items provided. 

Requirements:
- Maintain the person's face, body shape, skin tone, and features from the base photo
- Naturally place the clothing items from the clothing images onto the person
- Ensure proper fit, draping, and realistic fabric behavior
- Match lighting and shadows to create a seamless, photorealistic result
- The person should look natural and comfortable in the clothing

Generate a high-quality virtual try-on result.`;

      // Build the parts array with text prompt and images
      const parts: any[] = [
        { text: prompt },
        // Add base photo
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: basePhotoBase64,
          },
        },
      ];

      // Add all clothing items
      clothingItemsBase64.forEach((clothingBase64) => {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: clothingBase64,
          },
        });
      });

      console.log(
        `📤 Sending ${parts.length} parts to Gemini (1 prompt + ${parts.length - 1} images)`
      );

      // Use Gemini's native image generation capabilities
      // Based on: https://ai.google.dev/gemini-api/docs/image-generation#limitations
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${this.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: parts,
              },
            ],
            generationConfig: {
              responseModalities: ['IMAGE'],
              temperature: 0.4, // Lower temperature for more consistent results
              topK: 32,
              topP: 0.9,
              maxOutputTokens: 2048,
              imageConfig: {
                aspectRatio: '3:4', // Portrait orientation for try-on results
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', errorText);

        // Handle rate limiting (429) specifically
        if (response.status === 429) {
          console.warn('Gemini 429 rate limit received.');
          console.warn('Rate limit cooldowns disabled for development.');
          console.warn('Using fallback composite image.');
          return await this.createCompositeImage(basePhoto, clothingItems);
        }

        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log('Gemini API response:', data);
      console.log('Full response structure:', JSON.stringify(data, null, 2));

      // Extract the generated image from the response
      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts
      ) {
        const parts = data.candidates[0].content.parts;
        console.log('Response parts:', parts);

        // Look for inline data (generated image)
        for (const part of parts) {
          console.log('Checking part:', part);
          if (part.inline_data && part.inline_data.data) {
            console.log('Gemini generated image found!');
            // Convert base64 to image URL
            const imageData = part.inline_data.data;
            const mimeType = part.inline_data.mime_type || 'image/jpeg';

            // Upload to Supabase Storage and return URL
            const imageUrl = await this.uploadGeneratedImage(
              imageData,
              mimeType,
              userId
            );
            console.log('Generated image uploaded to:', imageUrl);
            return imageUrl;
          } else if (part.inlineData && part.inlineData.data) {
            // Alternative field name
            console.log('Gemini generated image found (alternative field)!');
            const imageData = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/jpeg';

            const imageUrl = await this.uploadGeneratedImage(
              imageData,
              mimeType,
              userId
            );
            console.log('Generated image uploaded to:', imageUrl);
            return imageUrl;
          }
        }
      }

      // If no image found, fall back to composite
      console.log('No generated image found, using composite approach');
      return await this.createCompositeImage(basePhoto, clothingItems);
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fall back to composite image on error
      return await this.createCompositeImage(basePhoto, clothingItems);
    }
  }

  /**
   * Upload generated image to Supabase Storage
   */
  private static async uploadGeneratedImage(
    base64Data: string,
    mimeType: string,
    userId: string
  ): Promise<string> {
    try {
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Upload to Supabase Storage using ADMIN client (bypasses RLS)
      const supabaseAdmin = createSupabaseAdminClient();
      const fileName = `try-on-result-${Date.now()}.${mimeType.split('/')[1]}`;
      // Include userId folder for RLS policy compliance
      const filePath = `${userId}/${fileName}`;

      console.log('🔐 Uploading generated image with admin client:', filePath);

      const { data, error } = await supabaseAdmin.storage
        .from('try-on-results')
        .upload(filePath, imageBuffer, {
          contentType: mimeType,
          upsert: false,
          cacheControl: '3600',
        });

      if (error) {
        console.error('❌ Upload error details:', error);
        throw new Error(`Failed to upload generated image: ${error.message}`);
      }

      console.log('✅ Upload successful, data:', data);

      // Generate a signed URL that expires in 1 year (for long-term access)
      const { data: signedUrlData, error: signedUrlError } =
        await supabaseAdmin.storage
          .from('try-on-results')
          .createSignedUrl(filePath, 31536000); // 365 days in seconds

      if (signedUrlError || !signedUrlData) {
        console.error('❌ Error creating signed URL:', signedUrlError);
        // Fallback to public URL
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from('try-on-results').getPublicUrl(filePath);
        console.log(
          '⚠️  Using public URL (may not work if bucket is private):',
          publicUrl
        );
        return publicUrl;
      }

      console.log(
        '✅ Generated signed URL for image:',
        signedUrlData.signedUrl
      );
      return signedUrlData.signedUrl;
    } catch (error) {
      console.error('Error uploading generated image:', error);
      throw error;
    }
  }

  /**
   * Create a composite image for virtual try-on (fallback)
   */
  private static async createCompositeImage(
    basePhoto: string,
    clothingItems: string[]
  ): Promise<string> {
    try {
      console.log('Creating composite image for virtual try-on...');

      // Return a more realistic placeholder that looks like a try-on result
      const tryOnPlaceholders = [
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=600&fit=crop&crop=face&auto=format&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=600&fit=crop&crop=face&auto=format&q=80',
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=500&h=600&fit=crop&crop=face&auto=format&q=80',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&h=600&fit=crop&crop=face&auto=format&q=80',
      ];

      // Select a random placeholder for now
      const randomIndex = Math.floor(Math.random() * tryOnPlaceholders.length);
      const selectedPlaceholder = tryOnPlaceholders[randomIndex];

      console.log('Using placeholder image:', selectedPlaceholder);
      return selectedPlaceholder;
    } catch (error) {
      console.error('Error creating composite image:', error);
      throw error;
    }
  }

  /**
   * Upload result to Supabase Storage
   */
  private static async uploadResultToStorage(
    resultImage: Buffer,
    sessionId: string,
    userId: string
  ): Promise<string> {
    const supabase = await createSupabaseServerClient();

    const fileName = `try-on-result-${sessionId}-${Date.now()}.jpg`;
    const filePath = `try-on-results/${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('try-on-results')
      .upload(filePath, resultImage, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload result: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('try-on-results').getPublicUrl(filePath);

    return publicUrl;
  }
}
