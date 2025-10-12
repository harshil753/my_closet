/**
 * Integration Tests for Try-On Session Creation
 *
 * Tests the complete flow of creating try-on sessions including
 * API endpoints, validation, and database interactions.
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/try-on/sessions/route';
import { createSupabaseServerClient } from '@/lib/config/supabase';
import { TierLimitChecker } from '@/lib/utils/tierLimits';
import { UsageTracker } from '@/lib/middleware/usage-tracking';

// Mock dependencies
jest.mock('@/lib/config/supabase');
jest.mock('@/lib/utils/tierLimits');
jest.mock('@/lib/middleware/usage-tracking');
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockCreateSupabaseServerClient =
  createSupabaseServerClient as jest.MockedFunction<
    typeof createSupabaseServerClient
  >;
const mockTierLimitChecker = TierLimitChecker as jest.Mocked<
  typeof TierLimitChecker
>;
const mockUsageTracker = UsageTracker as jest.Mocked<typeof UsageTracker>;

// Helper to create a properly mocked NextRequest with cookies
function createMockNextRequest(
  url: string,
  options?: RequestInit
): NextRequest {
  const request = new NextRequest(url, options) as NextRequest & {
    cookies: {
      get: jest.Mock;
      getAll: jest.Mock;
      set: jest.Mock;
      delete: jest.Mock;
    };
  };

  // Mock cookies properly
  Object.defineProperty(request, 'cookies', {
    value: {
      get: jest.fn(),
      getAll: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    },
    writable: true,
    configurable: true,
  });

  return request;
}

describe('Try-On Session API Integration', () => {
  let mockSupabase: {
    auth: {
      getUser: jest.Mock;
    };
    from: jest.Mock;
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
      })),
    };

    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

    // Mock tier limit checker
    mockTierLimitChecker.enforceTryOn = jest.fn().mockResolvedValue(undefined);
    mockTierLimitChecker.enforceConcurrentSession = jest
      .fn()
      .mockResolvedValue(undefined);

    // Mock usage tracker
    mockUsageTracker.trackTryOnStart = jest.fn().mockResolvedValue(undefined);
  });

  describe('POST /api/try-on/sessions', () => {
    it('should create a try-on session successfully', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock clothing items validation
      mockSupabase
        .from()
        .select()
        .eq()
        .in()
        .eq()
        .mockResolvedValue({
          data: [{ id: 'item-1' }, { id: 'item-2' }],
          error: null,
        });

      // Mock session creation
      mockSupabase
        .from()
        .insert()
        .select()
        .single.mockResolvedValue({
          data: {
            id: 'session-123',
            user_id: 'user-123',
            status: 'pending',
            created_at: '2024-01-01T00:00:00Z',
            metadata: {},
          },
          error: null,
        });

      // Mock session items creation
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions',
        {
          method: 'POST',
          body: JSON.stringify({
            clothing_item_ids: ['item-1', 'item-2'],
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('session-123');
      expect(mockTierLimitChecker.enforceTryOn).toHaveBeenCalledWith(
        'user-123'
      );
      expect(
        mockTierLimitChecker.enforceConcurrentSession
      ).toHaveBeenCalledWith('user-123');
      expect(mockUsageTracker.trackTryOnStart).toHaveBeenCalledWith(
        'user-123',
        'session-123'
      );
    });

    it('should reject unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions',
        {
          method: 'POST',
          body: JSON.stringify({
            clothing_item_ids: ['item-1'],
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should validate clothing item IDs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions',
        {
          method: 'POST',
          body: JSON.stringify({
            clothing_item_ids: [],
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('clothing_item_ids array is required');
    });

    it('should enforce maximum item limit', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions',
        {
          method: 'POST',
          body: JSON.stringify({
            clothing_item_ids: [
              'item-1',
              'item-2',
              'item-3',
              'item-4',
              'item-5',
              'item-6',
            ],
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('A maximum of 5 clothing items can be selected');
    });

    it('should enforce tier limits', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockTierLimitChecker.enforceTryOn.mockRejectedValue(
        new Error('Monthly try-ons limit reached')
      );

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions',
        {
          method: 'POST',
          body: JSON.stringify({
            clothing_item_ids: ['item-1'],
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(402);
      expect(data.success).toBe(false);
    });

    it('should validate clothing items belong to user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock clothing items validation - only one item belongs to user
      mockSupabase
        .from()
        .select()
        .eq()
        .in()
        .eq()
        .mockResolvedValue({
          data: [{ id: 'item-1' }],
          error: null,
        });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions',
        {
          method: 'POST',
          body: JSON.stringify({
            clothing_item_ids: ['item-1', 'item-2'],
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Some clothing items are invalid or inactive');
    });

    it('should handle database errors during session creation', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase
        .from()
        .select()
        .eq()
        .in()
        .eq()
        .mockResolvedValue({
          data: [{ id: 'item-1' }],
          error: null,
        });

      // Mock session creation failure
      mockSupabase
        .from()
        .insert()
        .select()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions',
        {
          method: 'POST',
          body: JSON.stringify({
            clothing_item_ids: ['item-1'],
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to create session');
    });

    it('should handle database errors during session items creation', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase
        .from()
        .select()
        .eq()
        .in()
        .eq()
        .mockResolvedValue({
          data: [{ id: 'item-1' }],
          error: null,
        });

      // Mock successful session creation
      mockSupabase
        .from()
        .insert()
        .select()
        .single.mockResolvedValue({
          data: {
            id: 'session-123',
            user_id: 'user-123',
            status: 'pending',
            created_at: '2024-01-01T00:00:00Z',
            metadata: {},
          },
          error: null,
        });

      // Mock session items creation failure
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions',
        {
          method: 'POST',
          body: JSON.stringify({
            clothing_item_ids: ['item-1'],
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to link clothing items');
    });
  });

  describe('GET /api/try-on/sessions', () => {
    it('should retrieve user sessions successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSessions = [
        {
          id: 'session-1',
          user_id: 'user-123',
          status: 'completed',
          created_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-01T01:00:00Z',
          result_image_url: 'https://example.com/result.jpg',
        },
        {
          id: 'session-2',
          user_id: 'user-123',
          status: 'pending',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockSupabase.from().select().eq().order().range().mockResolvedValue({
        data: mockSessions,
        error: null,
        count: 2,
      });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });

    it('should filter sessions by status', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSessions = [
        {
          id: 'session-1',
          user_id: 'user-123',
          status: 'completed',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from().select().eq().eq().order().range().mockResolvedValue({
        data: mockSessions,
        error: null,
        count: 1,
      });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions?status=completed'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it('should handle pagination', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from().select().eq().order().range().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions?limit=10&offset=0'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.offset).toBe(0);
    });

    it('should enforce maximum limit', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions?limit=150'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Limit cannot exceed 100');
    });

    it('should reject unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle database errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .range()
        .mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: null,
        });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch sessions');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions',
        {
          method: 'POST',
          body: 'invalid json',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle missing request body', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const request = createMockNextRequest(
        'http://localhost:3000/api/try-on/sessions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
