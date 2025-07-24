import { useState, useCallback, useRef, useEffect } from 'react'

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Custom hook for managing AI model status and initialization progress
 * 
 * Handles model status checking, progress tracking, and provides real-time updates
 * during model initialization. Includes automatic retry logic for model loading with
 * proper cleanup to prevent memory leaks and state updates after unmount.
 * 
 * @returns Object containing model status state and control functions
 */
export function useModelStatus() {
  const [modelProgress, setModelProgress] = useState<number>(0)
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')
  
  // Track component mount state and timeout ID for cleanup
  const isMountedRef = useRef(true)
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)

  const checkModelStatus = useCallback(async () => {
    // Only proceed if component is still mounted
    if (!isMountedRef.current) {
      return
    }

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
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        return
      }
      
      if (data.status === 'initializing') {
        setModelStatus('loading')
        setModelProgress(data.progress || 0)
        setStatusMessage(data.message || 'Loading AI model...')
        
        // Schedule next check only if component is still mounted
        if (isMountedRef.current) {
          timeoutIdRef.current = setTimeout(checkModelStatus, 1000)
        }
      } else if (data.error) {
        setModelStatus('error')
        setStatusMessage(data.error.message || 'Model initialization failed')
      } else {
        setModelStatus('ready')
        setModelProgress(100)
        setStatusMessage('AI model ready')
      }
    } catch (error) {
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        return
      }
      
      setModelStatus('error')
      setStatusMessage(`Failed to check model status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

  const resetModelStatus = useCallback(() => {
    // Clear any pending timeout
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }
    
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

  const cleanup = useCallback(() => {
    isMountedRef.current = false
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }
  }, [])

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    isMountedRef.current = true
    
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    modelProgress,
    modelStatus,
    statusMessage,
    checkModelStatus,
    resetModelStatus,
    setModelStatus: setModelStatusManually,
    cleanup // Export cleanup function for manual cleanup if needed
  }
} 