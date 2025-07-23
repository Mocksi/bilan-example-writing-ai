/**
 * Analytics Error Handling
 * 
 * Comprehensive error handling for analytics that ensures
 * analytics failures never break the application
 * Following Amplitude/Mixpanel patterns for graceful degradation
 */

import { env } from './env'

export interface AnalyticsError {
  type: 'network' | 'config' | 'validation' | 'timeout' | 'unknown'
  message: string
  originalError?: Error
  timestamp: number
  context?: Record<string, any>
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
}

export interface AnalyticsErrorHandler {
  onError: (error: AnalyticsError) => void
  onRetryExhausted: (error: AnalyticsError, attempts: number) => void
  onRecovery: (previousError: AnalyticsError) => void
}

/**
 * Default retry configuration (similar to Amplitude)
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
}

/**
 * Analytics error manager
 */
export class AnalyticsErrorManager {
  private retryConfig: RetryConfig
  private errorHandler?: AnalyticsErrorHandler
  private errorHistory: AnalyticsError[] = []
  private isOnline = true

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    errorHandler?: AnalyticsErrorHandler
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
    this.errorHandler = errorHandler
    this.setupOnlineDetection()
  }

  /**
   * Safely execute an analytics operation with error handling and retry
   */
  async safeExecute<T>(
    operation: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T | null> {
    let lastError: AnalyticsError | null = null

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        // Don't attempt if offline
        if (!this.isOnline && attempt === 1) {
          this.logError({
            type: 'network',
            message: 'Device is offline, skipping analytics operation',
            timestamp: Date.now(),
            context
          })
          return null
        }

        const result = await this.executeWithTimeout(operation, 10000) // 10 second timeout
        
        // If we succeed after a previous error, log recovery
        if (lastError && this.errorHandler) {
          this.errorHandler.onRecovery(lastError)
        }

        return result

      } catch (error) {
        lastError = this.createAnalyticsError(error, context)
        this.logError(lastError)

        // Don't retry on validation errors
        if (lastError.type === 'validation') {
          break
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          break
        }

        // Wait before retry with exponential backoff
        const delay = this.calculateRetryDelay(attempt)
        await this.sleep(delay)
      }
    }

    // All retries exhausted
    if (lastError && this.errorHandler) {
      this.errorHandler.onRetryExhausted(lastError, this.retryConfig.maxAttempts)
    }

    // Analytics should never throw - return null on failure
    return null
  }

  /**
   * Safely execute without throwing, for fire-and-forget operations
   */
  async fireAndForget(
    operation: () => Promise<any>,
    context: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.safeExecute(operation, context)
    } catch (error) {
      // This should never happen due to safeExecute, but just in case
      this.logError(this.createAnalyticsError(error, context))
    }
  }

  /**
   * Validate event data before sending
   */
  validateEventData(eventType: string, properties: Record<string, any>): boolean {
    try {
      // Basic validation
      if (!eventType || typeof eventType !== 'string') {
        throw new Error('Event type must be a non-empty string')
      }

      if (eventType.length > 100) {
        throw new Error('Event type too long (max 100 characters)')
      }

      if (properties && typeof properties !== 'object') {
        throw new Error('Properties must be an object')
      }

      // Check properties size
      const propertiesString = JSON.stringify(properties || {})
      if (propertiesString.length > 10000) { // 10KB limit
        throw new Error('Properties payload too large (max 10KB)')
      }

      return true

    } catch (error) {
      this.logError({
        type: 'validation',
        message: error instanceof Error ? error.message : 'Validation failed',
        originalError: error instanceof Error ? error : undefined,
        timestamp: Date.now(),
        context: { eventType, properties }
      })
      return false
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number
    errorsByType: Record<string, number>
    recentErrors: AnalyticsError[]
    isHealthy: boolean
  } {
    const recentErrors = this.errorHistory.filter(
      e => Date.now() - e.timestamp < 5 * 60 * 1000 // Last 5 minutes
    )

    const errorsByType = this.errorHistory.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      recentErrors,
      isHealthy: recentErrors.length < 5 // Healthy if less than 5 errors in 5 minutes
    }
  }

  /**
   * Clear error history (for privacy/cleanup)
   */
  clearErrorHistory(): void {
    this.errorHistory = []
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      )
    ])
  }

  /**
   * Create standardized analytics error
   */
  private createAnalyticsError(
    error: unknown,
    context: Record<string, any> = {}
  ): AnalyticsError {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    let errorType: AnalyticsError['type'] = 'unknown'
    
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      errorType = 'network'
    } else if (errorMessage.includes('timeout')) {
      errorType = 'timeout'
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      errorType = 'validation'
    } else if (errorMessage.includes('config') || errorMessage.includes('initialization')) {
      errorType = 'config'
    }

    return {
      type: errorType,
      message: errorMessage,
      originalError: error instanceof Error ? error : undefined,
      timestamp: Date.now(),
      context
    }
  }

  /**
   * Log error with optional handler callback
   */
  private logError(error: AnalyticsError): void {
    // Add to history (keep only last 100 errors)
    this.errorHistory.push(error)
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift()
    }

    // Debug logging
    if (env.DEBUG) {
      console.warn('Analytics error:', error)
    }

    // Call error handler if provided
    if (this.errorHandler) {
      try {
        this.errorHandler.onError(error)
      } catch (handlerError) {
        // Error handler itself failed - log but don't throw
        if (env.DEBUG) {
          console.error('Error handler failed:', handlerError)
        }
      }
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1)
    return Math.min(delay, this.retryConfig.maxDelay)
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Setup online/offline detection
   */
  private setupOnlineDetection(): void {
    if (typeof window === 'undefined') return

    this.isOnline = navigator.onLine

    window.addEventListener('online', () => {
      this.isOnline = true
      if (env.DEBUG) {
        console.log('Analytics: Device back online')
      }
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      if (env.DEBUG) {
        console.log('Analytics: Device went offline')
      }
    })
  }
}

/**
 * Global error manager instance
 */
export const analyticsErrorManager = new AnalyticsErrorManager()

/**
 * Higher-order function to wrap analytics operations with error handling
 */
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  operation: T,
  context?: Record<string, any>
): T => {
  return (async (...args: Parameters<T>) => {
    return analyticsErrorManager.safeExecute(
      () => operation(...args),
      { operation: operation.name, args: args.length, ...context }
    )
  }) as T
}

/**
 * Decorator for fire-and-forget analytics operations
 */
export const fireAndForget = <T extends (...args: any[]) => Promise<any>>(
  operation: T,
  context?: Record<string, any>
): ((...args: Parameters<T>) => void) => {
  return (...args: Parameters<T>) => {
    analyticsErrorManager.fireAndForget(
      () => operation(...args),
      { operation: operation.name, args: args.length, ...context }
    )
  }
}

/**
 * Circuit breaker for analytics operations
 * Temporarily disables analytics if too many failures occur
 */
export class AnalyticsCircuitBreaker {
  private failures = 0
  private lastFailure = 0
  private isOpen = false

  constructor(
    private failureThreshold = 5,
    private timeoutMs = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T | null> {
    // Check if circuit is open
    if (this.isOpen) {
      if (Date.now() - this.lastFailure < this.timeoutMs) {
        if (env.DEBUG) {
          console.warn('Analytics circuit breaker open, skipping operation')
        }
        return null
      } else {
        // Try to close circuit
        this.isOpen = false
        this.failures = 0
      }
    }

    try {
      const result = await operation()
      
      // Success - reset failure count
      if (this.failures > 0) {
        this.failures = 0
        if (env.DEBUG) {
          console.log('Analytics circuit breaker reset after success')
        }
      }

      return result

    } catch (error) {
      this.failures++
      this.lastFailure = Date.now()

      if (this.failures >= this.failureThreshold) {
        this.isOpen = true
        if (env.DEBUG) {
          console.warn(`Analytics circuit breaker opened after ${this.failures} failures`)
        }
      }

      throw error
    }
  }

  isCircuitOpen(): boolean {
    return this.isOpen
  }

  reset(): void {
    this.failures = 0
    this.isOpen = false
    this.lastFailure = 0
  }
}

/**
 * Global circuit breaker instance
 */
export const analyticsCircuitBreaker = new AnalyticsCircuitBreaker()

/**
 * Health check utilities
 */
export const checkAnalyticsHealth = (): {
  isHealthy: boolean
  errors: ReturnType<AnalyticsErrorManager['getErrorStats']>
  circuitOpen: boolean
} => {
  const errorStats = analyticsErrorManager.getErrorStats()
  const circuitOpen = analyticsCircuitBreaker.isCircuitOpen()

  return {
    isHealthy: errorStats.isHealthy && !circuitOpen,
    errors: errorStats,
    circuitOpen
  }
} 