'use client'

import { Badge, Group, Text, Tooltip, Alert } from '@mantine/core'
import { useEffect, useState } from 'react'
import { getAIStatus } from '../lib/ai-client'

/**
 * Real-time AI client status indicator component
 * 
 * Displays the current state of the AI client (WebLLM) including initialization status,
 * loading state, active model, and any error conditions. Updates automatically every 2 seconds
 * to provide users with current AI service availability information.
 * 
 * @component
 * @example
 * ```tsx
 * // Display AI status in sidebar or header
 * <AIStatusIndicator />
 * ```
 * 
 * @remarks
 * This component is essential for user experience because:
 * - Shows when AI is ready for content generation
 * - Indicates loading progress during model initialization
 * - Provides clear error messaging when AI services fail
 * - Helps users understand why content generation might be delayed
 * 
 * The component integrates with the Bilan demo by providing transparency
 * about the underlying AI infrastructure status.
 * 
 * @returns {JSX.Element} Status indicator with badge and optional error alert
 */
export function AIStatusIndicator() {
  const [status, setStatus] = useState({
    isInitialized: false,
    isLoading: false,
    model: 'unknown',
    error: undefined as string | undefined
  })

  useEffect(() => {
    /**
     * Checks the current AI client status and updates local state
     * 
     * Fetches status from the AI client and normalizes the data structure
     * to ensure consistent state management within the component.
     * 
     * @inner
     * @function checkStatus
     * @returns {void}
     */
    const checkStatus = () => {
      const aiStatus = getAIStatus()
      setStatus({
        isInitialized: aiStatus.isInitialized,
        isLoading: aiStatus.isLoading,
        model: aiStatus.model,
        error: aiStatus.error
      })
    }

    checkStatus()
    
    // Check status periodically every 2 seconds for real-time updates
    const interval = setInterval(checkStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  /**
   * Determines the appropriate badge color based on AI client status
   * 
   * Maps AI client states to Mantine color scheme for visual consistency
   * and intuitive user understanding of system status.
   * 
   * @returns {string} Mantine color name ('red' | 'yellow' | 'green' | 'gray')
   */
  const getStatusColor = () => {
    if (status.error) return 'red'
    if (status.isLoading) return 'yellow'
    if (status.isInitialized) return 'green'
    return 'gray'
  }

  /**
   * Generates concise status text for badge display
   * 
   * Provides short, user-friendly labels that fit within the badge component
   * while clearly communicating the current AI service state.
   * 
   * @returns {string} Brief status label ('Error' | 'Loading' | 'Ready' | 'Not Ready')
   */
  const getStatusText = () => {
    if (status.error) return 'Error'
    if (status.isLoading) return 'Loading'
    if (status.isInitialized) return 'Ready'
    return 'Not Ready'
  }

  /**
   * Creates detailed status description for tooltip display
   * 
   * Provides comprehensive information about the AI client state including
   * specific error messages, model information, and contextual guidance.
   * 
   * @returns {string} Detailed status description with actionable information
   */
  const getStatusDescription = () => {
    if (status.error) return `AI Error: ${status.error}`
    if (status.isLoading) return 'AI model is loading, please wait...'
    if (status.isInitialized) return `AI ready with ${status.model}`
    return 'AI not initialized'
  }

  return (
    <Group gap="xs">
      <Tooltip label={getStatusDescription()}>
        <Badge 
          color={getStatusColor()} 
          variant="light" 
          size="sm"
        >
          AI: {getStatusText()}
        </Badge>
      </Tooltip>
      
      {status.error && (
        <Alert color="red" variant="light">
          <Text size="xs">
            AI model failed to load. Please refresh the page or check your connection.
          </Text>
        </Alert>
      )}
    </Group>
  )
} 