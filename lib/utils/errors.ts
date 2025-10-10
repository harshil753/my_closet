/**
 * Centralized error handling utilities
 * Provides consistent error types, handling, and user-friendly messages
 */

import { logger } from './logger';

export interface AppError extends Error {
  code: string;
  statusCode: number;
  isOperational: boolean;
  context?: Record<string, any>;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any> | undefined;
    timestamp: string;
  };
}

/**
 * Custom error classes for different error types
 */
export class ValidationError extends Error implements AppError {
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 400;
  public readonly isOperational = true;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    this.context = context || {};
    this.timestamp = new Date().toISOString();
  }
}

export class AuthenticationError extends Error implements AppError {
  public readonly code = 'AUTHENTICATION_ERROR';
  public readonly statusCode = 401;
  public readonly isOperational = true;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    message: string = 'Authentication required',
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AuthenticationError';
    this.context = context || {};
    this.timestamp = new Date().toISOString();
  }
}

export class AuthorizationError extends Error implements AppError {
  public readonly code = 'AUTHORIZATION_ERROR';
  public readonly statusCode = 403;
  public readonly isOperational = true;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    message: string = 'Insufficient permissions',
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AuthorizationError';
    this.context = context || {};
    this.timestamp = new Date().toISOString();
  }
}

export class NotFoundError extends Error implements AppError {
  public readonly code = 'NOT_FOUND';
  public readonly statusCode = 404;
  public readonly isOperational = true;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(resource: string, context?: Record<string, any>) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.context = { resource, ...context };
    this.timestamp = new Date().toISOString();
  }
}

export class ConflictError extends Error implements AppError {
  public readonly code = 'CONFLICT';
  public readonly statusCode = 409;
  public readonly isOperational = true;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'ConflictError';
    this.context = context || {};
    this.timestamp = new Date().toISOString();
  }
}

export class RateLimitError extends Error implements AppError {
  public readonly code = 'RATE_LIMIT_EXCEEDED';
  public readonly statusCode = 429;
  public readonly isOperational = true;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    message: string = 'Rate limit exceeded',
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'RateLimitError';
    this.context = context || {};
    this.timestamp = new Date().toISOString();
  }
}

export class TierLimitError extends Error implements AppError {
  public readonly code = 'TIER_LIMIT_EXCEEDED';
  public readonly statusCode = 402;
  public readonly isOperational = true;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    limit: string,
    current: number,
    max: number,
    context?: Record<string, any>
  ) {
    super(`Tier limit exceeded: ${limit} (${current}/${max})`);
    this.name = 'TierLimitError';
    this.context = { limit, current, max, ...context };
    this.timestamp = new Date().toISOString();
  }
}

export class ExternalServiceError extends Error implements AppError {
  public readonly code = 'EXTERNAL_SERVICE_ERROR';
  public readonly statusCode = 502;
  public readonly isOperational = true;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(service: string, message: string, context?: Record<string, any>) {
    super(`External service error (${service}): ${message}`);
    this.name = 'ExternalServiceError';
    this.context = { service, ...context };
    this.timestamp = new Date().toISOString();
  }
}

export class AIProcessingError extends Error implements AppError {
  public readonly code = 'AI_PROCESSING_ERROR';
  public readonly statusCode = 500;
  public readonly isOperational = true;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    sessionId: string,
    message: string,
    context?: Record<string, any>
  ) {
    super(`AI processing failed for session ${sessionId}: ${message}`);
    this.name = 'AIProcessingError';
    this.context = { sessionId, ...context };
    this.timestamp = new Date().toISOString();
  }
}

export class FileUploadError extends Error implements AppError {
  public readonly code = 'FILE_UPLOAD_ERROR';
  public readonly statusCode = 400;
  public readonly isOperational = true;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    filename: string,
    message: string,
    context?: Record<string, any>
  ) {
    super(`File upload failed for ${filename}: ${message}`);
    this.name = 'FileUploadError';
    this.context = { filename, ...context };
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  /**
   * Check if error is operational (expected) or programming error
   */
  static isOperationalError(error: Error): boolean {
    return (
      error instanceof Error &&
      'isOperational' in error &&
      (error as AppError).isOperational
    );
  }

  /**
   * Convert any error to AppError format
   */
  static toAppError(error: unknown): AppError {
    if (error instanceof Error && 'code' in error) {
      return error as AppError;
    }

    const appError = new Error('Internal server error') as AppError;
    appError.code = 'INTERNAL_ERROR';
    appError.statusCode = 500;
    appError.isOperational = false;
    appError.timestamp = new Date().toISOString();

    if (error instanceof Error) {
      appError.message = error.message;
      appError.stack = error.stack || '';
    }

    return appError;
  }

  /**
   * Create user-friendly error response
   */
  static createErrorResponse(error: AppError): ErrorResponse {
    // Log the error for debugging
    logger.error('Application Error', error, {
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
    });

    return {
      success: false,
      error: {
        code: error.code,
        message: this.getUserFriendlyMessage(error),
        details: error.context,
        timestamp: error.timestamp,
      },
    };
  }

  /**
   * Get user-friendly error message
   */
  private static getUserFriendlyMessage(error: AppError): string {
    const userMessages: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again.',
      AUTHENTICATION_ERROR: 'Please sign in to continue.',
      AUTHORIZATION_ERROR: "You don't have permission to perform this action.",
      NOT_FOUND: 'The requested resource was not found.',
      CONFLICT: 'This action conflicts with existing data.',
      RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
      TIER_LIMIT_EXCEEDED:
        "You've reached your plan limit. Consider upgrading your plan.",
      EXTERNAL_SERVICE_ERROR:
        'A service is temporarily unavailable. Please try again.',
      AI_PROCESSING_ERROR: 'AI processing failed. Please try again.',
      FILE_UPLOAD_ERROR:
        'File upload failed. Please check your file and try again.',
      INTERNAL_ERROR: 'Something went wrong. Please try again.',
    };

    return userMessages[error.code] || 'An unexpected error occurred.';
  }

  /**
   * Handle async errors in route handlers
   */
  static async handleAsyncError<T>(
    asyncFn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      return await asyncFn();
    } catch (error) {
      const appError = this.toAppError(error);
      if (context) {
        appError.context = { ...appError.context, ...context };
      }
      throw appError;
    }
  }

  /**
   * Handle errors in API routes
   */
  static handleApiError(
    error: unknown,
    requestId?: string
  ): {
    statusCode: number;
    response: ErrorResponse;
  } {
    const appError = this.toAppError(error);

    if (requestId) {
      appError.context = { ...appError.context, requestId };
    }

    return {
      statusCode: appError.statusCode,
      response: this.createErrorResponse(appError),
    };
  }
}

/**
 * Error boundary for React components
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
  errorId?: string;
}

export class ErrorBoundaryError extends Error implements AppError {
  public readonly code = 'COMPONENT_ERROR';
  public readonly statusCode = 500;
  public readonly isOperational = true;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    componentName: string,
    error: Error,
    context?: Record<string, any>
  ) {
    super(`Error in ${componentName}: ${error.message}`);
    this.name = 'ErrorBoundaryError';
    this.context = { componentName, originalError: error.message, ...context };
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught Exception', error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal('Unhandled Rejection', new Error(String(reason)), {
      promise: promise.toString(),
    });
  });

  // Handle warnings
  process.on('warning', (warning) => {
    logger.warn('Process Warning', {
      warning: warning.message,
      stack: warning.stack,
    });
  });
}
