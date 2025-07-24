import { useState } from 'react'
import type { QuickAction } from '../components/QuickActionModal'

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
   */
  const closeAction = () => {
    setState(prev => ({
      ...prev,
      isModalOpen: false,
      selectedAction: null,
      error: null
    }))
  }

  /**
   * Process quick action through API
   */
  const processAction = async (actionId: string, input: string): Promise<QuickActionResult> => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }))

    try {
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
        throw new Error(errorData.error || 'Failed to process quick action')
      }

      const data = await response.json()
      
      setState(prev => ({ ...prev, isProcessing: false }))
      
      return {
        result: data.result,
        turnId: data.turnId
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
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