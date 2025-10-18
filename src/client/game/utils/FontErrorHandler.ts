/**
 * FontErrorHandler - Comprehensive error handling for font loading failures
 * 
 * Requirements addressed:
 * - 5.1: Progressive font loading with immediate fallback display
 * - 5.2: Proceed with system fonts if loading exceeds timeout threshold
 * - 5.3: Maintain layout integrity regardless of font loading status
 * - 5.5: Log font loading status for debugging purposes
 */

import { FontLoadingStatus } from './FontPreloader';

export interface FontError {
  type: 'timeout' | 'network' | 'format' | 'api_unavailable' | 'unknown';
  message: string;
  timestamp: number;
  fontFamily: string;
  weight?: number;
  details?: any;
}

export interface ErrorHandlingConfig {
  enableLogging: boolean;
  enableConsoleWarnings: boolean;
  enableFallbackNotification: boolean;
  maxRetries: number;
  retryDelay: number;
}

export class FontErrorHandler {
  private static instance: FontErrorHandler | null = null;
  private config: ErrorHandlingConfig;
  private errors: FontError[] = [];
  private retryAttempts: Map<string, number> = new Map();

  constructor(config?: Partial<ErrorHandlingConfig>) {
    this.config = {
      enableLogging: true,
      enableConsoleWarnings: true,
      enableFallbackNotification: false, // Don't spam users with notifications
      maxRetries: 1, // Limited retries to prevent infinite loops
      retryDelay: 500,
      ...config
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<ErrorHandlingConfig>): FontErrorHandler {
    if (!FontErrorHandler.instance) {
      FontErrorHandler.instance = new FontErrorHandler(config);
    }
    return FontErrorHandler.instance;
  }

  /**
   * Handle font loading timeout
   */
  public handleTimeout(fontFamily: string, timeoutMs: number): FontError {
    const error: FontError = {
      type: 'timeout',
      message: `Font loading timeout after ${timeoutMs}ms`,
      timestamp: Date.now(),
      fontFamily,
      details: { timeoutMs }
    };

    this.recordError(error);
    this.logError(error, 'Font loading timed out, using fallback fonts');
    
    return error;
  }

  /**
   * Handle network-related font loading errors
   */
  public handleNetworkError(fontFamily: string, weight: number, networkError: any): FontError {
    const error: FontError = {
      type: 'network',
      message: `Network error loading font: ${networkError.message || 'Unknown network error'}`,
      timestamp: Date.now(),
      fontFamily,
      weight,
      details: networkError
    };

    this.recordError(error);
    this.logError(error, 'Network error loading font, using fallback fonts');
    
    return error;
  }

  /**
   * Handle font format or parsing errors
   */
  public handleFormatError(fontFamily: string, weight: number, formatError: any): FontError {
    const error: FontError = {
      type: 'format',
      message: `Font format error: ${formatError.message || 'Invalid font format'}`,
      timestamp: Date.now(),
      fontFamily,
      weight,
      details: formatError
    };

    this.recordError(error);
    this.logError(error, 'Font format error, using fallback fonts');
    
    return error;
  }

  /**
   * Handle Font Loading API unavailability
   */
  public handleAPIUnavailable(fontFamily: string): FontError {
    const error: FontError = {
      type: 'api_unavailable',
      message: 'Font Loading API not available in this browser',
      timestamp: Date.now(),
      fontFamily,
      details: { userAgent: navigator.userAgent }
    };

    this.recordError(error);
    this.logError(error, 'Font Loading API not available, using CSS fallback method');
    
    return error;
  }

  /**
   * Handle unknown font loading errors
   */
  public handleUnknownError(fontFamily: string, unknownError: any): FontError {
    const error: FontError = {
      type: 'unknown',
      message: `Unknown font loading error: ${unknownError.message || 'Unexpected error'}`,
      timestamp: Date.now(),
      fontFamily,
      details: unknownError
    };

    this.recordError(error);
    this.logError(error, 'Unknown font loading error, using fallback fonts');
    
    return error;
  }

  /**
   * Record error in internal log
   */
  private recordError(error: FontError): void {
    this.errors.push(error);
    
    // Keep only last 50 errors to prevent memory issues
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }

    if (this.config.enableLogging) {
      console.log('FontErrorHandler: Recorded error:', error);
    }
  }

  /**
   * Log error with appropriate level and user-friendly message
   */
  private logError(error: FontError, userMessage: string): void {
    if (!this.config.enableConsoleWarnings) {
      return;
    }

    const logLevel = this.getLogLevel(error.type);
    const logMessage = `FontErrorHandler: ${userMessage}`;
    
    switch (logLevel) {
      case 'error':
        console.error(logMessage, error);
        break;
      case 'warn':
        console.warn(logMessage, error);
        break;
      case 'info':
        console.info(logMessage, error);
        break;
      default:
        console.log(logMessage, error);
    }
  }

  /**
   * Get appropriate log level for error type
   */
  private getLogLevel(errorType: FontError['type']): 'error' | 'warn' | 'info' | 'log' {
    switch (errorType) {
      case 'format':
        return 'error'; // Format errors are serious
      case 'network':
        return 'warn'; // Network errors are concerning but recoverable
      case 'timeout':
        return 'warn'; // Timeouts are concerning but expected in slow networks
      case 'api_unavailable':
        return 'info'; // API unavailability is informational
      case 'unknown':
        return 'error'; // Unknown errors need investigation
      default:
        return 'log';
    }
  }

  /**
   * Check if retry should be attempted for a specific font
   */
  public shouldRetry(fontFamily: string, weight?: number): boolean {
    const key = weight ? `${fontFamily}-${weight}` : fontFamily;
    const attempts = this.retryAttempts.get(key) || 0;
    
    return attempts < this.config.maxRetries;
  }

  /**
   * Record retry attempt
   */
  public recordRetryAttempt(fontFamily: string, weight?: number): void {
    const key = weight ? `${fontFamily}-${weight}` : fontFamily;
    const attempts = this.retryAttempts.get(key) || 0;
    this.retryAttempts.set(key, attempts + 1);
    
    if (this.config.enableLogging) {
      console.log(`FontErrorHandler: Retry attempt ${attempts + 1} for ${key}`);
    }
  }

  /**
   * Get retry delay with exponential backoff
   */
  public getRetryDelay(fontFamily: string, weight?: number): number {
    const key = weight ? `${fontFamily}-${weight}` : fontFamily;
    const attempts = this.retryAttempts.get(key) || 0;
    
    return this.config.retryDelay * Math.pow(2, attempts);
  }

  /**
   * Generate error summary for debugging
   */
  public generateErrorSummary(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: FontError[];
    recommendations: string[];
  } {
    const errorsByType: Record<string, number> = {};
    
    this.errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });

    const recentErrors = this.errors.slice(-10); // Last 10 errors
    
    const recommendations = this.generateRecommendations(errorsByType);

    return {
      totalErrors: this.errors.length,
      errorsByType,
      recentErrors,
      recommendations
    };
  }

  /**
   * Generate recommendations based on error patterns
   */
  private generateRecommendations(errorsByType: Record<string, number>): string[] {
    const recommendations: string[] = [];

    if ((errorsByType.timeout || 0) > 0) {
      recommendations.push('Consider increasing font loading timeout for slow networks');
    }

    if ((errorsByType.network || 0) > 0) {
      recommendations.push('Check font file paths and server configuration');
    }

    if ((errorsByType.format || 0) > 0) {
      recommendations.push('Verify font file formats and integrity');
    }

    if ((errorsByType.api_unavailable || 0) > 0) {
      recommendations.push('Implement CSS-based font loading fallback for older browsers');
    }

    if (Object.keys(errorsByType).length === 0) {
      recommendations.push('No font loading errors detected');
    }

    return recommendations;
  }

  /**
   * Validate font loading status and provide guidance
   */
  public validateFontStatus(status: FontLoadingStatus): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check loading time
    if (status.loadingTime > 3000) {
      issues.push('Font loading took longer than 3 seconds');
      suggestions.push('Consider optimizing font files or increasing timeout');
    }

    // Check fallback usage
    if (status.useFallback) {
      issues.push('Using fallback fonts instead of primary font');
      suggestions.push('Check font file availability and network connectivity');
    }

    // Check failed fonts
    if (status.failedFonts.length > 0) {
      issues.push(`${status.failedFonts.length} font(s) failed to load`);
      suggestions.push('Verify font file paths and formats');
    }

    // Check if no fonts loaded at all
    if (status.loadedFonts.length === 0 && !status.useFallback) {
      issues.push('No fonts loaded and not using fallback mode');
      suggestions.push('Check font loading implementation');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Clear error history (useful for testing)
   */
  public clearErrors(): void {
    this.errors = [];
    this.retryAttempts.clear();
    
    if (this.config.enableLogging) {
      console.log('FontErrorHandler: Cleared error history');
    }
  }

  /**
   * Get all recorded errors
   */
  public getErrors(): FontError[] {
    return [...this.errors];
  }

  /**
   * Get errors by type
   */
  public getErrorsByType(type: FontError['type']): FontError[] {
    return this.errors.filter(error => error.type === type);
  }
}
