/**
 * Image processing service wrapper
 * Integrates with Python Pillow service for server-side image processing
 */

import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

/**
 * Image processing result from Python service
 */
export interface ImageProcessingResult {
  success: boolean;
  processed_image?: string; // Base64 encoded
  original_size?: number;
  compressed_size?: number;
  compression_ratio?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  photoType?: 'front' | 'side' | 'full_body';
}

/**
 * Image processing service class
 */
export class ImageProcessingService {
  private pythonPath: string;

  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python';
  }

  /**
   * Process clothing image using Python Pillow service
   */
  async processClothingImage(
    imageBuffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<ImageProcessingResult> {
    const { quality = 85, maxWidth = 1024, maxHeight = 1024 } = options;

    try {
      const result = await this.callPythonService('process_clothing_image', {
        image_data: imageBuffer.toString('base64'),
        quality,
        max_width: maxWidth,
        max_height: maxHeight,
      });

      return this.parseResult(result);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Image processing failed',
      };
    }
  }

  /**
   * Process base photo using Python Pillow service
   */
  async processBasePhoto(
    imageBuffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<ImageProcessingResult> {
    const { quality = 90, photoType = 'front' } = options;

    try {
      const result = await this.callPythonService('process_base_photo', {
        image_data: imageBuffer.toString('base64'),
        photo_type: photoType,
        quality,
      });

      return this.parseResult(result);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Base photo processing failed',
      };
    }
  }

  /**
   * Create thumbnail using Python Pillow service
   */
  async createThumbnail(
    imageBuffer: Buffer,
    size: [number, number] = [200, 200]
  ): Promise<ImageProcessingResult> {
    try {
      const result = await this.callPythonService('create_thumbnail', {
        image_data: imageBuffer.toString('base64'),
        size,
      });

      return this.parseResult(result);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Thumbnail creation failed',
      };
    }
  }

  /**
   * Get image information using Python Pillow service
   */
  async getImageInfo(imageBuffer: Buffer): Promise<Record<string, any>> {
    try {
      const result = await this.callPythonService('get_image_info', {
        image_data: imageBuffer.toString('base64'),
      });

      return JSON.parse(result);
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : 'Failed to get image info',
      };
    }
  }

  /**
   * Call Python service with given function and parameters
   */
  private async callPythonService(
    functionName: string,
    params: Record<string, any>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const tempFile = join(tmpdir(), `image_processing_${randomUUID()}.json`);
      const inputData = JSON.stringify({ function: functionName, params });

      // Write input data to temp file
      writeFile(tempFile, inputData)
        .then(() => {
          // Spawn Python process
          const python = spawn(this.pythonPath, [
            '-c',
            `
import sys
import json
import base64
from services.image_processor import ${functionName}

# Read input
with open('${tempFile}', 'r') as f:
    data = json.load(f)

# Call function
if data['function'] == 'process_clothing_image':
    result = ${functionName}(
        base64.b64decode(data['params']['image_data']),
        data['params']['quality'],
        data['params']['max_width'],
        data['params']['max_height']
    )
elif data['function'] == 'process_base_photo':
    result = ${functionName}(
        base64.b64decode(data['params']['image_data']),
        data['params']['photo_type'],
        data['params']['quality']
    )
elif data['function'] == 'create_thumbnail':
    result = ${functionName}(
        base64.b64decode(data['params']['image_data']),
        tuple(data['params']['size'])
    )
elif data['function'] == 'get_image_info':
    result = ${functionName}(
        base64.b64decode(data['params']['image_data'])
    )

# Convert result to JSON
if hasattr(result, '__dict__'):
    result_dict = result.__dict__
else:
    result_dict = result

# Handle processed_image bytes
if 'processed_image' in result_dict and result_dict['processed_image']:
    result_dict['processed_image'] = base64.b64encode(result_dict['processed_image']).decode('utf-8')

print(json.dumps(result_dict))
            `,
          ]);

          let output = '';
          let error = '';

          python.stdout.on('data', (data) => {
            output += data.toString();
          });

          python.stderr.on('data', (data) => {
            error += data.toString();
          });

          python.on('close', (code) => {
            // Clean up temp file
            unlink(tempFile).catch(() => undefined);

            if (code !== 0) {
              reject(new Error(`Python process failed: ${error}`));
            } else {
              resolve(output.trim());
            }
          });
        })
        .catch(reject);
    });
  }

  /**
   * Parse result from Python service
   */
  private parseResult(result: string): ImageProcessingResult {
    try {
      const parsed = JSON.parse(result);

      // Convert base64 processed_image back to buffer if present
      if (parsed.processed_image) {
        parsed.processed_image = Buffer.from(parsed.processed_image, 'base64');
      }

      return parsed;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse Python service result',
      };
    }
  }
}

// Create global instance
export const imageProcessingService = new ImageProcessingService();

// Export convenience functions
export async function processClothingImage(
  imageBuffer: Buffer,
  options?: ImageProcessingOptions
): Promise<ImageProcessingResult> {
  return imageProcessingService.processClothingImage(imageBuffer, options);
}

export async function processBasePhoto(
  imageBuffer: Buffer,
  options?: ImageProcessingOptions
): Promise<ImageProcessingResult> {
  return imageProcessingService.processBasePhoto(imageBuffer, options);
}

export async function createThumbnail(
  imageBuffer: Buffer,
  size?: [number, number]
): Promise<ImageProcessingResult> {
  return imageProcessingService.createThumbnail(imageBuffer, size);
}

export async function getImageInfo(
  imageBuffer: Buffer
): Promise<Record<string, any>> {
  return imageProcessingService.getImageInfo(imageBuffer);
}
