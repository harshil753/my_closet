/**
 * Security middleware for API routes
 * Rate limiting, authentication, and security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createSecurityMiddleware,
  createRateLimitMiddleware,
  defaultSecurityConfig,
  defaultRateLimitConfig,
} from '@/lib/security/rateLimiter';
import { logger } from '@/lib/monitoring/logger';

/**
 * Security middleware for API routes
 */
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: {
    rateLimit?: boolean;
    security?: boolean;
    auth?: boolean;
  }
) {
  const { securityMiddleware, ipBlocker, sessionManager } =
    createSecurityMiddleware(defaultSecurityConfig);

  const { rateLimiter } = createRateLimitMiddleware(defaultRateLimitConfig);

  return async (req: NextRequest): Promise<NextResponse> => {
    // Get client IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    try {

      // Check if IP is blocked
      if (ipBlocker.isBlocked(ip)) {
        logger.warn(`Blocked IP attempted access: ${ip}`, { ip, url: req.url });
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Apply rate limiting
      if (options?.rateLimit !== false) {
        if (!rateLimiter.isAllowed(req)) {
          ipBlocker.recordSuspiciousActivity(ip, 'Rate limit exceeded');
          return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429 }
          );
        }
      }

      // Validate request payload for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        try {
          const body = await req.json();
          const validation = securityMiddleware.validatePayload(body);

          if (!validation.valid) {
            ipBlocker.recordSuspiciousActivity(
              ip,
              `Invalid payload: ${validation.error}`
            );
            return NextResponse.json(
              { error: validation.error },
              { status: 400 }
            );
          }
        } catch (error) {
          logger.warn(`Invalid JSON payload from ${ip}`, { ip, error });
          return NextResponse.json(
            { error: 'Invalid request payload' },
            { status: 400 }
          );
        }
      }

      // Execute the handler
      const response = await handler(req);

      // Apply security headers
      if (options?.security !== false) {
        securityMiddleware.applySecurityHeaders(response);
      }

      // Add security headers
      response.headers.set('X-Request-ID', crypto.randomUUID());
      response.headers.set('X-Response-Time', Date.now().toString());

      return response;
    } catch (error) {
      logger.error('Security middleware error', error as Error, {
        ip,
        url: req.url,
        method: req.method,
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Authentication middleware
 */
export function withAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Check for authentication token
      const authHeader = req.headers.get('authorization');
      const sessionToken = req.cookies.get('session-token')?.value;

      if (!authHeader && !sessionToken) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Validate token (implement your token validation logic)
      const token = (authHeader || sessionToken) as string;
      const isValid = await validateToken(token);

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }

      // Add user info to request headers for downstream handlers
      const userInfo = await getUserFromToken(token);
      req.headers.set('x-user-id', userInfo.id);
      req.headers.set('x-user-email', userInfo.email);

      return await handler(req);
    } catch (error) {
      logger.error('Auth middleware error', error as Error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * File upload security middleware
 */
export function withFileUploadSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  const { securityMiddleware } = createSecurityMiddleware(
    defaultSecurityConfig
  );

  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Check if request has file upload
      const contentType = req.headers.get('content-type');
      if (!contentType?.includes('multipart/form-data')) {
        return await handler(req);
      }

      // Validate file upload
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (file) {
        const validation = securityMiddleware.validateFileUpload(file);

        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }
      }

      return await handler(req);
    } catch (error) {
      logger.error('File upload security error', error as Error);
      return NextResponse.json(
        { error: 'File upload validation failed' },
        { status: 400 }
      );
    }
  };
}

/**
 * CORS middleware
 */
export function withCORS(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const response = await handler(req);

    // Add CORS headers to response
    response.headers.set(
      'Access-Control-Allow-Origin',
      process.env.ALLOWED_ORIGINS || '*'
    );
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );

    return response;
  };
}

/**
 * Request logging middleware
 */
export function withLogging(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    // Add request ID to headers
    req.headers.set('x-request-id', requestId);

    logger.info('API request started', {
      requestId,
      method: req.method,
      url: req.url,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent'),
    });

    try {
      const response = await handler(req);
      const duration = Date.now() - startTime;

      logger.info('API request completed', {
        requestId,
        method: req.method,
        url: req.url,
        status: response.status,
        duration,
      });

      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-Response-Time', duration.toString());

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('API request failed', error as Error, {
        requestId,
        method: req.method,
        url: req.url,
        duration,
      });

      return NextResponse.json(
        { error: 'Internal server error', requestId },
        { status: 500 }
      );
    }
  };
}

/**
 * Combined security middleware
 */
export function withFullSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: {
    rateLimit?: boolean;
    auth?: boolean;
    fileUpload?: boolean;
    cors?: boolean;
    logging?: boolean;
  }
) {
  let middleware = handler;

  // Apply middleware in order
  if (options?.logging !== false) {
    middleware = withLogging(middleware);
  }

  if (options?.cors !== false) {
    middleware = withCORS(middleware);
  }

  if (options?.fileUpload !== false) {
    middleware = withFileUploadSecurity(middleware);
  }

  if (options?.auth !== false) {
    middleware = withAuth(middleware);
  }

  if (options?.rateLimit !== false) {
    middleware = withSecurity(middleware, { rateLimit: true, security: true });
  }

  return middleware;
}

// Helper functions (implement based on your auth system)
async function validateToken(token: string): Promise<boolean> {
  // Implement token validation logic
  // This is a placeholder - implement based on your auth system
  return token.length > 0;
}

async function getUserFromToken(
  token: string
): Promise<{ id: string; email: string }> {
  // Implement user extraction from token
  // This is a placeholder - implement based on your auth system
  return { id: 'user-id', email: 'user@example.com' };
}
