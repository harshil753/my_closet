/**
 * Authentication middleware for API routes
 * Protects API endpoints and provides user context
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { databaseService } from '@/lib/database/supabase-client';

/**
 * Authentication middleware result
 */
export interface AuthMiddlewareResult {
  user: User | null;
  isAuthenticated: boolean;
  error?: string;
}

/**
 * Extract user from request headers
 */
export async function getAuthUser(request: NextRequest): Promise<AuthMiddlewareResult> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        user: null,
        isAuthenticated: false,
        error: 'No authorization header found',
      };
    }

    const token = authHeader.substring(7);
    
    // Verify the token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        user: null,
        isAuthenticated: false,
        error: error?.message || 'Invalid token',
      };
    }

    return {
      user,
      isAuthenticated: true,
    };
  } catch (error) {
    return {
      user: null,
      isAuthenticated: false,
      error: error instanceof Error ? error.message : 'Authentication error',
    };
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(handler: (request: NextRequest, user: User) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await getAuthUser(request);
    
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
            details: authResult.error,
          },
        },
        { status: 401 }
      );
    }

    return handler(request, authResult.user);
  };
}

/**
 * Middleware to require specific user tier
 */
export function requireTier(requiredTier: 'free' | 'premium') {
  return function(handler: (request: NextRequest, user: User) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const authResult = await getAuthUser(request);
      
      if (!authResult.isAuthenticated || !authResult.user) {
        return NextResponse.json(
          {
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Authentication required',
            },
          },
          { status: 401 }
        );
      }

      // Get user profile to check tier
      try {
        const supabase = await createSupabaseServerClient();
        const { data: profile, error } = await supabase
          .from('users')
          .select('tier')
          .eq('id', authResult.user.id)
          .single();

        if (error || !profile) {
          return NextResponse.json(
            {
              error: {
                code: 'USER_PROFILE_ERROR',
                message: 'Unable to verify user tier',
              },
            },
            { status: 500 }
          );
        }

        if (requiredTier === 'premium' && profile.tier !== 'premium') {
          return NextResponse.json(
            {
              error: {
                code: 'TIER_REQUIRED',
                message: 'Premium tier required for this operation',
                details: {
                  required: 'premium',
                  current: profile.tier,
                },
              },
            },
            { status: 403 }
          );
        }

        return handler(request, authResult.user);
      } catch (error) {
        return NextResponse.json(
          {
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Internal server error',
            },
          },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Middleware to check rate limits
 */
export function checkRateLimit(limit: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return function(handler: (request: NextRequest, user: User) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const authResult = await getAuthUser(request);
      
      if (!authResult.isAuthenticated || !authResult.user) {
        return NextResponse.json(
          {
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Authentication required',
            },
          },
          { status: 401 }
        );
      }

      const userId = authResult.user.id;
      const now = Date.now();
      const userRequests = requests.get(userId);

      if (!userRequests || now > userRequests.resetTime) {
        requests.set(userId, { count: 1, resetTime: now + windowMs });
      } else {
        userRequests.count++;
        if (userRequests.count > limit) {
          return NextResponse.json(
            {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests',
                details: {
                  limit,
                  windowMs,
                  retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
                },
              },
            },
            { status: 429 }
          );
        }
      }

      return handler(request, authResult.user);
    };
  };
}

/**
 * Middleware to check tier limits for specific operations
 */
export function checkTierLimits(limitType: 'clothing_items' | 'try_ons_per_month') {
  return function(handler: (request: NextRequest, user: User) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const authResult = await getAuthUser(request);
      
      if (!authResult.isAuthenticated || !authResult.user) {
        return NextResponse.json(
          {
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Authentication required',
            },
          },
          { status: 401 }
        );
      }

      try {
        const limitResult = await databaseService.checkTierLimits(authResult.user.id, limitType);
        
        if (!limitResult.success) {
          return NextResponse.json(
            {
              error: {
                code: 'TIER_LIMIT_CHECK_FAILED',
                message: 'Unable to check tier limits',
                details: limitResult.error,
              },
            },
            { status: 500 }
          );
        }

        if (!limitResult.data) {
          return NextResponse.json(
            {
              error: {
                code: 'TIER_LIMIT_EXCEEDED',
                message: 'Tier limit exceeded',
                details: {
                  limitType,
                  suggestion: limitType === 'clothing_items' 
                    ? 'Delete some clothing items or upgrade to premium'
                    : 'Upgrade to premium for more try-ons this month',
                },
              },
            },
            { status: 403 }
          );
        }

        return handler(request, authResult.user);
      } catch (error) {
        return NextResponse.json(
          {
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Internal server error',
            },
          },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Middleware to validate request body
 */
export function validateRequestBody<T>(validator: (body: any) => { valid: boolean; data?: T; error?: string }) {
  return function(handler: (request: NextRequest, user: User, body: T) => Promise<NextResponse>) {
    return async (request: NextRequest, user: User): Promise<NextResponse> => {
      try {
        const body = await request.json();
        const validation = validator(body);
        
        if (!validation.valid) {
          return NextResponse.json(
            {
              error: {
                code: 'INVALID_REQUEST_BODY',
                message: 'Invalid request body',
                details: validation.error,
              },
            },
            { status: 400 }
          );
        }

        return handler(request, user, validation.data!);
      } catch (error) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_JSON',
              message: 'Invalid JSON in request body',
            },
          },
          { status: 400 }
        );
      }
    };
  };
}

/**
 * Middleware to handle CORS
 */
export function handleCORS(handler: (request: NextRequest, user: User) => Promise<NextResponse>) {
  return async (request: NextRequest, user: User): Promise<NextResponse> => {
    const response = await handler(request, user);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  };
}

/**
 * Combined middleware for common API patterns
 */
export function createAPIMiddleware(options: {
  requireAuth?: boolean;
  requireTier?: 'free' | 'premium';
  checkTierLimits?: 'clothing_items' | 'try_ons_per_month';
  rateLimit?: { limit: number; windowMs: number };
  validateBody?: <T>(body: any) => { valid: boolean; data?: T; error?: string };
  handleCORS?: boolean;
}) {
  return function(handler: (request: NextRequest, user: User, body?: any) => Promise<NextResponse>) {
    let middleware = handler;

    // Apply CORS if requested
    if (options.handleCORS) {
      middleware = handleCORS(middleware);
    }

    // Apply body validation if requested
    if (options.validateBody) {
      middleware = validateRequestBody(options.validateBody)(middleware);
    }

    // Apply tier limit checking if requested
    if (options.checkTierLimits) {
      middleware = checkTierLimits(options.checkTierLimits)(middleware);
    }

    // Apply rate limiting if requested
    if (options.rateLimit) {
      middleware = checkRateLimit(options.rateLimit.limit, options.rateLimit.windowMs)(middleware);
    }

    // Apply tier requirement if requested
    if (options.requireTier) {
      middleware = requireTier(options.requireTier)(middleware);
    }

    // Apply authentication requirement if requested
    if (options.requireAuth) {
      middleware = requireAuth(middleware);
    }

    return middleware;
  };
}
