/**
 * Comprehensive logging and monitoring system
 * Structured logging, error tracking, and performance monitoring
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  ip?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration: number;
    memory?: number;
    cpu?: number;
  };
}

/**
 * Structured logger with context and performance tracking
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log fatal error
   */
  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    if (level < this.logLevel) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Add to logs array
    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      this.outputToConsole(logEntry);
    }

    // Send to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(logEntry);
    }
  }

  /**
   * Output to console with formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const levelColors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m', // Green
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m', // Magenta
    };

    const resetColor = '\x1b[0m';
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const color = levelColors[entry.level];
    const levelName = levelNames[entry.level];

    console.log(
      `${color}[${levelName}]${resetColor} ${entry.timestamp} - ${entry.message}`
    );

    if (entry.context) {
      console.log('  Context:', entry.context);
    }

    if (entry.error) {
      console.error('  Error:', entry.error);
    }
  }

  /**
   * Send to external logging service
   */
  private async sendToExternalService(entry: LogEntry): Promise<void> {
    try {
      // Send to external service (e.g., Sentry, LogRocket, etc.)
      if (process.env.LOGGING_SERVICE_URL) {
        await fetch(process.env.LOGGING_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entry),
        });
      }
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  /**
   * Get recent logs
   */
  getLogs(limit?: number): LogEntry[] {
    return limit ? this.logs.slice(-limit) : this.logs;
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Get logs by context
   */
  getLogsByContext(context: Partial<LogContext>): LogEntry[] {
    return this.logs.filter((log) => {
      if (!log.context) return false;

      return Object.entries(context).every(
        ([key, value]) => log.context![key as keyof LogContext] === value
      );
    });
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

/**
 * Performance monitoring logger
 */
export class PerformanceLogger {
  private static instance: PerformanceLogger;
  private measurements: Map<string, number[]> = new Map();

  static getInstance(): PerformanceLogger {
    if (!PerformanceLogger.instance) {
      PerformanceLogger.instance = new PerformanceLogger();
    }
    return PerformanceLogger.instance;
  }

  /**
   * Start performance measurement
   */
  startMeasurement(name: string): void {
    performance.mark(`${name}-start`);
  }

  /**
   * End performance measurement
   */
  endMeasurement(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measure = performance.getEntriesByName(name, 'measure')[0];
    const duration = measure.duration;

    // Store measurement
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);

    // Log performance
    const logger = Logger.getInstance();
    logger.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`);

    return duration;
  }

  /**
   * Get performance statistics
   */
  getStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = measurements.length;
    const average = measurements.reduce((sum, val) => sum + val, 0) / count;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index];

    return { count, average, min, max, p95 };
  }

  /**
   * Get all performance stats
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name] of this.measurements) {
      stats[name] = this.getStats(name);
    }

    return stats;
  }

  /**
   * Clear measurements
   */
  clearMeasurements(): void {
    this.measurements.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

/**
 * Error tracking and monitoring
 */
export class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: Map<string, number> = new Map();
  private logger = Logger.getInstance();

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * Track error occurrence
   */
  trackError(error: Error, context?: LogContext): void {
    const errorKey = `${error.name}:${error.message}`;
    const count = this.errors.get(errorKey) || 0;
    this.errors.set(errorKey, count + 1);

    this.logger.error(`Error tracked: ${error.message}`, error, context);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Array<{ error: string; count: number }> {
    return Array.from(this.errors.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Clear error tracking
   */
  clearErrors(): void {
    this.errors.clear();
  }
}

/**
 * User activity monitoring
 */
export class ActivityMonitor {
  private static instance: ActivityMonitor;
  private activities: Array<{
    timestamp: string;
    userId?: string;
    action: string;
    component?: string;
    metadata?: Record<string, any>;
  }> = [];
  private logger = Logger.getInstance();

  static getInstance(): ActivityMonitor {
    if (!ActivityMonitor.instance) {
      ActivityMonitor.instance = new ActivityMonitor();
    }
    return ActivityMonitor.instance;
  }

  /**
   * Track user activity
   */
  trackActivity(
    action: string,
    userId?: string,
    component?: string,
    metadata?: Record<string, any>
  ): void {
    const activity = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      component,
      metadata,
    };

    this.activities.push(activity);

    // Keep only recent activities
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(-1000);
    }

    this.logger.info(`Activity: ${action}`, {
      userId,
      component,
      action,
      metadata,
    });
  }

  /**
   * Get user activities
   */
  getUserActivities(userId: string, limit?: number): typeof this.activities {
    const userActivities = this.activities.filter(
      (activity) => activity.userId === userId
    );

    return limit ? userActivities.slice(-limit) : userActivities;
  }

  /**
   * Get activity statistics
   */
  getActivityStats(): {
    totalActivities: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
  } {
    const uniqueUsers = new Set(
      this.activities.map((a) => a.userId).filter(Boolean)
    ).size;

    const actionCounts = new Map<string, number>();
    this.activities.forEach((activity) => {
      const count = actionCounts.get(activity.action) || 0;
      actionCounts.set(activity.action, count + 1);
    });

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalActivities: this.activities.length,
      uniqueUsers,
      topActions,
    };
  }
}

/**
 * System health monitoring
 */
export class HealthMonitor {
  private static instance: HealthMonitor;
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private logger = Logger.getInstance();

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  /**
   * Register health check
   */
  registerHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, check] of this.healthChecks) {
      try {
        const isHealthy = await check();
        results[name] = isHealthy;

        if (!isHealthy) {
          this.logger.warn(`Health check failed: ${name}`);
        }
      } catch (error) {
        results[name] = false;
        this.logger.error(`Health check error: ${name}`, error as Error);
      }
    }

    return results;
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<{
    healthy: boolean;
    checks: Record<string, boolean>;
    timestamp: string;
  }> {
    const checks = await this.runHealthChecks();
    const healthy = Object.values(checks).every((result) => result);

    return {
      healthy,
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Monitoring dashboard data
 */
export class MonitoringDashboard {
  private static instance: MonitoringDashboard;

  static getInstance(): MonitoringDashboard {
    if (!MonitoringDashboard.instance) {
      MonitoringDashboard.instance = new MonitoringDashboard();
    }
    return MonitoringDashboard.instance;
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<{
    logs: LogEntry[];
    performance: Record<string, any>;
    errors: Array<{ error: string; count: number }>;
    activities: any;
    health: any;
  }> {
    const logger = Logger.getInstance();
    const performanceLogger = PerformanceLogger.getInstance();
    const errorTracker = ErrorTracker.getInstance();
    const activityMonitor = ActivityMonitor.getInstance();
    const healthMonitor = HealthMonitor.getInstance();

    return {
      logs: logger.getLogs(100),
      performance: performanceLogger.getAllStats(),
      errors: errorTracker.getErrorStats(),
      activities: activityMonitor.getActivityStats(),
      health: await healthMonitor.getSystemStatus(),
    };
  }
}

// Export singleton instances
export const logger = Logger.getInstance();
export const performanceLogger = PerformanceLogger.getInstance();
export const errorTracker = ErrorTracker.getInstance();
export const activityMonitor = ActivityMonitor.getInstance();
export const healthMonitor = HealthMonitor.getInstance();
export const monitoringDashboard = MonitoringDashboard.getInstance();
