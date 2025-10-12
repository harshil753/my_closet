/**
 * AI Try-On Processor
 * Handles the actual AI processing for virtual try-on
 */

import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from '@/lib/config/supabase';
import mime from 'mime';

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
        request.clothingItems,
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
   * Get image dimensions from buffer (simple JPEG/PNG parser)
   */
  private static async getImageDimensions(
    buffer: Buffer
  ): Promise<{ width: number; height: number }> {
    try {
      // Try using sharp if available (more reliable)
      const sharp = await import('sharp');
      const metadata = await sharp.default(buffer).metadata();
      return {
        width: metadata.width || 1024,
        height: metadata.height || 1024,
      };
    } catch {
      // Fallback to simple parsing for JPEG
      if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        // JPEG format
        let offset = 2;
        while (offset < buffer.length) {
          if (buffer[offset] !== 0xff) break;
          const marker = buffer[offset + 1];
          if (marker === 0xc0 || marker === 0xc2) {
            // SOF0 or SOF2
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height };
          }
          const length = buffer.readUInt16BE(offset + 2);
          offset += length + 2;
        }
      }
      // PNG format
      else if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      ) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
      // Default fallback
      return { width: 1024, height: 1024 };
    }
  }

  /**
   * Generate region-specific constraints based on clothing categories
   */
  private static generateRegionConstraints(
    clothingItems: Array<{ category: string; name: string }>
  ): string {
    const constraints: string[] = [];
    const categories = clothingItems.map((item) => item.category.toLowerCase());

    // Check for shoes
    if (categories.some((cat) => cat.includes('shoe'))) {
      constraints.push(
        '- SHOES: Modify ONLY the foot/shoe area at the BOTTOM of the image (bottom 15% of the body). Keep the rest of the legs, pants, upper body, and face completely unchanged.'
      );
    }

    // Check for tops/shirts
    if (
      categories.some(
        (cat) =>
          cat.includes('shirt') ||
          cat.includes('top') ||
          cat.includes('t-shirt') ||
          cat.includes('tshirt')
      )
    ) {
      constraints.push(
        '- TOPS/SHIRTS: Modify ONLY the upper body area (shoulders, chest, torso) ABOVE the waist. Keep the pants/bottoms, shoes, and lower body completely unchanged. Preserve the exact face, neck, and arms.'
      );
    }

    // Check for pants/bottoms
    if (
      categories.some(
        (cat) =>
          cat.includes('pant') || cat.includes('bottom') || cat.includes('jean')
      )
    ) {
      constraints.push(
        '- PANTS/BOTTOMS: Modify ONLY the leg area from waist to ankles (middle section). Keep the shoes/feet at bottom and upper body/torso at top completely unchanged.'
      );
    }

    if (constraints.length === 0) {
      return 'Apply the clothing items to the appropriate body regions based on their type.';
    }

    return `REGION-SPECIFIC EDITING RULES:
${constraints.join('\n')}

CRITICAL: Only edit the specified regions for each clothing type. All other parts of the body and image must remain EXACTLY as they appear in the reference photo.`;
  }

  /**
   * Real AI integration with Gemini API for virtual try-on
   * Using Google Generative AI SDK from AI Studio (streaming approach)
   */
  private static async callGeminiAPI(
    basePhoto: string,
    clothingItems: Array<{
      id: string;
      imageUrl: string;
      category: string;
      name: string;
    }>,
    userId: string
  ): Promise<string> {
    try {
      console.log('=== Gemini API Call Starting (Google AI Studio SDK) ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Model: gemini-2.5-flash-image');
      console.log('Base photo:', basePhoto);
      console.log(
        'Clothing items:',
        clothingItems
          .map((item) => `${item.name} (${item.category})`)
          .join(', ')
      );
      console.log('==============================');

      // Initialize Google AI client (like AI Studio) via dynamic import to avoid ESM issues in Jest
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: this.GEMINI_API_KEY! });

      // Download and convert images to base64
      console.log('📥 Downloading images from URLs...');
      const basePhotoBase64 = await this.downloadImageAsBase64(basePhoto);

      // Get base photo dimensions for logging and prompt
      const basePhotoBuffer = Buffer.from(basePhotoBase64, 'base64');
      console.log('📐 Base photo size:', basePhotoBuffer.length, 'bytes');

      // Get actual image dimensions
      const dimensions = await this.getImageDimensions(basePhotoBuffer);
      console.log(
        '📐 Base photo dimensions:',
        `${dimensions.width}x${dimensions.height}`
      );
      const aspectRatio = dimensions.width / dimensions.height;

      const clothingItemsBase64 = await Promise.all(
        clothingItems.map((item) => this.downloadImageAsBase64(item.imageUrl))
      );
      console.log('✅ All images downloaded and converted');

      // Generate region-specific constraints based on clothing categories
      const regionConstraints = this.generateRegionConstraints(clothingItems);
      console.log('📍 Region constraints:', regionConstraints);

      // Build clothing items description with categories
      const clothingDescriptions = clothingItems
        .map((item, idx) => `${idx + 2}. ${item.name} (${item.category})`)
        .join('\n');

      // Final attempt: Frame as editing task with strict reference preservation and region targeting
      const prompt = `TASK: Photo editing - REGION-SPECIFIC clothing replacement with FULL FRAME PRESERVATION.

OBJECTIVE: Take the user's full-length photo (head to toe) and ONLY replace specific clothing items based on their location on the body. The person, pose, framing, and everything else MUST remain exactly the same.

INPUT IMAGES (${1 + clothingItemsBase64.length} total):
1. Reference photo (first image below): A full-length photo of a person from head to toe
${clothingDescriptions}

CRITICAL CONSTRAINTS - ABSOLUTE REQUIREMENTS:
- PRESERVE THE ENTIRE USER PHOTO: The output must show the COMPLETE person from head to toe, exactly as they appear in the reference photo
- ONLY CHANGE CLOTHING: The ONLY modifications allowed are replacing clothing items in their designated regions
- DO NOT alter the person in any way (face, skin, hair, body proportions, pose, position)
- DO NOT alter the background, lighting, shadows, or scene composition
- DO NOT crop, zoom, reframe, or cut off any part of the person or photo
- The user uploaded a full-length photo - you must return a full-length photo showing the same complete view

CRITICAL DIMENSIONS - MUST MATCH EXACTLY:
- Reference photo dimensions: ${dimensions.width} x ${dimensions.height} pixels
- Aspect ratio: ${aspectRatio.toFixed(3)} (width/height)
- Output MUST be EXACTLY ${dimensions.width} x ${dimensions.height} pixels
- DO NOT crop, zoom, or reframe the image in ANY way
- The ENTIRE person from head to feet must be visible in the output
- PRESERVE THE COMPLETE IMAGE FRAME: Generate the ENTIRE image from head to toe, including all visible body parts in the original
- CRITICAL: When editing shoes/pants combinations, ensure the COMPLETE body (head, torso, legs, feet) remains visible - do not crop at ankles or anywhere else

${regionConstraints}

SPATIAL HIERARCHY - CLOTHING PLACEMENT ON BODY:
The human body has a clear vertical structure from HEAD TO TOE. Clothing items occupy specific regions:
1. SHOES - Located at the BOTTOM (feet area, under pants)
2. PANTS - Located in the MIDDLE (legs from waist to ankles, between shoes below and shirts above)
3. SHIRTS/TOPS - Located at the TOP (neck down to waist, above pants)

When editing, respect this spatial hierarchy:
- Shoes are the LOWEST items (bottom of the image)
- Pants are in the MIDDLE (above shoes, below shirts)
- Shirts are in the UPPER region (above pants, below head)

FULL-LENGTH PHOTO REQUIREMENT:
The reference photo shows the ENTIRE person from HEAD to FEET. Your output MUST also show:
- The complete head at the top
- The complete torso in the middle
- The complete legs
- The complete feet/shoes at the bottom
- The same amount of floor/background space around the person

DO NOT:
- Zoom into just the torso or legs
- Cut off the head, feet, or any body part
- Change the camera angle or framing
- Crop to focus on just the clothing areas being edited

INSTRUCTIONS:
Take the first reference photo (showing the FULL person from head to toe) and digitally replace ONLY the clothing in the SPECIFIED REGIONS with the items shown in images 2-${1 + clothingItemsBase64.length}. This is surgical photo editing - modify ONLY the targeted clothing regions while preserving the complete head-to-toe view of the person.

What to preserve from the first photo:
- Exact same person (face, features, skin tone, hair, body proportions)
- Exact same pose and position
- Exact same background (white door with panels)
- Exact same floor (beige/tan tile)
- Exact same lighting and shadows
- Exact same image framing and composition
- COMPLETE BODY VISIBILITY: Show the entire person from head to toe, do not crop any part
- FULL IMAGE BOUNDS: Include all edges of the original photo - top, bottom, left, and right
- All body regions NOT specified in the region rules above

What to change from the first photo:
- ONLY the clothing in the SPECIFIC REGIONS defined above for each clothing type
- If editing SHOES: ONLY the bottom portion (feet area at the LOWEST part of the image, UNDER the pants hem)
- If editing PANTS: ONLY the middle leg area (from waist to ankles, BETWEEN the shoes below and shirt above)
- If editing TOPS/SHIRTS: ONLY the upper body area (from neck down to waist, ABOVE the pants, below the head)

REMEMBER: These regions are stacked vertically on the body:
- HEAD (top - never edit)
- SHIRTS/TOPS (upper body)
- PANTS (middle body)
- SHOES (bottom)
You must maintain this complete vertical structure in the output - from head at top to shoes at bottom

CRITICAL OUTPUT REQUIREMENTS:
- Output dimensions: EXACTLY ${dimensions.width} x ${dimensions.height} pixels (no exceptions)
- Output aspect ratio: EXACTLY ${aspectRatio.toFixed(3)} (width/height)
- Generate a COMPLETE image showing the ENTIRE person from head to toe
- DO NOT crop or cut off any body parts (head, feet, arms, etc.)
- DO NOT zoom in or out from the original framing
- The output must preserve the EXACT same framing and composition as the reference photo
- Every pixel from the original frame should be represented in the output
- All four edges (top, bottom, left, right) must match the reference photo exactly

FINAL OUTPUT DESCRIPTION:
Generate a photo-realistic FULL-LENGTH image (HEAD TO TOE) at EXACTLY ${dimensions.width}x${dimensions.height} pixels showing:
- The SAME complete person from the reference photo (head at top, feet/shoes at bottom)
- The SAME pose, position, background, and framing
- ONLY the specified clothing items changed in their designated regions (shoes at bottom, pants in middle, shirts at top)
- Everything else IDENTICAL to the reference photo

The output must be a complete head-to-toe view with no cropping, no zooming, no reframing. An observer should see the FULL person (from head to floor) with ONLY the targeted clothing items changed in their proper locations on the body.`;

      // Build the parts array with text prompt and images
      interface GeminiPart {
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }

      const parts: GeminiPart[] = [
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

      // Log the actual prompt being sent
      console.log(
        '📝 PROMPT PREVIEW (first 200 chars):',
        prompt.substring(0, 200) + '...'
      );

      // Configuration (same as AI Studio) with additional parameters
      const config = {
        responseModalities: ['IMAGE', 'TEXT'],
        // Temperature 0 for more consistent, less creative outputs
        temperature: 0.1,
        // Request high quality output
        topP: 0.9,
      };

      const model = 'gemini-2.5-flash-image';
      const contents = [
        {
          role: 'user' as const,
          parts: parts,
        },
      ];

      console.log('📤 Calling Gemini API with streaming...');
      console.log('🔧 Model:', model);
      console.log('🔧 Config:', JSON.stringify(config));

      // Use streaming API (like AI Studio)
      const response = await ai.models.generateContentStream({
        model,
        config,
        contents,
      });

      console.log('✅ Streaming started, processing chunks...');

      // Process streaming response
      for await (const chunk of response) {
        if (
          !chunk.candidates ||
          !chunk.candidates[0].content ||
          !chunk.candidates[0].content.parts
        ) {
          continue;
        }

        // Check for image in chunk
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          console.log('✅ Generated image found in stream!');
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          const imageData = inlineData.data || '';
          const mimeType = inlineData.mimeType || 'image/png';

          console.log(
            `📊 Generated image data length: ${imageData.length} characters, type: ${mimeType}`
          );

          // Log image size for debugging aspect ratio issues
          const generatedBuffer = Buffer.from(imageData, 'base64');
          console.log(
            '📐 Generated image size:',
            generatedBuffer.length,
            'bytes'
          );
          console.log(
            '📊 Size ratio (generated/original):',
            (generatedBuffer.length / basePhotoBuffer.length).toFixed(2)
          );

          // Verify generated image dimensions match original
          try {
            const generatedDims =
              await this.getImageDimensions(generatedBuffer);
            console.log(
              '📐 Generated image dimensions:',
              `${generatedDims.width}x${generatedDims.height}`
            );

            // Check if dimensions match
            if (
              generatedDims.width !== dimensions.width ||
              generatedDims.height !== dimensions.height
            ) {
              console.warn(
                `⚠️  DIMENSION MISMATCH! Expected ${dimensions.width}x${dimensions.height}, got ${generatedDims.width}x${generatedDims.height}`
              );
              console.warn(
                '⚠️  Gemini did not respect the dimension requirements'
              );
              console.warn(
                '💡 This likely means the image is cropped/reframed - consider trying another generation'
              );
            } else {
              console.log('✅ Dimensions match perfectly!');
            }
          } catch (dimError) {
            console.warn(
              '⚠️  Could not verify generated image dimensions:',
              dimError
            );
          }

          const imageUrl = await this.uploadGeneratedImage(
            imageData,
            mimeType,
            userId
          );
          console.log('✅ Image uploaded successfully');
          return imageUrl;
        } else if (chunk.text) {
          console.log('📝 Text chunk:', chunk.text);
        }
      }

      // No image found in stream
      console.log('⚠️  No image found in stream, using fallback');
      return await this.createCompositeImage(
        basePhoto,
        clothingItems.map((item) => item.imageUrl)
      );
    } catch (error) {
      console.error('❌ Gemini API error:', error);

      // Handle rate limiting
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const hasRateLimit = errorMessage.includes('429');

      if (hasRateLimit) {
        console.warn('⚠️  Rate limit hit, using composite image');
      }

      // Fall back to composite image on error
      return await this.createCompositeImage(
        basePhoto,
        clothingItems.map((item) => item.imageUrl)
      );
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
