'use client'

import { Badge, Group, Text, Tooltip, ActionIcon, Alert } from '@mantine/core'
import { useEffect, useState } from 'react'
import { getAIStatus } from '../lib/ai-client'

export function AIStatusIndicator() {
  const [status, setStatus] = useState({
    isInitialized: false,
    isLoading: false,
    model: 'unknown',
    error: undefined as string | undefined
  })

  useEffect(() => {
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
    
    // Check status periodically
    const interval = setInterval(checkStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    if (status.error) return 'red'
    if (status.isLoading) return 'yellow'
    if (status.isInitialized) return 'green'
    return 'gray'
  }

  const getStatusText = () => {
    if (status.error) return 'Error'
    if (status.isLoading) return 'Loading'
    if (status.isInitialized) return 'Ready'
    return 'Not Ready'
  }

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