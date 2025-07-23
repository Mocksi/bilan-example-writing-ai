/**
 * Simple Analytics Hook for Content Creation
 * 
 * Provides React components with basic tracking capabilities
 * for content creation workflows. Uses Bilan SDK directly.
 */

import { useCallback, useEffect, useState } from 'react'
import { initializeBilan, track, vote, getConfig, isBilanReady, startConversation } from '../lib/bilan'
import type { TurnId, UserId, ConversationId } from '../types'

export interface UseAnalyticsReturn {
  // Simple tracking functions for content creation
  trackContentEvent: (eventType: string, properties?: Record<string, any>) => Promise<void>
  trackUserVote: (turnId: TurnId, rating: 1 | -1, comment?: string) => Promise<void>
  startNewConversation: () => Promise<ConversationId>
  
  // Basic state
  isReady: boolean
  userId?: string
}

/**
 * Simple hook for content creation analytics
 * Just wraps the basic Bilan functions with React patterns
 */
export function useAnalytics(userId: UserId): UseAnalyticsReturn {
  const [isReady, setIsReady] = useState(false)

  // Initialize Bilan when hook mounts
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeBilan(userId)
        setIsReady(isBilanReady())
      } catch (error) {
        console.warn('Failed to initialize Bilan:', error)
        setIsReady(false)
      }
    }

    initialize()
  }, [userId])

  // Simple event tracking for content creation
  const trackContentEvent = useCallback(async (eventType: string, properties?: Record<string, any>) => {
    try {
      await track(eventType, properties)
    } catch (error) {
      console.warn('Failed to track event:', error)
    }
  }, [])

  // Simple vote tracking 
  const trackUserVote = useCallback(async (turnId: TurnId, rating: 1 | -1, comment?: string) => {
    try {
      await vote(turnId, rating, comment)
    } catch (error) {
      console.warn('Failed to track vote:', error)
    }
  }, [])

  // Start new conversation for content creation session
  const startNewConversation = useCallback(async (): Promise<ConversationId> => {
    try {
      const conversationId = await startConversation()
      return conversationId as ConversationId
    } catch (error) {
      console.warn('Failed to start conversation:', error)
      return 'fallback_conversation' as ConversationId
    }
  }, [])

  return {
    trackContentEvent,
    trackUserVote,
    startNewConversation,
    isReady,
    userId
  }
}

/**
 * Hook for tracking content generation workflows
 */
export function useContentTracking(userId: UserId) {
  const analytics = useAnalytics(userId)

  const trackContentGeneration = useCallback(async (contentType: string, success: boolean, properties?: Record<string, any>) => {
    await analytics.trackContentEvent('content_generated', {
      contentType,
      success,
      timestamp: Date.now(),
      ...properties
    })
  }, [analytics])

  const trackContentFeedback = useCallback(async (turnId: TurnId, accepted: boolean, comment?: string) => {
    const rating = accepted ? 1 : -1
    await analytics.trackUserVote(turnId, rating, comment)
    
    // Also track the feedback event
    await analytics.trackContentEvent('content_feedback', {
      turnId,
      accepted,
      hasComment: !!comment,
      timestamp: Date.now()
    })
  }, [analytics])

  const trackContentTypeSelection = useCallback(async (contentType: string) => {
    await analytics.trackContentEvent('content_type_selected', {
      contentType,
      timestamp: Date.now()
    })
  }, [analytics])

  return {
    ...analytics,
    trackContentGeneration,
    trackContentFeedback,
    trackContentTypeSelection
  }
} 