/**
 * API Helper utilities for consistent error handling and response processing
 */

/**
 * Extract error message from API response
 * Handles both string errors and error objects with message property
 */
export function getErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (!error) return fallback;
  
  // If it's already a string, return it
  if (typeof error === 'string') return error;
  
  // If it's an error object with message property
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }
  
  return fallback;
}

/**
 * Type guard for successful API response
 */
export function isSuccessResponse<T>(response: unknown): response is { success: true; data: T } {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === true
  );
}

/**
 * Type guard for error API response
 */
export function isErrorResponse(response: unknown): response is { success: false; error: unknown } {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === false
  );
}

