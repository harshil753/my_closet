/**
 * Unit tests for AI processing service
 * Tests the AIProcessor class and its methods
 */

import {
  AIProcessor,
  VirtualTryOnRequest,
  AIFailureType,
} from '../../services/ai_processor';
import { jest } from '@jest/globals';

// Mock the image processor
jest.mock('../../services/image_processor', () => ({
  image_processor: {
    prepare_clothing_image_for_ai_bytes: jest.fn(),
    prepare_base_photo_for_ai_bytes: jest.fn(),
  },
}));

// Mock Google Generative AI
jest.mock('google.generativeai', () => ({
  configure: jest.fn(),
  GenerativeModel: jest.fn().mockImplementation(() => ({
    generate_content: jest.fn(),
  })),
}));

describe('AIProcessor', () => {
  let aiProcessor: AIProcessor;
  let mockModel: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up environment variable
    process.env.GEMINI_API_KEY = 'test-api-key';

    // Create new instance
    aiProcessor = new AIProcessor();

    // Get the mocked model
    const { GenerativeModel } = require('google.generativeai');
    mockModel = GenerativeModel.mock.results[0].value;
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  describe('Initialization', () => {
    it('should initialize with API key', () => {
      expect(aiProcessor).toBeDefined();
      expect(aiProcessor.api_key).toBe('test-api-key');
    });

    it('should throw error if API key is missing', () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => new AIProcessor()).toThrow(
        'GEMINI_API_KEY environment variable is required'
      );
    });
  });

  describe('Failure Classification', () => {
    it('should classify quota exceeded errors', () => {
      const error = new Error('quota exceeded for requests');
      const failureInfo = aiProcessor._classify_failure(error);

      expect(failureInfo.failure_type).toBe(AIFailureType.API_QUOTA_EXCEEDED);
      expect(failureInfo.retryable).toBe(true);
      expect(failureInfo.user_friendly_message).toContain('quota exceeded');
    });

    it('should classify rate limit errors', () => {
      const error = new Error('rate limit exceeded');
      const failureInfo = aiProcessor._classify_failure(error);

      expect(failureInfo.failure_type).toBe(AIFailureType.API_RATE_LIMIT);
      expect(failureInfo.retryable).toBe(true);
      expect(failureInfo.user_friendly_message).toContain('Too many requests');
    });

    it('should classify timeout errors', () => {
      const error = new Error('request timeout');
      const failureInfo = aiProcessor._classify_failure(error);

      expect(failureInfo.failure_type).toBe(AIFailureType.API_TIMEOUT);
      expect(failureInfo.retryable).toBe(true);
      expect(failureInfo.user_friendly_message).toContain('timed out');
    });

    it('should classify authentication errors', () => {
      const error = new Error('unauthorized access');
      const failureInfo = aiProcessor._classify_failure(error);

      expect(failureInfo.failure_type).toBe(AIFailureType.API_AUTHENTICATION);
      expect(failureInfo.retryable).toBe(false);
      expect(failureInfo.user_friendly_message).toContain(
        'Authentication failed'
      );
    });

    it('should classify server errors', () => {
      const error = new Error('internal server error 500');
      const failureInfo = aiProcessor._classify_failure(error);

      expect(failureInfo.failure_type).toBe(AIFailureType.API_SERVER_ERROR);
      expect(failureInfo.retryable).toBe(true);
      expect(failureInfo.user_friendly_message).toContain(
        'temporarily unavailable'
      );
    });

    it('should classify content policy violations', () => {
      const error = new Error('content policy violation');
      const failureInfo = aiProcessor._classify_failure(error);

      expect(failureInfo.failure_type).toBe(
        AIFailureType.CONTENT_POLICY_VIOLATION
      );
      expect(failureInfo.retryable).toBe(false);
      expect(failureInfo.user_friendly_message).toContain(
        'Content policy violation'
      );
    });

    it('should classify unknown errors', () => {
      const error = new Error('some random error');
      const failureInfo = aiProcessor._classify_failure(error);

      expect(failureInfo.failure_type).toBe(AIFailureType.UNKNOWN_ERROR);
      expect(failureInfo.retryable).toBe(true);
      expect(failureInfo.user_friendly_message).toContain('unexpected error');
    });
  });

  describe('Retry Logic', () => {
    it('should calculate exponential backoff delays', () => {
      const delay1 = aiProcessor._calculate_retry_delay(1);
      const delay2 = aiProcessor._calculate_retry_delay(2);
      const delay3 = aiProcessor._calculate_retry_delay(3);

      expect(delay1).toBeGreaterThan(0);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should cap delays at maximum', () => {
      const largeDelay = aiProcessor._calculate_retry_delay(10);
      expect(largeDelay).toBeLessThanOrEqual(
        aiProcessor.retry_config.max_delay
      );
    });

    it('should return 0 for first attempt', () => {
      const delay = aiProcessor._calculate_retry_delay(0);
      expect(delay).toBe(0);
    });
  });

  describe('Request Validation', () => {
    it('should validate request with valid data', () => {
      const request: VirtualTryOnRequest = {
        user_base_photos: ['base64photo1', 'base64photo2'],
        clothing_items: ['base64item1', 'base64item2'],
        session_id: 'test-session',
        user_id: 'test-user',
      };

      const result = aiProcessor._validate_request(request);
      expect(result.valid).toBe(true);
    });

    it('should reject request without user photos', () => {
      const request: VirtualTryOnRequest = {
        user_base_photos: [],
        clothing_items: ['base64item1'],
        session_id: 'test-session',
        user_id: 'test-user',
      };

      const result = aiProcessor._validate_request(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No user base photos');
    });

    it('should reject request without clothing items', () => {
      const request: VirtualTryOnRequest = {
        user_base_photos: ['base64photo1'],
        clothing_items: [],
        session_id: 'test-session',
        user_id: 'test-user',
      };

      const result = aiProcessor._validate_request(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No clothing items');
    });

    it('should reject request with too many user photos', () => {
      const request: VirtualTryOnRequest = {
        user_base_photos: ['photo1', 'photo2', 'photo3', 'photo4'],
        clothing_items: ['base64item1'],
        session_id: 'test-session',
        user_id: 'test-user',
      };

      const result = aiProcessor._validate_request(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Too many user base photos');
    });

    it('should reject request with too many clothing items', () => {
      const request: VirtualTryOnRequest = {
        user_base_photos: ['base64photo1'],
        clothing_items: ['item1', 'item2', 'item3', 'item4', 'item5', 'item6'],
        session_id: 'test-session',
        user_id: 'test-user',
      };

      const result = aiProcessor._validate_request(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Too many clothing items');
    });
  });

  describe('Image Processing Integration', () => {
    const { image_processor } = require('../../services/image_processor');

    beforeEach(() => {
      image_processor.prepare_base_photo_for_ai_bytes.mockResolvedValue({
        success: true,
        processed_image: Buffer.from('processed-base-photo'),
      });

      image_processor.prepare_clothing_image_for_ai_bytes.mockResolvedValue({
        success: true,
        processed_image: Buffer.from('processed-clothing-item'),
      });
    });

    it('should process user base photos', async () => {
      const request: VirtualTryOnRequest = {
        user_base_photos: ['base64photo1', 'base64photo2'],
        clothing_items: ['base64item1'],
        session_id: 'test-session',
        user_id: 'test-user',
      };

      await aiProcessor._prepare_images_for_ai(request);

      expect(
        image_processor.prepare_base_photo_for_ai_bytes
      ).toHaveBeenCalledTimes(2);
      expect(
        image_processor.prepare_clothing_image_for_ai_bytes
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle image processing failures', async () => {
      image_processor.prepare_base_photo_for_ai_bytes.mockResolvedValue({
        success: false,
        error: 'Processing failed',
      });

      const request: VirtualTryOnRequest = {
        user_base_photos: ['base64photo1'],
        clothing_items: ['base64item1'],
        session_id: 'test-session',
        user_id: 'test-user',
      };

      const result = await aiProcessor._prepare_images_for_ai(request);

      expect(result.user_photos).toHaveLength(0);
      expect(result.clothing_items).toHaveLength(1);
    });
  });

  describe('AI Content Generation', () => {
    it('should generate content with retry logic', async () => {
      mockModel.generate_content.mockResolvedValue({
        text: 'Generated content',
      });

      const result = await aiProcessor._generate_content_with_retry(
        'test prompt',
        'test content'
      );

      expect(result).toBe('Generated content');
      expect(mockModel.generate_content).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure with exponential backoff', async () => {
      let callCount = 0;
      mockModel.generate_content.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('rate limit exceeded');
        }
        return { text: 'Generated content' };
      });

      const result = await aiProcessor._generate_content_with_retry(
        'test prompt',
        'test content'
      );

      expect(result).toBe('Generated content');
      expect(mockModel.generate_content).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      mockModel.generate_content.mockRejectedValue(
        new Error('rate limit exceeded')
      );

      await expect(
        aiProcessor._generate_content_with_retry('test prompt', 'test content')
      ).rejects.toThrow('Too many requests');
    });

    it('should not retry non-retryable errors', async () => {
      mockModel.generate_content.mockRejectedValue(
        new Error('unauthorized access')
      );

      await expect(
        aiProcessor._generate_content_with_retry('test prompt', 'test content')
      ).rejects.toThrow('Authentication failed');

      expect(mockModel.generate_content).toHaveBeenCalledTimes(1);
    });
  });

  describe('Clothing Detection', () => {
    it('should detect clothing with valid response', async () => {
      mockModel.generate_content.mockResolvedValue({
        text: '{"is_clothing": true, "category": "shirt", "quality": "good", "suitable": true, "confidence": 0.9}',
      });

      const result = await aiProcessor.detect_clothing(
        Buffer.from('test image')
      );

      expect(result.is_clothing).toBe(true);
      expect(result.category).toBe('shirt');
      expect(result.quality).toBe('good');
      expect(result.suitable).toBe(true);
      expect(result.confidence).toBe(0.9);
    });

    it('should handle invalid JSON response', async () => {
      mockModel.generate_content.mockResolvedValue({
        text: 'This is not JSON',
      });

      const result = await aiProcessor.detect_clothing(
        Buffer.from('test image')
      );

      expect(result.is_clothing).toBe(false);
      expect(result.category).toBe('unknown');
      expect(result.quality).toBe('fair');
      expect(result.suitable).toBe(false);
      expect(result.confidence).toBe(0.5);
    });

    it('should handle detection errors', async () => {
      mockModel.generate_content.mockRejectedValue(new Error('API error'));

      const result = await aiProcessor.detect_clothing(
        Buffer.from('test image')
      );

      expect(result.is_clothing).toBe(false);
      expect(result.category).toBe('unknown');
      expect(result.quality).toBe('poor');
      expect(result.suitable).toBe(false);
      expect(result.confidence).toBe(0.0);
    });
  });

  describe('Virtual Try-On Processing', () => {
    const { image_processor } = require('../../services/image_processor');

    beforeEach(() => {
      image_processor.prepare_base_photo_for_ai_bytes.mockResolvedValue({
        success: true,
        processed_image: Buffer.from('processed-base-photo'),
      });

      image_processor.prepare_clothing_image_for_ai_bytes.mockResolvedValue({
        success: true,
        processed_image: Buffer.from('processed-clothing-item'),
      });
    });

    it('should process successful virtual try-on', async () => {
      mockModel.generate_content.mockResolvedValue({
        text: 'Generated virtual try-on image',
      });

      const request: VirtualTryOnRequest = {
        user_base_photos: ['base64photo1'],
        clothing_items: ['base64item1'],
        session_id: 'test-session',
        user_id: 'test-user',
      };

      const result = await aiProcessor.process_virtual_try_on(request);

      expect(result.success).toBe(true);
      expect(result.generated_image).toBeDefined();
      expect(result.processing_time).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
    });

    it('should handle processing failures with classification', async () => {
      mockModel.generate_content.mockRejectedValue(new Error('quota exceeded'));

      const request: VirtualTryOnRequest = {
        user_base_photos: ['base64photo1'],
        clothing_items: ['base64item1'],
        session_id: 'test-session',
        user_id: 'test-user',
      };

      const result = await aiProcessor.process_virtual_try_on(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('quota exceeded');
      expect(result.metadata?.failure_type).toBe(
        AIFailureType.API_QUOTA_EXCEEDED.value
      );
      expect(result.metadata?.retryable).toBe(true);
    });

    it('should handle validation failures', async () => {
      const request: VirtualTryOnRequest = {
        user_base_photos: [],
        clothing_items: ['base64item1'],
        session_id: 'test-session',
        user_id: 'test-user',
      };

      const result = await aiProcessor.process_virtual_try_on(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No user base photos');
    });
  });
});
