/**
 * Try-On Types and Models
 * TypeScript definitions for virtual try-on sessions and results
 */

/**
 * Try-on session status enumeration
 */
export type TryOnSessionStatus = 
  | 'pending'
  | 'processing' 
  | 'completed' 
  | 'failed'
  | 'cancelled'
  | 'timeout';

/**
 * Try-on session priority enumeration
 */
export type TryOnSessionPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * AI model enumeration
 */
export type AIModel = 'gemini-2.0-flash-exp' | 'gemini-1.5-pro' | 'gemini-1.5-flash';

/**
 * Try-on session metadata interface
 */
export interface TryOnSessionMetadata {
  // AI processing information
  ai_model?: AIModel;
  processing_time?: number;
  retry_count?: number;
  error_details?: {
    code: string;
    message: string;
    stack?: string;
  };
  
  // User preferences
  style_preference?: string;
  occasion?: string;
  season?: string;
  
  // Technical details
  image_quality?: 'low' | 'medium' | 'high';
  resolution?: {
    width: number;
    height: number;
  };
  file_size?: number;
  
  // Processing parameters
  temperature?: number;
  max_tokens?: number;
  safety_settings?: Record<string, any>;
  
  // Custom fields
  custom?: Record<string, any>;
}

/**
 * Try-on session interface
 */
export interface TryOnSession {
  id: string;
  user_id: string;
  status: TryOnSessionStatus;
  created_at: string;
  completed_at?: string;
  result_image_url?: string;
  processing_time?: number;
  error_message?: string;
  metadata: TryOnSessionMetadata;
  
  // Optional fields
  priority?: TryOnSessionPriority;
  expires_at?: string;
  retry_count?: number;
  max_retries?: number;
}

/**
 * Try-on session item interface
 */
export interface TryOnSessionItem {
  id: string;
  session_id: string;
  clothing_item_id: string;
  created_at: string;
  
  // Optional fields
  position?: number;
  layer?: number;
  opacity?: number;
  transform?: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
}

/**
 * Try-on session creation input
 */
export interface CreateTryOnSessionInput {
  clothing_item_ids: string[];
  user_base_photo_ids: string[];
  priority?: TryOnSessionPriority;
  metadata?: Partial<TryOnSessionMetadata>;
}

/**
 * Try-on session update input
 */
export interface UpdateTryOnSessionInput {
  status?: TryOnSessionStatus;
  result_image_url?: string;
  processing_time?: number;
  error_message?: string;
  metadata?: Partial<TryOnSessionMetadata>;
}

/**
 * Try-on session query parameters
 */
export interface TryOnSessionQuery {
  status?: TryOnSessionStatus;
  priority?: TryOnSessionPriority;
  user_id?: string;
  created_after?: string;
  created_before?: string;
  sort_by?: 'created_at' | 'completed_at' | 'processing_time';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Try-on session response
 */
export interface TryOnSessionResponse {
  sessions: TryOnSession[];
  total: number;
  has_more: boolean;
  next_offset?: number;
}

/**
 * Try-on result interface
 */
export interface TryOnResult {
  session_id: string;
  user_id: string;
  result_image_url: string;
  original_images: {
    user_base_photos: string[];
    clothing_items: string[];
  };
  processing_info: {
    model_used: AIModel;
    processing_time: number;
    confidence_score: number;
    quality_score: number;
  };
  metadata: TryOnSessionMetadata;
  created_at: string;
}

/**
 * Try-on result creation input
 */
export interface CreateTryOnResultInput {
  session_id: string;
  result_image_url: string;
  processing_info: TryOnResult['processing_info'];
  metadata?: Partial<TryOnSessionMetadata>;
}

/**
 * Try-on result query parameters
 */
export interface TryOnResultQuery {
  user_id?: string;
  created_after?: string;
  created_before?: string;
  min_confidence?: number;
  min_quality?: number;
  sort_by?: 'created_at' | 'confidence_score' | 'quality_score';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Try-on result response
 */
export interface TryOnResultResponse {
  results: TryOnResult[];
  total: number;
  has_more: boolean;
  next_offset?: number;
}

/**
 * Try-on session statistics
 */
export interface TryOnSessionStats {
  total_sessions: number;
  sessions_by_status: Record<TryOnSessionStatus, number>;
  average_processing_time: number;
  success_rate: number;
  failure_rate: number;
  most_used_model: AIModel;
  peak_processing_time: string;
  total_processing_time: number;
}

/**
 * Try-on session validation
 */
export interface TryOnSessionValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Try-on session retry configuration
 */
export interface TryOnSessionRetryConfig {
  max_retries: number;
  retry_delay: number;
  exponential_backoff: boolean;
  retry_conditions: string[];
}

/**
 * Try-on session queue item
 */
export interface TryOnSessionQueueItem {
  session_id: string;
  priority: TryOnSessionPriority;
  created_at: string;
  scheduled_at: string;
  attempts: number;
  max_attempts: number;
  next_retry_at?: string;
}

/**
 * Try-on session batch processing
 */
export interface TryOnSessionBatch {
  id: string;
  session_ids: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  total_sessions: number;
  successful_sessions: number;
  failed_sessions: number;
  metadata: Record<string, any>;
}

/**
 * Try-on session export
 */
export interface TryOnSessionExport {
  format: 'json' | 'csv' | 'xlsx';
  sessions: TryOnSession[];
  results: TryOnResult[];
  metadata: {
    export_date: string;
    total_sessions: number;
    total_results: number;
    user_id: string;
  };
}

/**
 * Type guards for try-on types
 */
export function isTryOnSessionStatus(value: string): value is TryOnSessionStatus {
  return [
    'pending', 'processing', 'completed', 'failed', 'cancelled', 'timeout'
  ].includes(value);
}

export function isTryOnSessionPriority(value: string): value is TryOnSessionPriority {
  return ['low', 'normal', 'high', 'urgent'].includes(value);
}

export function isAIModel(value: string): value is AIModel {
  return [
    'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'
  ].includes(value);
}

/**
 * Utility functions for try-on sessions
 */
export const TryOnUtils = {
  /**
   * Get status display name
   */
  getStatusDisplayName(status: TryOnSessionStatus): string {
    const displayNames: Record<TryOnSessionStatus, string> = {
      'pending': 'Pending',
      'processing': 'Processing',
      'completed': 'Completed',
      'failed': 'Failed',
      'cancelled': 'Cancelled',
      'timeout': 'Timeout'
    };
    return displayNames[status] || status;
  },

  /**
   * Get priority display name
   */
  getPriorityDisplayName(priority: TryOnSessionPriority): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  },

  /**
   * Check if session can be retried
   */
  canRetry(session: TryOnSession): boolean {
    return (
      session.status === 'failed' &&
      (session.retry_count || 0) < (session.max_retries || 3)
    );
  },

  /**
   * Calculate processing efficiency
   */
  calculateEfficiency(session: TryOnSession): number {
    if (!session.processing_time || session.status !== 'completed') {
      return 0;
    }
    
    // Efficiency based on processing time (lower is better)
    const maxExpectedTime = 60; // 60 seconds
    return Math.max(0, 1 - (session.processing_time / maxExpectedTime));
  },

  /**
   * Validate try-on session
   */
  validateTryOnSession(session: Partial<TryOnSession>): TryOnSessionValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields validation
    if (!session.user_id) {
      errors.push('User ID is required');
    }

    if (!session.status) {
      errors.push('Status is required');
    } else if (!isTryOnSessionStatus(session.status)) {
      errors.push('Invalid status');
    }

    if (!session.created_at) {
      errors.push('Created at timestamp is required');
    }

    // Status-specific validation
    if (session.status === 'completed' && !session.result_image_url) {
      errors.push('Result image URL is required for completed sessions');
    }

    if (session.status === 'failed' && !session.error_message) {
      warnings.push('Error message should be provided for failed sessions');
    }

    if (session.status === 'completed' && !session.completed_at) {
      warnings.push('Completed at timestamp should be provided for completed sessions');
    }

    // Processing time validation
    if (session.processing_time && session.processing_time < 0) {
      errors.push('Processing time must be positive');
    }

    if (session.processing_time && session.processing_time > 300) {
      warnings.push('Processing time seems unusually long');
    }

    // Suggestions
    if (!session.priority) {
      suggestions.push('Consider setting priority for better processing');
    }

    if (!session.metadata?.ai_model) {
      suggestions.push('Consider specifying AI model for processing');
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  },

  /**
   * Generate session statistics
   */
  generateSessionStats(sessions: TryOnSession[]): TryOnSessionStats {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const failedSessions = sessions.filter(s => s.status === 'failed');
    
    const sessionsByStatus = sessions.reduce((acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1;
      return acc;
    }, {} as Record<TryOnSessionStatus, number>);

    const averageProcessingTime = completedSessions.length > 0
      ? completedSessions.reduce((sum, session) => sum + (session.processing_time || 0), 0) / completedSessions.length
      : 0;

    const successRate = totalSessions > 0 ? completedSessions.length / totalSessions : 0;
    const failureRate = totalSessions > 0 ? failedSessions.length / totalSessions : 0;

    return {
      total_sessions: totalSessions,
      sessions_by_status: sessionsByStatus,
      average_processing_time: averageProcessingTime,
      success_rate: successRate,
      failure_rate: failureRate,
      most_used_model: 'gemini-2.0-flash-exp', // This would be calculated from actual data
      peak_processing_time: '14:00-16:00', // This would be calculated from actual data
      total_processing_time: completedSessions.reduce((sum, session) => sum + (session.processing_time || 0), 0)
    };
  }
};