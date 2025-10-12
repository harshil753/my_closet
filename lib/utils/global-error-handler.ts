/**
 * Global Error Handler
 * Provides centralized error handling for API routes and client-side code
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { AnalyticsService } from '@/lib/services/analytics';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
}

export class GlobalErrorHandler {
  /**
   * Handle API route errors
   */
  static handleApiError(
    error: unknown,
    context?: ErrorContext
  ): { statusCode: number; response: any } {
    // Log the error
    logger.error('API Error', error instanceof Error ? error : undefined, context);

    // Track error in analytics
    if (error instanceof Error) {
      AnalyticsService.trackError(
        error,
        context?.endpoint || 'unknown',
        context?.userId
      );
    }

    // Handle different error types
    if (error instanceof Error) {
      // Network errors
      if (
        error.message.includes('fetch') ||
        error.message.includes('network')
      ) {
        return {
          statusCode: 503,
          response: {
            success: false,
            error: 'Service temporarily unavailable',
            code: 'NETWORK_ERROR',
          },
        };
      }

      // Authentication errors
      if (
        error.message.includes('auth') ||
        error.message.includes('unauthorized')
      ) {
        return {
          statusCode: 401,
          response: {
            success: false,
            error: 'Authentication required',
            code: 'AUTH_ERROR',
          },
        };
      }

      // Validation errors
      if (
        error.message.includes('validation') ||
        error.message.includes('invalid')
      ) {
        return {
          statusCode: 400,
          response: {
            success: false,
            error: error.message,
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Rate limiting errors
      if (
        error.message.includes('rate limit') ||
        error.message.includes('too many')
      ) {
        return {
          statusCode: 429,
          response: {
            success: false,
            error: 'Too many requests',
            code: 'RATE_LIMIT_ERROR',
          },
        };
      }

      // Generic server error
      return {
        statusCode: 500,
        response: {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      };
    }

    // Unknown error
    return {
      statusCode: 500,
      response: {
        success: false,
        error: 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
      },
    };
  }

  /**
   * Handle client-side errors
   */
  static handleClientError(error: Error, context?: ErrorContext): void {
    // Log the error
    logger.error('Client Error', error, context);

    // Track error in analytics
    AnalyticsService.trackError(
      error,
      context?.endpoint || 'client',
      context?.userId
    );

    // Show user-friendly error message
    if (typeof window !== 'undefined') {
      // You can integrate with a toast notification system here
      console.error('Client Error:', error);
    }
  }

  /**
   * Create error response for API routes
   */
  static createErrorResponse(
    error: unknown,
    context?: ErrorContext
  ): NextResponse {
    const { statusCode, response } = this.handleApiError(error, context);

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Handle async function errors
   */
  static async handleAsyncError<T>(
    asyncFn: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T | null> {
    try {
      return await asyncFn();
    } catch (error) {
      this.handleClientError(error as Error, context);
      return null;
    }
  }

  /**
   * Retry mechanism for failed operations
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context?: ErrorContext
  ): Promise<T | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          logger.error(
            `Operation failed after ${maxRetries} attempts`,
            lastError,
            {
              ...context,
              attempts: maxRetries,
            }
          );

          // Track final failure
          AnalyticsService.trackError(
            lastError,
            `retry_failed_${context?.endpoint || 'unknown'}`,
            context?.userId
          );
          break;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }

    return null;
  }

  /**
   * Circuit breaker pattern for external services
   */
  static createCircuitBreaker(
    operation: () => Promise<any>,
    failureThreshold: number = 5,
    timeout: number = 60000
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return async (): Promise<any> => {
      const now = Date.now();

      // Check if circuit should be opened
      if (state === 'CLOSED' && failures >= failureThreshold) {
        state = 'OPEN';
        lastFailureTime = now;
        throw new Error('Circuit breaker is OPEN');
      }

      // Check if circuit should be half-opened
      if (state === 'OPEN' && now - lastFailureTime > timeout) {
        state = 'HALF_OPEN';
      }

      // If circuit is open, reject immediately
      if (state === 'OPEN') {
        throw new Error('Circuit breaker is OPEN');
      }

      try {
        const result = await operation();

        // Reset failures on success
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }

        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        if (state === 'HALF_OPEN') {
          state = 'OPEN';
        }

        throw error;
      }
    };
  }
}
