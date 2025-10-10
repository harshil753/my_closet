/**
 * Centralized logging utility with structured logging
 * Supports different log levels and formats for development and production
 */

import { env } from '../config/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error | undefined;
  userId?: string;
  requestId?: string;
  duration?: number;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  service: string;
  version: string;
}

class Logger {
  private config: LoggerConfig;
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: (env.app.logLevel as LogLevel) || 'info',
      enableConsole: env.app.debug,
      enableFile: false,
      enableRemote: false,
      service: 'my-closet',
      version: '1.0.0',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.config.level];
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseInfo = {
      timestamp: entry.timestamp,
      level: entry.level,
      service: this.config.service,
      version: this.config.version,
      message: entry.message,
    };

    const fullEntry = {
      ...baseInfo,
      ...(entry.context && { context: entry.context }),
      ...(entry.error && {
        error: {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack,
        },
      }),
      ...(entry.userId && { userId: entry.userId }),
      ...(entry.requestId && { requestId: entry.requestId }),
      ...(entry.duration && { duration: entry.duration }),
    };

    return JSON.stringify(fullEntry);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || {},
      error: error || undefined,
    };

    const formattedEntry = this.formatLogEntry(entry);

    if (this.config.enableConsole) {
      this.logToConsole(level, formattedEntry);
    }

    if (this.config.enableFile) {
      this.logToFile(formattedEntry);
    }

    if (this.config.enableRemote) {
      this.logToRemote(entry);
    }
  }

  private logToConsole(level: LogLevel, entry: string): void {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      fatal: '\x1b[35m', // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[level] || reset;

    if (level === 'error' || level === 'fatal') {
      console.error(`${color}${entry}${reset}`);
    } else {
      console.log(`${color}${entry}${reset}`);
    }
  }

  private logToFile(entry: string): void {
    // In a real implementation, you would write to a log file
    // For now, we'll just use console for file logging simulation
    console.log(`[FILE] ${entry}`);
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    try {
      // In a real implementation, you would send logs to a remote service
      // like Datadog, LogRocket, or a custom logging endpoint
      console.log(`[REMOTE] ${JSON.stringify(entry)}`);
    } catch (error) {
      console.error('Failed to send log to remote service:', error);
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('error', message, context, error);
  }

  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('fatal', message, context, error);
  }

  // Performance logging
  time(label: string): void {
    console.time(label);
  }

  timeEnd(label: string): number {
    console.timeEnd(label);
    return performance.now();
  }

  // Request logging
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: string
  ): void {
    this.info('HTTP Request', {
      method,
      url,
      statusCode,
      duration,
      userId,
    });
  }

  // Database logging
  logDatabase(
    operation: string,
    table: string,
    duration: number,
    recordCount?: number
  ): void {
    this.debug('Database Operation', {
      operation,
      table,
      duration,
      recordCount,
    });
  }

  // AI processing logging
  logAIProcessing(
    sessionId: string,
    step: string,
    duration?: number,
    metadata?: Record<string, any>
  ): void {
    this.info('AI Processing', {
      sessionId,
      step,
      duration,
      metadata,
    });
  }

  // File upload logging
  logFileUpload(
    filename: string,
    size: number,
    userId: string,
    success: boolean,
    error?: string
  ): void {
    if (success) {
      this.info('File Upload Success', {
        filename,
        size,
        userId,
      });
    } else {
      this.error('File Upload Failed', undefined, {
        filename,
        size,
        userId,
        error,
      });
    }
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Export logger class for custom instances
export { Logger };
