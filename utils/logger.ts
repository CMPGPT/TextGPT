import { supabaseAdmin } from '@/lib/supabase';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Interface for log entry
interface LogEntry {
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Enhanced logger that logs to console and Supabase database
 */
class Logger {
  private context: string;
  private enabled: boolean;
  private dbLoggingEnabled: boolean;

  constructor(context: string) {
    this.context = context;
    this.enabled = process.env.NODE_ENV !== 'test';
    this.dbLoggingEnabled = process.env.ENABLE_DB_LOGGING === 'true';
  }

  /**
   * Log a message with specific level
   */
  private async log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    if (!this.enabled) return;

    // Add timestamp and format for console
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}][${level.toUpperCase()}][${this.context}] ${message}`;
    
    // Log to console based on level
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, metadata || '');
        break;
      case 'info':
        console.info(formattedMessage, metadata || '');
        break;
      case 'warn':
        console.warn(formattedMessage, metadata || '');
        break;
      case 'error':
      case 'fatal':
        console.error(formattedMessage, metadata || '');
        break;
    }

    // Only log to database if enabled and for important messages
    if (this.dbLoggingEnabled && ['info', 'warn', 'error', 'fatal'].includes(level)) {
      try {
        // Include context in the metadata
        const enrichedMetadata = {
          ...metadata,
          context: this.context,
          environment: process.env.NODE_ENV || 'unknown',
          timestamp
        };

        // Log to Supabase
        await supabaseAdmin
          .from('logs')
          .insert({
            level,
            message,
            metadata: enrichedMetadata,
            created_at: new Date().toISOString()
          });
      } catch (error) {
        // Only log to console, don't throw to avoid breaking the application
        console.error(`[${timestamp}][ERROR][Logger] Failed to write to database:`, error);
      }
    }
  }

  // Logger methods
  debug(message: string, metadata?: Record<string, any>) {
    return this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, any>) {
    return this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    return this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, any>) {
    return this.log('error', message, metadata);
  }

  fatal(message: string, metadata?: Record<string, any>) {
    return this.log('fatal', message, metadata);
  }

  /**
   * Creates a child logger with a specific sub-context
   */
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`);
  }
}

/**
 * Get a logger instance for a specific context
 */
export function getLogger(context: string): Logger {
  return new Logger(context);
} 