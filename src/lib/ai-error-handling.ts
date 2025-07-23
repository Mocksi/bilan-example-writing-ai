/**
 * AI Error Handling
 * 
 * Comprehensive error handling system for AI client operations
 * including model loading, content generation, and graceful degradation.
 */

export enum AIErrorType {
  MODEL_LOADING_FAILED = 'MODEL_LOADING_FAILED',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  GENERATION_FAILED = 'GENERATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  INSUFFICIENT_MEMORY = 'INSUFFICIENT_MEMORY',
  BROWSER_UNSUPPORTED = 'BROWSER_UNSUPPORTED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AIError {
  type: AIErrorType
  message: string
  originalError?: Error
  context?: Record<string, unknown>
  recoverable: boolean
  userMessage: string
  suggestedActions: string[]
}

export interface ErrorRecoveryStrategy {
  canRecover: boolean
  retryable: boolean
  fallbackAvailable: boolean
  maxRetries: number
  retryDelay: number
}

/**
 * AI Error Handler class
 */
export class AIErrorHandler {
  private retryAttempts = new Map<string, number>()
  private errorHistory: AIError[] = []
  private maxHistorySize = 50

  /**
   * Handle and classify AI-related errors
   */
  handleError(error: Error, context?: Record<string, unknown>): AIError {
    const aiError = this.classifyError(error, context)
    this.logError(aiError)
    return aiError
  }

  /**
   * Classify error and determine recovery strategy
   */
  private classifyError(error: Error, context?: Record<string, unknown>): AIError {
    const message = error.message.toLowerCase()
    
    // Model loading errors
    if (message.includes('model') && (message.includes('load') || message.includes('download'))) {
      return this.createError(
        AIErrorType.MODEL_LOADING_FAILED,
        'Failed to load AI model',
        error,
        context,
        true,
        'The AI model is downloading or failed to load. Please wait a moment and try again.',
        [
          'Check your internet connection',
          'Wait for model download to complete',
          'Try refreshing the page',
          'Clear browser cache if problem persists'
        ]
      )
    }

    // Model not found errors
    if (message.includes('model') && message.includes('not found')) {
      return this.createError(
        AIErrorType.MODEL_NOT_FOUND,
        'AI model not available',
        error,
        context,
        false,
        'The requested AI model is not available.',
        [
          'Try using a different model',
          'Check if the model name is correct',
          'Wait for model to become available'
        ]
      )
    }

    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return this.createError(
        AIErrorType.NETWORK_ERROR,
        'Network connection failed',
        error,
        context,
        true,
        'Unable to connect to AI services. Please check your internet connection.',
        [
          'Check your internet connection',
          'Try again in a moment',
          'Disable VPN if using one',
          'Contact support if problem persists'
        ]
      )
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return this.createError(
        AIErrorType.TIMEOUT_ERROR,
        'Request timed out',
        error,
        context,
        true,
        'The AI is taking longer than expected to respond. Please try again.',
        [
          'Try again with a shorter prompt',
          'Check your internet connection',
          'Wait a moment before retrying'
        ]
      )
    }

    // Input validation errors
    if (message.includes('invalid') || message.includes('validation')) {
      return this.createError(
        AIErrorType.INVALID_INPUT,
        'Invalid input provided',
        error,
        context,
        false,
        'The input provided is not valid for content generation.',
        [
          'Check your input for any invalid characters',
          'Try a shorter prompt',
          'Ensure all required fields are filled'
        ]
      )
    }

    // Memory errors
    if (message.includes('memory') || message.includes('out of memory')) {
      return this.createError(
        AIErrorType.INSUFFICIENT_MEMORY,
        'Insufficient memory',
        error,
        context,
        true,
        'Not enough memory to complete the operation.',
        [
          'Close other browser tabs',
          'Try a shorter prompt',
          'Restart your browser',
          'Use a device with more memory'
        ]
      )
    }

    // Browser compatibility errors
    if (message.includes('webassembly') || message.includes('wasm') || message.includes('unsupported')) {
      return this.createError(
        AIErrorType.BROWSER_UNSUPPORTED,
        'Browser not supported',
        error,
        context,
        false,
        'Your browser does not support the required features for AI processing.',
        [
          'Update your browser to the latest version',
          'Try using Chrome, Firefox, or Safari',
          'Enable WebAssembly in browser settings'
        ]
      )
    }

    // Generation-specific errors
    if (message.includes('generation') || message.includes('generate')) {
      return this.createError(
        AIErrorType.GENERATION_FAILED,
        'Content generation failed',
        error,
        context,
        true,
        'Failed to generate content. Please try again.',
        [
          'Try a different prompt',
          'Check your internet connection',
          'Wait a moment and retry'
        ]
      )
    }

    // Default unknown error
    return this.createError(
      AIErrorType.UNKNOWN_ERROR,
      'An unexpected error occurred',
      error,
      context,
      true,
      'Something went wrong. Please try again.',
      [
        'Try refreshing the page',
        'Check your internet connection',
        'Contact support if problem persists'
      ]
    )
  }

  /**
   * Create a structured error object
   */
  private createError(
    type: AIErrorType,
    message: string,
    originalError: Error,
    context?: Record<string, unknown>,
    recoverable: boolean = true,
    userMessage: string = '',
    suggestedActions: string[] = []
  ): AIError {
    return {
      type,
      message,
      originalError,
      context,
      recoverable,
      userMessage: userMessage || message,
      suggestedActions
    }
  }

  /**
   * Determine recovery strategy for an error
   */
  getRecoveryStrategy(error: AIError): ErrorRecoveryStrategy {
    const strategies: Record<AIErrorType, ErrorRecoveryStrategy> = {
      [AIErrorType.MODEL_LOADING_FAILED]: {
        canRecover: true,
        retryable: true,
        fallbackAvailable: false,
        maxRetries: 3,
        retryDelay: 5000
      },
      [AIErrorType.MODEL_NOT_FOUND]: {
        canRecover: false,
        retryable: false,
        fallbackAvailable: true,
        maxRetries: 0,
        retryDelay: 0
      },
      [AIErrorType.GENERATION_FAILED]: {
        canRecover: true,
        retryable: true,
        fallbackAvailable: true,
        maxRetries: 2,
        retryDelay: 2000
      },
      [AIErrorType.NETWORK_ERROR]: {
        canRecover: true,
        retryable: true,
        fallbackAvailable: false,
        maxRetries: 3,
        retryDelay: 3000
      },
      [AIErrorType.TIMEOUT_ERROR]: {
        canRecover: true,
        retryable: true,
        fallbackAvailable: false,
        maxRetries: 2,
        retryDelay: 1000
      },
      [AIErrorType.INVALID_INPUT]: {
        canRecover: false,
        retryable: false,
        fallbackAvailable: false,
        maxRetries: 0,
        retryDelay: 0
      },
      [AIErrorType.INSUFFICIENT_MEMORY]: {
        canRecover: true,
        retryable: true,
        fallbackAvailable: true,
        maxRetries: 1,
        retryDelay: 5000
      },
      [AIErrorType.BROWSER_UNSUPPORTED]: {
        canRecover: false,
        retryable: false,
        fallbackAvailable: false,
        maxRetries: 0,
        retryDelay: 0
      },
      [AIErrorType.UNKNOWN_ERROR]: {
        canRecover: true,
        retryable: true,
        fallbackAvailable: false,
        maxRetries: 1,
        retryDelay: 2000
      }
    }

    return strategies[error.type] || strategies[AIErrorType.UNKNOWN_ERROR]
  }

  /**
   * Check if operation should be retried
   */
  shouldRetry(error: AIError, operationId: string): boolean {
    const strategy = this.getRecoveryStrategy(error)
    if (!strategy.retryable) return false

    const attempts = this.retryAttempts.get(operationId) || 0
    return attempts < strategy.maxRetries
  }

  /**
   * Record a retry attempt
   */
  recordRetryAttempt(operationId: string): void {
    const attempts = this.retryAttempts.get(operationId) || 0
    this.retryAttempts.set(operationId, attempts + 1)
  }

  /**
   * Clear retry attempts for an operation
   */
  clearRetryAttempts(operationId: string): void {
    this.retryAttempts.delete(operationId)
  }

  /**
   * Get retry delay for an error
   */
  getRetryDelay(error: AIError): number {
    const strategy = this.getRecoveryStrategy(error)
    return strategy.retryDelay
  }

  /**
   * Log error for debugging and analytics
   */
  private logError(error: AIError): void {
    // Add to error history
    this.errorHistory.unshift(error)
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.pop()
    }

    // Console logging for development
    console.error('AI Error:', {
      type: error.type,
      message: error.message,
      context: error.context,
      originalError: error.originalError
    })
  }

  /**
   * Get error history for debugging
   */
  getErrorHistory(): AIError[] {
    return [...this.errorHistory]
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = []
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<AIErrorType, number> {
    const stats: Record<AIErrorType, number> = {} as Record<AIErrorType, number>
    
    Object.values(AIErrorType).forEach(type => {
      stats[type] = 0
    })

    this.errorHistory.forEach(error => {
      stats[error.type]++
    })

    return stats
  }

  /**
   * Check if browser supports required features
   */
  checkBrowserSupport(): { supported: boolean; missing: string[] } {
    const missing: string[] = []

    // Check WebAssembly support
    if (typeof WebAssembly === 'undefined') {
      missing.push('WebAssembly')
    }

    // Check for modern JavaScript features
    if (!window.fetch) {
      missing.push('Fetch API')
    }

    if (!window.Promise) {
      missing.push('Promises')
    }

    // Check for required browser APIs
    if (!navigator.userAgent) {
      missing.push('Navigator API')
    }

    return {
      supported: missing.length === 0,
      missing
    }
  }

  /**
   * Create user-friendly error message
   */
  formatUserError(error: AIError): string {
    let message = error.userMessage

    if (error.suggestedActions.length > 0) {
      message += '\n\nSuggested actions:\n'
      message += error.suggestedActions.map(action => `• ${action}`).join('\n')
    }

    return message
  }
}

// Export a default instance
export const aiErrorHandler = new AIErrorHandler()

/**
 * Convenience function to handle errors
 */
export const handleAIError = (error: Error, context?: Record<string, unknown>): AIError =>
  aiErrorHandler.handleError(error, context)

/**
 * Convenience function to check if should retry
 */
export const shouldRetryOperation = (error: AIError, operationId: string): boolean =>
  aiErrorHandler.shouldRetry(error, operationId)

/**
 * Convenience function to get retry delay
 */
export const getRetryDelay = (error: AIError): number =>
  aiErrorHandler.getRetryDelay(error)

/**
 * Convenience function to format user-friendly error
 */
export const formatUserError = (error: AIError): string =>
  aiErrorHandler.formatUserError(error) 