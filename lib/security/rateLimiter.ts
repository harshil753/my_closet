/**
 * Rate limiting and security measures
 * Request throttling, IP blocking, and security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  onLimitReached?: (req: NextRequest, key: string) => void;
}

export interface SecurityConfig {
  maxFileSize: number;
  allowedFileTypes: string[];
  maxConcurrentSessions: number;
  sessionTimeout: number;
  enableCORS: boolean;
  enableCSRF: boolean;
  enableXSSProtection: boolean;
  enableContentSecurityPolicy: boolean;
}

/**
 * Rate limiter with sliding window
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is within rate limit
   */
  isAllowed(req: NextRequest): boolean {
    const key = this.getKey(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing requests for this key
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(
      (timestamp) => timestamp > windowStart
    );

    // Check if under limit
    if (validRequests.length >= this.config.maxRequests) {
      this.config.onLimitReached?.(req, key);
      logger.warn(`Rate limit exceeded for key: ${key}`, {
        key,
        requestCount: validRequests.length,
        maxRequests: this.config.maxRequests,
        windowMs: this.config.windowMs,
      });
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  /**
   * Get rate limit info for a key
   */
  getRateLimitInfo(key: string): {
    remaining: number;
    resetTime: number;
    total: number;
  } {
    const requests = this.requests.get(key) || [];
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const validRequests = requests.filter(
      (timestamp) => timestamp > windowStart
    );

    return {
      remaining: Math.max(0, this.config.maxRequests - validRequests.length),
      resetTime: windowStart + this.config.windowMs,
      total: validRequests.length,
    };
  }

  /**
   * Generate key for request
   */
  private getKey(req: NextRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }

    // Default: IP address
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    return ip;
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowMs;

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter((timestamp) => timestamp > cutoff);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

/**
 * Security middleware
 */
export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Apply security headers
   */
  applySecurityHeaders(response: NextResponse): NextResponse {
    // CORS headers
    if (this.config.enableCORS) {
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
    }

    // XSS Protection
    if (this.config.enableXSSProtection) {
      response.headers.set('X-XSS-Protection', '1; mode=block');
    }

    // Content Security Policy
    if (this.config.enableContentSecurityPolicy) {
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
      ].join('; ');

      response.headers.set('Content-Security-Policy', csp);
    }

    // Additional security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()'
    );

    return response;
  }

  /**
   * Validate file upload
   */
  validateFileUpload(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${this.config.maxFileSize / 1024 / 1024}MB`,
      };
    }

    // Check file type
    const fileType = file.type;
    if (!this.config.allowedFileTypes.includes(fileType)) {
      return {
        valid: false,
        error: `File type ${fileType} is not allowed`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate request payload
   */
  validatePayload(payload: any): { valid: boolean; error?: string } {
    // Check payload size
    const payloadSize = JSON.stringify(payload).length;
    const maxPayloadSize = 1024 * 1024; // 1MB

    if (payloadSize > maxPayloadSize) {
      return {
        valid: false,
        error: 'Payload size exceeds limit',
      };
    }

    // Check for malicious patterns
    const payloadStr = JSON.stringify(payload).toLowerCase();
    const maliciousPatterns = [
      '<script',
      'javascript:',
      'vbscript:',
      'onload=',
      'onerror=',
      'eval(',
      'function(',
    ];

    for (const pattern of maliciousPatterns) {
      if (payloadStr.includes(pattern)) {
        return {
          valid: false,
          error: 'Malicious content detected',
        };
      }
    }

    return { valid: true };
  }
}

/**
 * IP blocking system
 */
export class IPBlocker {
  private blockedIPs: Set<string> = new Set();
  private suspiciousIPs: Map<string, number> = new Map();
  private config = {
    maxSuspiciousAttempts: 5,
    blockDuration: 60 * 60 * 1000, // 1 hour
  };

  /**
   * Check if IP is blocked
   */
  isBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  /**
   * Block IP address
   */
  blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip);
    logger.warn(`IP blocked: ${ip}`, { ip, reason });
  }

  /**
   * Unblock IP address
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    logger.info(`IP unblocked: ${ip}`, { ip });
  }

  /**
   * Record suspicious activity
   */
  recordSuspiciousActivity(ip: string, reason: string): void {
    const count = this.suspiciousIPs.get(ip) || 0;
    this.suspiciousIPs.set(ip, count + 1);

    logger.warn(`Suspicious activity from IP: ${ip}`, {
      ip,
      reason,
      attemptCount: count + 1,
    });

    if (count + 1 >= this.config.maxSuspiciousAttempts) {
      this.blockIP(ip, `Too many suspicious attempts: ${reason}`);
    }
  }

  /**
   * Get blocked IPs
   */
  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  /**
   * Get suspicious IPs
   */
  getSuspiciousIPs(): Array<{ ip: string; count: number }> {
    return Array.from(this.suspiciousIPs.entries()).map(([ip, count]) => ({
      ip,
      count,
    }));
  }
}

/**
 * Session security manager
 */
export class SessionSecurityManager {
  private activeSessions: Map<
    string,
    { userId: string; lastActivity: number }
  > = new Map();
  private config = {
    maxConcurrentSessions: 3,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
  };

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.config.cleanupInterval);
  }

  /**
   * Check if user can create new session
   */
  canCreateSession(userId: string): boolean {
    const userSessions = Array.from(this.activeSessions.entries()).filter(
      ([_, session]) => session.userId === userId
    );

    return userSessions.length < this.config.maxConcurrentSessions;
  }

  /**
   * Create new session
   */
  createSession(sessionId: string, userId: string): boolean {
    if (!this.canCreateSession(userId)) {
      logger.warn(`Session limit exceeded for user: ${userId}`, { userId });
      return false;
    }

    this.activeSessions.set(sessionId, {
      userId,
      lastActivity: Date.now(),
    });

    logger.info(`Session created: ${sessionId}`, { sessionId, userId });
    return true;
  }

  /**
   * Update session activity
   */
  updateSessionActivity(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    session.lastActivity = Date.now();
    return true;
  }

  /**
   * Remove session
   */
  removeSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    logger.info(`Session removed: ${sessionId}`, { sessionId });
  }

  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > this.config.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach((sessionId) => {
      this.removeSession(sessionId);
    });

    if (expiredSessions.length > 0) {
      logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Get active sessions for user
   */
  getUserSessions(userId: string): string[] {
    return Array.from(this.activeSessions.entries())
      .filter(([_, session]) => session.userId === userId)
      .map(([sessionId, _]) => sessionId);
  }
}

/**
 * Security middleware factory
 */
export function createSecurityMiddleware(config: SecurityConfig) {
  const securityMiddleware = new SecurityMiddleware(config);
  const ipBlocker = new IPBlocker();
  const sessionManager = new SessionSecurityManager();

  return {
    securityMiddleware,
    ipBlocker,
    sessionManager,
  };
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  const rateLimiter = new RateLimiter(config);

  return {
    rateLimiter,
    middleware: (req: NextRequest) => {
      if (!rateLimiter.isAllowed(req)) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
      return null;
    },
  };
}

/**
 * Default security configuration
 */
export const defaultSecurityConfig: SecurityConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxConcurrentSessions: 3,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  enableCORS: true,
  enableCSRF: true,
  enableXSSProtection: true,
  enableContentSecurityPolicy: true,
};

/**
 * Default rate limit configuration
 */
export const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  onLimitReached: (req, key) => {
    logger.warn(`Rate limit reached for ${key}`, { key, url: req.url });
  },
};
