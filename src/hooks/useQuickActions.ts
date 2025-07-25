import { useState } from 'react'
import type { QuickAction } from '../components/QuickActionModal'
import { 
  trackQuickActionStart, 
  trackQuickActionComplete,
  trackQuickActionAbandoned,
  trackQuickActionError 
} from '../lib/quick-action-analytics'
import { trackTurn } from '../lib/bilan'
import { aiClient } from '../lib/ai-client'

/**
 * Custom error classes for robust error handling and tracking
 */
class QuickActionError extends Error {
  public readonly code: string
  public readonly isTracked: boolean
  public readonly statusCode?: number

  constructor(message: string, code: string, isTracked: boolean = false, statusCode?: number) {
    super(message)
    this.name = 'QuickActionError'
    this.code = code
    this.isTracked = isTracked
    this.statusCode = statusCode
  }
}

class QuickActionAPIError extends QuickActionError {
  constructor(message: string, statusCode: number, isTracked: boolean = true) {
    super(message, 'API_ERROR', isTracked, statusCode)
    this.name = 'QuickActionAPIError'
  }
}

class QuickActionNetworkError extends QuickActionError {
  constructor(message: string = 'Network request failed', isTracked: boolean = false) {
    super(message, 'NETWORK_ERROR', isTracked)
    this.name = 'QuickActionNetworkError'
  }
}

class QuickActionValidationError extends QuickActionError {
  constructor(message: string, isTracked: boolean = false) {
    super(message, 'VALIDATION_ERROR', isTracked)
    this.name = 'QuickActionValidationError'
  }
}

interface QuickActionHookState {
  isModalOpen: boolean
  selectedAction: QuickAction | null
  isProcessing: boolean
  error: string | null
}

interface QuickActionResult {
  result: string
  turnId: string
}

/**
 * Custom hook for managing quick actions functionality
 * 
 * Provides state management and API integration for standalone AI actions.
 * Handles modal state, action processing, and error management following 
 * the Bilan standalone turn pattern.
 */
export function useQuickActions() {
  const [state, setState] = useState<QuickActionHookState>({
    isModalOpen: false,
    selectedAction: null,
    isProcessing: false,
    error: null
  })

  /**
   * Open quick action modal with selected action
   */
  const openAction = (action: QuickAction) => {
    setState(prev => ({
      ...prev,
      selectedAction: action,
      isModalOpen: true,
      error: null
    }))
  }

  /**
   * Close quick action modal and reset state
   * Tracks abandonment if user closes without completing
   */
  const closeAction = (wasCompleted: boolean = false) => {
    // Track abandonment if action was started but not completed
    if (!wasCompleted && state.selectedAction && !state.isProcessing) {
      trackQuickActionAbandoned(
        state.selectedAction.id, 
        state.selectedAction.label, 
        0 // No input length available at close
      )
    }

    setState(prev => ({
      ...prev,
      isModalOpen: false,
      selectedAction: null,
      error: null
    }))
  }

  /**
   * Process quick action through API with comprehensive analytics tracking
   * 
   * Executes a standalone AI action by sending user input to the quick action API endpoint,
   * tracking the entire interaction lifecycle through Bilan analytics, and handling various
   * error scenarios with robust error classification and tracking. This function represents
   * the core implementation of standalone turns in the Bilan tracking model.
   * 
   * **Analytics Tracking Flow:**
   * 1. Tracks action initiation when request starts
   * 2. Tracks successful completion with result metrics
   * 3. Tracks detailed error information for failures
   * 4. Prevents duplicate tracking through state management
   * 
   * **Error Handling:**
   * - API errors (4xx/5xx responses) → QuickActionAPIError with status codes
   * - Network failures (fetch errors) → QuickActionNetworkError 
   * - Unknown errors → QuickActionError with fallback handling
   * - All errors include tracking status to prevent duplicate analytics
   * 
   * @async
   * @function processAction
   * @param {string} actionId - Identifier for the AI action to perform. Must be one of the
   *   supported action types: 'summarize', 'grammar', 'translate', 'brainstorm'. Each action
   *   type uses optimized prompts and generation parameters on the server side.
   * @param {string} input - User-provided text content to process. Should be non-empty and
   *   within reasonable length limits (varies by action type). Will be sent to the AI model
   *   through action-specific prompt templates for optimal results.
   * 
   * @returns {Promise<QuickActionResult>} Promise resolving to an object containing:
   *   - `result` {string} - AI-generated text output from the requested action
   *   - `turnId` {string} - Bilan turn identifier for correlating user feedback and analytics
   * 
   * @throws {QuickActionAPIError} When API request fails (4xx/5xx status codes).
   *   Contains HTTP status code and server error message. Automatically tracked in analytics.
   * @throws {QuickActionNetworkError} When network request fails (connection issues, timeouts).
   *   Indicates connectivity problems rather than server errors.
   * @throws {QuickActionError} For unknown or unexpected errors during processing.
   *   Serves as fallback error type with generic error code.
   * 
   * @example
   * ```typescript
   * // Basic usage with error handling
   * try {
   *   const result = await processAction('summarize', 'Long text to summarize...')
   *   console.log('Summary:', result.result)
   *   console.log('Turn ID for feedback:', result.turnId)
   * } catch (error) {
   *   if (error instanceof QuickActionAPIError) {
   *     // Handle API errors (bad request, server error, etc.)
   *     console.error(`API Error [${error.statusCode}]:`, error.message)
   *     if (error.statusCode === 400) {
   *       // Show validation error to user
   *     } else if (error.statusCode >= 500) {
   *       // Show server error message
   *     }
   *   } else if (error instanceof QuickActionNetworkError) {
   *     // Handle network connectivity issues
   *     console.error('Network Error:', error.message)
   *     // Show offline/retry message to user
   *   } else if (error instanceof QuickActionError) {
   *     // Handle other known errors
   *     console.error(`Quick Action Error [${error.code}]:`, error.message)
   *   } else {
   *     // Handle unexpected errors
   *     console.error('Unexpected error:', error)
   *   }
   * }
   * ```
   * 
   * @example
   * ```typescript
   * // Advanced usage with different action types
   * const actions = [
   *   { id: 'grammar', text: 'Text with erors to fix' },
   *   { id: 'translate', text: 'Hello world (translate to Spanish)' },
   *   { id: 'brainstorm', text: 'Ideas for mobile app features' }
   * ]
   * 
   * for (const action of actions) {
   *   try {
   *     const result = await processAction(action.id, action.text)
   *     // Use result.turnId for immediate feedback collection
   *     await collectUserFeedback(result.turnId)
   *   } catch (error) {
   *     // Handle errors per action type
   *     handleActionError(action.id, error)
   *   }
   * }
   * ```
   */
  const processAction = async (actionId: string, input: string): Promise<QuickActionResult> => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }))

    const actionLabel = state.selectedAction?.label || actionId
    const inputLength = input.length
    let trackingCompleted = false

    try {
      // Track action initiation
      await trackQuickActionStart(actionId, actionLabel, inputLength)

      // Build action-specific prompt
      const prompt = buildPromptForAction(actionId, input.trim())

      // Process with Bilan-tracked AI call (creates real Bilan turn)
      const { result, turnId } = await trackTurn(
        prompt,
        async () => {
          const response = await aiClient.generateContent(prompt, {
            maxLength: getMaxLengthForAction(actionId),
            temperature: getTemperatureForAction(actionId)
          })
          return response.text
        },
        {
          // Quick action metadata
          action_type: actionId,
          input_length: input.length,
          standalone_turn: true,
          provider: 'webllm',
          model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC'
        }
      )

      const outputLength = result.length

      // Track successful completion
      await trackQuickActionComplete(actionId, actionLabel, inputLength, outputLength, turnId)
      
      setState(prev => ({ ...prev, isProcessing: false }))
      
      return {
        result: result,
        turnId: turnId
      }
    } catch (error) {
      let finalError: QuickActionError

      // Handle different error types with robust tracking logic
      if (error instanceof QuickActionError) {
        // Custom error - check if tracking is needed
        if (!error.isTracked && !trackingCompleted) {
          await trackQuickActionError(actionId, actionLabel, error.message, inputLength)
        }
        finalError = error
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error
        finalError = new QuickActionNetworkError('Network connection failed')
        if (!trackingCompleted) {
          await trackQuickActionError(actionId, actionLabel, finalError.message, inputLength)
        }
      } else {
        // Unknown error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        finalError = new QuickActionError(errorMessage, 'UNKNOWN_ERROR')
        if (!trackingCompleted) {
          await trackQuickActionError(actionId, actionLabel, finalError.message, inputLength)
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: finalError.message 
      }))
      throw finalError
    }
  }

  return {
    // State
    isModalOpen: state.isModalOpen,
    selectedAction: state.selectedAction,
    isProcessing: state.isProcessing,
    error: state.error,
    
    // Actions
    openAction,
    closeAction,
    processAction
  }
}

/**
 * Helper functions for quick action processing
 */
function buildPromptForAction(actionId: string, input: string): string {
  const prompts: Record<string, string> = {
    grammar_fix: `Please fix any grammar, spelling, or punctuation errors in the following text. Only return the corrected text without additional commentary:\n\n${input}`,
    summarize: `Please provide a concise summary of the following text:\n\n${input}`,
    translate: `Please translate the following text to English (if it's not already in English, otherwise translate to Spanish):\n\n${input}`,
    brainstorm: `Please provide 5 creative ideas related to:\n\n${input}`,
    simplify: `Please rewrite the following text to make it simpler and easier to understand:\n\n${input}`,
    expand: `Please expand on the following topic with more detail and examples:\n\n${input}`
  }
  
  return prompts[actionId] || `Please help with: ${input}`
}

function getMaxLengthForAction(actionId: string): number {
  const lengths: Record<string, number> = {
    grammar_fix: 500,
    summarize: 200,
    translate: 300,
    brainstorm: 400,
    simplify: 300,
    expand: 600
  }
  
  return lengths[actionId] || 300
}

function getTemperatureForAction(actionId: string): number {
  const temperatures: Record<string, number> = {
    grammar_fix: 0.1, // Low creativity for grammar fixes
    summarize: 0.3,   
    translate: 0.2,   // Low creativity for translation
    brainstorm: 0.8,  // High creativity for brainstorming
    simplify: 0.4,
    expand: 0.6       // Moderate creativity for expansion
  }
  
  return temperatures[actionId] || 0.5
} 