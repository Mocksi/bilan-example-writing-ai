import { useState, useCallback } from 'react'

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Custom hook for managing AI model status and initialization progress
 * 
 * Handles model status checking, progress tracking, and provides real-time updates
 * during model initialization. Includes automatic retry logic for model loading.
 * 
 * @returns Object containing model status state and control functions
 */
export function useModelStatus() {
  const [modelProgress, setModelProgress] = useState<number>(0)
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')

  const checkModelStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/copilot-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'status check' }],
          max_tokens: 1
        })
      })

      const data = await response.json()
      
      if (data.status === 'initializing') {
        setModelStatus('loading')
        setModelProgress(data.progress || 0)
        setStatusMessage(data.message || 'Loading AI model...')
        
        // Continue checking until ready
        setTimeout(checkModelStatus, 1000)
      } else if (data.error) {
        setModelStatus('error')
        setStatusMessage(data.error.message || 'Model initialization failed')
      } else {
        setModelStatus('ready')
        setModelProgress(100)
        setStatusMessage('AI model ready')
      }
    } catch (error) {
      setModelStatus('error')
      setStatusMessage(`Failed to check model status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

  const resetModelStatus = useCallback(() => {
    setModelStatus('idle')
    setModelProgress(0)
    setStatusMessage('')
  }, [])

  const setModelStatusManually = useCallback((status: ModelStatus, message?: string) => {
    setModelStatus(status)
    if (message) {
      setStatusMessage(message)
    }
  }, [])

  return {
    modelProgress,
    modelStatus,
    statusMessage,
    checkModelStatus,
    resetModelStatus,
    setModelStatus: setModelStatusManually
  }
} 