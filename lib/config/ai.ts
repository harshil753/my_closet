/**
 * AI configuration and client setup
 * Centralized AI service configuration with environment handling
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { env } from './environment';

/**
 * Gemini AI client configuration
 */
export const geminiClient = new GoogleGenerativeAI(env.gemini.apiKey);

/**
 * AI model configuration
 */
export const aiConfig = {
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
} as const;

/**
 * Virtual try-on prompt templates
 */
export const promptTemplates = {
  virtualTryOn: `
You are a professional fashion AI assistant. Your task is to generate a realistic image of a person wearing selected clothing items.

Instructions:
1. Analyze the user's base photos to understand their body type, skin tone, and facial features
2. Examine the selected clothing items to understand their style, color, and fit
3. Generate a realistic image showing the user wearing the selected clothing
4. Ensure the clothing fits naturally on the user's body
5. Maintain the user's facial features and body proportions
6. Pay attention to lighting and shadows for realism
7. Ensure the clothing appears to be properly fitted and styled

User Base Photos: {userBasePhotos}
Selected Clothing Items: {clothingItems}

Generate a high-quality, realistic image of the user wearing the selected clothing items.
  `.trim(),

  clothingDetection: `
Analyze this image and determine if it contains clothing items suitable for a virtual closet.

Instructions:
1. Identify if the image contains clothing (shirts, pants, dresses, shoes, accessories)
2. Determine the clothing category (shirts, pants, shoes, dresses, accessories)
3. Assess image quality (lighting, clarity, full item visible)
4. Check if the clothing is suitable for virtual try-on

Return a JSON response with:
- isClothing: boolean
- category: string
- quality: "good" | "fair" | "poor"
- suitable: boolean
- confidence: number (0-1)
  `.trim(),
} as const;

/**
 * AI processing limits and timeouts
 */
export const processingLimits = {
  maxProcessingTime: 60000, // 60 seconds
  maxRetries: 2,
  retryDelay: 5000, // 5 seconds
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxImagesPerRequest: 5,
} as const;

/**
 * Error messages for AI processing
 */
export const errorMessages = {
  processingTimeout:
    'AI processing timed out. Please try again with fewer items.',
  invalidImage: 'Invalid image format. Please use JPEG, PNG, or WebP.',
  processingFailed: 'Failed to generate try-on image. Please try again.',
  rateLimitExceeded: 'Too many requests. Please wait before trying again.',
  unsupportedFormat: 'Unsupported image format. Please use JPEG, PNG, or WebP.',
} as const;
