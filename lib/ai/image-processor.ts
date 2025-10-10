/**
 * Image processing utilities for AI integration
 * Handles image compression, format conversion, and optimization
 */

/**
 * Image processing result
 */
export interface ImageProcessingResult {
  success: boolean;
  processedImage?: string; // Base64 encoded
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-100
  format?: 'jpeg' | 'png' | 'webp';
  maxFileSize?: number; // in bytes
}

/**
 * Default processing options
 */
const DEFAULT_OPTIONS: ImageProcessingOptions = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 85,
  format: 'jpeg',
  maxFileSize: 5 * 1024 * 1024, // 5MB
};

/**
 * Process image for AI processing
 */
export async function processImageForAI(
  imageFile: File,
  options: ImageProcessingOptions = {}
): Promise<ImageProcessingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Validate file type
    if (!isValidImageType(imageFile.type)) {
      return {
        success: false,
        error: 'Invalid image type. Please use JPEG, PNG, or WebP.',
      };
    }

    // Check file size
    if (imageFile.size > opts.maxFileSize!) {
      return {
        success: false,
        error: `File too large. Maximum size is ${Math.round(opts.maxFileSize! / 1024 / 1024)}MB`,
      };
    }

    // Create canvas for processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        success: false,
        error: 'Failed to create canvas context',
      };
    }

    // Load image
    const img = new Image();
    const imageLoadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
    });

    img.src = URL.createObjectURL(imageFile);
    await imageLoadPromise;

    // Calculate dimensions
    const { width, height } = calculateDimensions(
      img.width,
      img.height,
      opts.maxWidth!,
      opts.maxHeight!
    );

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Draw and compress image
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to base64
    const mimeType = `image/${opts.format}`;
    const base64 = canvas.toDataURL(mimeType, opts.quality! / 100);

    // Clean up
    URL.revokeObjectURL(img.src);

    // Calculate compression ratio
    const originalSize = imageFile.size;
    const compressedSize = base64.length * 0.75; // Approximate byte size
    const compressionRatio = compressedSize / originalSize;

    return {
      success: true,
      processedImage: base64,
      originalSize,
      compressedSize,
      compressionRatio,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image processing failed',
    };
  }
}

/**
 * Process multiple images for AI processing
 */
export async function processImagesForAI(
  imageFiles: File[],
  options: ImageProcessingOptions = {}
): Promise<ImageProcessingResult[]> {
  const results: ImageProcessingResult[] = [];
  
  for (const file of imageFiles) {
    const result = await processImageForAI(file, options);
    results.push(result);
  }
  
  return results;
}

/**
 * Convert image to base64 for AI processing
 */
export async function convertImageToBase64(imageFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Validate image type
 */
function isValidImageType(mimeType: string): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return validTypes.includes(mimeType);
}

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Scale down if too large
  if (width > maxWidth || height > maxHeight) {
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);

    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }

  return { width, height };
}

/**
 * Get image dimensions from file
 */
export async function getImageDimensions(imageFile: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
}

/**
 * Validate image dimensions
 */
export function validateImageDimensions(
  width: number,
  height: number,
  minWidth: number = 512,
  minHeight: number = 512
): { valid: boolean; error?: string } {
  if (width < minWidth || height < minHeight) {
    return {
      valid: false,
      error: `Image too small. Minimum dimensions are ${minWidth}x${minHeight} pixels`,
    };
  }

  return { valid: true };
}

/**
 * Compress image for storage
 */
export async function compressImageForStorage(
  imageFile: File,
  targetSizeKB: number = 500
): Promise<ImageProcessingResult> {
  const targetSizeBytes = targetSizeKB * 1024;
  
  // Start with high quality and reduce if needed
  let quality = 90;
  let result: ImageProcessingResult;

  do {
    result = await processImageForAI(imageFile, {
      quality,
      format: 'jpeg',
      maxFileSize: targetSizeBytes * 2, // Allow some buffer
    });

    if (result.success && result.compressedSize! <= targetSizeBytes) {
      break;
    }

    quality -= 10;
  } while (quality > 10);

  return result;
}
