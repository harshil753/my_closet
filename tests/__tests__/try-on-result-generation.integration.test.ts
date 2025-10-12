/**
 * Integration tests for try-on result generation
 * Tests the complete flow from API request to AI processing
 */

import { NextRequest } from 'next/server';
import { POST as processTryOn } from '../../app/api/try-on/process/route';
import { createClient } from '@supabase/supabase-js';
import { jest } from '@jest/globals';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
  storage: {
    from: jest.fn(),
  },
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// Mock AI processor
jest.mock('../../services/ai_processor', () => ({
  ai_processor: {
    process_virtual_try_on: jest.fn(),
  },
}));

// Mock image processor
jest.mock('../../services/image_processor', () => ({
  image_processor: {
    prepare_base_photo_for_ai_bytes: jest.fn(),
    prepare_clothing_image_for_ai_bytes: jest.fn(),
  },
}));

describe('Try-On Result Generation Integration', () => {
  let mockUser: any;
  let mockSession: any;
  let mockClothingItems: any[];
  let mockBasePhotos: any[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock user
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      tier: 'free',
    };

    // Setup mock session
    mockSession = {
      id: 'test-session-id',
      user_id: 'test-user-id',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Setup mock clothing items
    mockClothingItems = [
      {
        id: 'item-1',
        user_id: 'test-user-id',
        category: 'shirts_tops',
        name: 'Blue Shirt',
        image_url: 'https://storage.supabase.co/items/item-1.jpg',
        is_active: true,
      },
      {
        id: 'item-2',
        user_id: 'test-user-id',
        category: 'pants_bottoms',
        name: 'Black Jeans',
        image_url: 'https://storage.supabase.co/items/item-2.jpg',
        is_active: true,
      },
    ];

    // Setup mock base photos
    mockBasePhotos = [
      {
        id: 'photo-1',
        user_id: 'test-user-id',
        image_type: 'front',
        image_url: 'https://storage.supabase.co/photos/photo-1.jpg',
        is_active: true,
      },
    ];

    // Setup Supabase mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock session query
    const mockSessionQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockSession,
        error: null,
      }),
    };

    // Mock clothing items query
    const mockClothingQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in_: jest.fn().mockReturnThis(),
      mockResolvedValue: jest.fn().mockResolvedValue({
        data: mockClothingItems,
        error: null,
      }),
    };

    // Mock base photos query
    const mockBasePhotosQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      mockResolvedValue: jest.fn().mockResolvedValue({
        data: mockBasePhotos,
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'try_on_sessions') return mockSessionQuery;
      if (table === 'clothing_items') return mockClothingQuery;
      if (table === 'user_base_photos') return mockBasePhotosQuery;
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    // Mock storage
    mockSupabase.storage.from.mockReturnValue({
      download: jest.fn().mockResolvedValue({
        data: Buffer.from('mock-image-data'),
        error: null,
      }),
      upload: jest.fn().mockResolvedValue({
        data: { path: 'generated-result.jpg' },
        error: null,
      }),
    });
  });

  describe('Successful Try-On Generation', () => {
    it('should process complete try-on request successfully', async () => {
      const { ai_processor } = require('../../services/ai_processor');

      // Mock successful AI processing
      ai_processor.process_virtual_try_on.mockResolvedValue({
        success: true,
        generated_image: 'base64-generated-image',
        processing_time: 15.5,
        metadata: {
          session_id: 'test-session-id',
          user_id: 'test-user-id',
          user_photos_count: 1,
          clothing_items_count: 2,
        },
      });

      const requestBody = {
        sessionId: 'test-session-id',
        clothingItemIds: ['item-1', 'item-2'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/try-on/process',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await processTryOn(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.result_image_url).toBeDefined();
      expect(result.processing_time).toBe(15.5);
      expect(ai_processor.process_virtual_try_on).toHaveBeenCalledWith(
        expect.objectContaining({
          user_base_photos: expect.any(Array),
          clothing_items: expect.any(Array),
          session_id: 'test-session-id',
          user_id: 'test-user-id',
        })
      );
    });

    it('should update session status to completed', async () => {
      const { ai_processor } = require('../../services/ai_processor');

      ai_processor.process_virtual_try_on.mockResolvedValue({
        success: true,
        generated_image: 'base64-generated-image',
        processing_time: 10.0,
      });

      const mockUpdate = jest.fn().mockResolvedValue({
        data: { id: 'test-session-id', status: 'completed' },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'try_on_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: mockUpdate,
          };
        }
        // Return other mocks...
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in_: jest.fn().mockReturnThis(),
          mockResolvedValue: jest.fn().mockResolvedValue({
            data: mockClothingItems,
            error: null,
          }),
        };
      });

      const requestBody = {
        sessionId: 'test-session-id',
        clothingItemIds: ['item-1'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/try-on/process',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      await processTryOn(request);

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'completed',
        completed_at: expect.any(String),
        result_image_url: expect.any(String),
        processing_time: 10,
        metadata: expect.any(Object),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle AI processing failures', async () => {
      const { ai_processor } = require('../../services/ai_processor');

      ai_processor.process_virtual_try_on.mockResolvedValue({
        success: false,
        error: 'AI service temporarily unavailable. Please try again later.',
        processing_time: 5.0,
        metadata: {
          failure_type: 'api_server_error',
          retryable: true,
          retry_after_seconds: 180,
        },
      });

      const requestBody = {
        sessionId: 'test-session-id',
        clothingItemIds: ['item-1'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/try-on/process',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      const response = await processTryOn(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI service temporarily unavailable');
      expect(result.metadata?.retryable).toBe(true);
    });

    it('should handle missing session', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'try_on_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Session not found' },
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in_: jest.fn().mockReturnThis(),
          mockResolvedValue: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      });

      const requestBody = {
        sessionId: 'nonexistent-session',
        clothingItemIds: ['item-1'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/try-on/process',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      const response = await processTryOn(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toContain('Session not found');
    });

    it('should handle missing clothing items', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'try_on_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          };
        }
        if (table === 'clothing_items') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in_: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in_: jest.fn().mockReturnThis(),
          mockResolvedValue: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      });

      const requestBody = {
        sessionId: 'test-session-id',
        clothingItemIds: ['nonexistent-item'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/try-on/process',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      const response = await processTryOn(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('No clothing items found');
    });

    it('should handle missing base photos', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'try_on_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          };
        }
        if (table === 'clothing_items') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in_: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: mockClothingItems,
              error: null,
            }),
          };
        }
        if (table === 'user_base_photos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in_: jest.fn().mockReturnThis(),
          mockResolvedValue: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      });

      const requestBody = {
        sessionId: 'test-session-id',
        clothingItemIds: ['item-1'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/try-on/process',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      const response = await processTryOn(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('No base photos found');
    });
  });

  describe('Tier Enforcement', () => {
    it('should enforce free tier limits', async () => {
      const freeUser = {
        ...mockUser,
        tier: 'free',
        tier_limits: {
          try_ons_per_month: 100,
          current_month_usage: 100,
        },
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: freeUser },
        error: null,
      });

      const requestBody = {
        sessionId: 'test-session-id',
        clothingItemIds: ['item-1'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/try-on/process',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      const response = await processTryOn(request);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.error).toContain('Monthly try-on limit exceeded');
    });

    it('should allow premium tier unlimited usage', async () => {
      const premiumUser = {
        ...mockUser,
        tier: 'premium',
        tier_limits: {
          try_ons_per_month: 1000,
          current_month_usage: 500,
        },
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: premiumUser },
        error: null,
      });

      const { ai_processor } = require('../../services/ai_processor');
      ai_processor.process_virtual_try_on.mockResolvedValue({
        success: true,
        generated_image: 'base64-generated-image',
        processing_time: 10.0,
      });

      const requestBody = {
        sessionId: 'test-session-id',
        clothingItemIds: ['item-1'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/try-on/process',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      const response = await processTryOn(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });
  });

  describe('Image Processing Integration', () => {
    it('should process images before AI generation', async () => {
      const { image_processor } = require('../../services/image_processor');
      const { ai_processor } = require('../../services/ai_processor');

      image_processor.prepare_base_photo_for_ai_bytes.mockResolvedValue({
        success: true,
        processed_image: Buffer.from('processed-base-photo'),
      });

      image_processor.prepare_clothing_image_for_ai_bytes.mockResolvedValue({
        success: true,
        processed_image: Buffer.from('processed-clothing-item'),
      });

      ai_processor.process_virtual_try_on.mockResolvedValue({
        success: true,
        generated_image: 'base64-generated-image',
        processing_time: 10.0,
      });

      const requestBody = {
        sessionId: 'test-session-id',
        clothingItemIds: ['item-1'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/try-on/process',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      await processTryOn(request);

      expect(
        image_processor.prepare_base_photo_for_ai_bytes
      ).toHaveBeenCalled();
      expect(
        image_processor.prepare_clothing_image_for_ai_bytes
      ).toHaveBeenCalled();
      expect(ai_processor.process_virtual_try_on).toHaveBeenCalled();
    });

    it('should handle image processing failures', async () => {
      const { image_processor } = require('../../services/image_processor');

      image_processor.prepare_base_photo_for_ai_bytes.mockResolvedValue({
        success: false,
        error: 'Image processing failed',
      });

      const requestBody = {
        sessionId: 'test-session-id',
        clothingItemIds: ['item-1'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/try-on/process',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      const response = await processTryOn(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toContain('Image processing failed');
    });
  });
});
