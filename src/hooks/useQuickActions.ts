import { useState } from 'react'
import type { QuickAction } from '../components/QuickActionModal'
import { 
  trackQuickActionStart, 
  trackQuickActionComplete,
  trackQuickActionAbandoned,
  trackQuickActionError 
} from '../lib/quick-action-analytics'

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
   */
  const processAction = async (actionId: string, input: string): Promise<QuickActionResult> => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }))

    const actionLabel = state.selectedAction?.label || actionId
    const inputLength = input.length
    let trackingCompleted = false

    try {
      // Track action initiation
      await trackQuickActionStart(actionId, actionLabel, inputLength)

      const response = await fetch('/api/ai/quick-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: actionId,
          input: input,
          userId: 'demo-user' // TODO: Use actual user ID from auth context
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to process quick action'
        
        // Track API error and mark as tracked
        await trackQuickActionError(actionId, actionLabel, errorMessage, inputLength)
        trackingCompleted = true
        
        throw new QuickActionAPIError(errorMessage, response.status, true)
      }

      const data = await response.json()
      const outputLength = data.result.length

      // Track successful completion
      await trackQuickActionComplete(actionId, actionLabel, inputLength, outputLength, data.turnId)
      
      setState(prev => ({ ...prev, isProcessing: false }))
      
      return {
        result: data.result,
        turnId: data.turnId
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