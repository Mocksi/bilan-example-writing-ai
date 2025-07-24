import { useState } from 'react'
import type { QuickAction } from '../components/QuickActionModal'
import { 
  trackQuickActionStart, 
  trackQuickActionComplete,
  trackQuickActionAbandoned,
  trackQuickActionError 
} from '../lib/quick-action-analytics'

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
        
        // Track error
        await trackQuickActionError(actionId, actionLabel, errorMessage, inputLength)
        
        throw new Error(errorMessage)
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      // Track error if not already tracked
      if (!errorMessage.includes('Failed to process quick action')) {
        await trackQuickActionError(actionId, actionLabel, errorMessage, inputLength)
      }
      
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: errorMessage 
      }))
      throw error
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