/**
 * Analytics Hook for Bilan Integration
 * 
 * Provides React components with simple analytics tracking capabilities
 * following standard patterns like useAmplitude or useMixpanel
 */

import { useCallback, useEffect, useState } from 'react'
import { 
  initBilan, 
  getBilan, 
  track, 
  vote, 
  identify, 
  startConversation, 
  setSessionId,
  type BilanClient,
  type BilanConfig 
} from '../lib/bilan'
import { env } from '../lib/env'
import type { 
  UserId, 
  SessionId, 
  TurnId, 
  ConversationId,
  ContentType,
  UserFeedback 
} from '../types'

export interface AnalyticsState {
  isInitialized: boolean
  isLoading: boolean
  error?: string
  userId?: UserId
  sessionId?: SessionId
  conversationId?: ConversationId
}

export interface TrackTurnResult {
  result: any
  turnId: TurnId
}

export interface UseAnalyticsReturn {
  // State
  state: AnalyticsState
  
  // Core tracking functions (fire-and-forget)
  track: (eventType: string, properties?: Record<string, any>) => Promise<void>
  vote: (turnId: TurnId, rating: 1 | -1, comment?: string) => Promise<void>
  identify: (userId: UserId) => void
  
  // Session management
  startSession: (sessionId: SessionId) => void
  startConversation: (userId?: UserId) => ConversationId
  
  // AI interaction tracking
  trackTurn: <T>(
    prompt: string,
    aiFunction: () => Promise<T>,
    metadata?: Record<string, any>
  ) => Promise<TrackTurnResult>
  
  // Journey tracking
  trackJourneyStep: (step: string, properties?: Record<string, any>) => Promise<void>
  
  // Utility
  reset: () => void
}

/**
 * Analytics hook for Bilan integration
 * Usage: const analytics = useAnalytics()
 */
export const useAnalytics = (): UseAnalyticsReturn => {
  const [state, setState] = useState<AnalyticsState>({
    isInitialized: false,
    isLoading: true,
  })

  // Initialize Bilan on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }))

        const config: BilanConfig = {
          mode: env.BILAN_MODE,
          endpoint: env.BILAN_ENDPOINT,
          debug: env.DEBUG,
        }

        await initBilan(config)
        
        const client = getBilan()
        const clientConfig = client.getConfig()

        setState({
          isInitialized: true,
          isLoading: false,
          userId: clientConfig.userId,
          error: undefined,
        })

      } catch (error) {
        setState({
          isInitialized: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Analytics initialization failed',
        })
        
        // Log but don't throw - analytics should never break the app
        console.error('Bilan initialization failed:', error)
      }
    }

    initialize()
  }, [])

  // Track event (fire-and-forget)
  const trackEvent = useCallback(async (
    eventType: string, 
    properties: Record<string, any> = {}
  ): Promise<void> => {
    try {
      await track(eventType, properties)
    } catch (error) {
      // Silently handle errors - analytics should never break the app
      if (env.DEBUG) {
        console.error('Analytics tracking failed:', error)
      }
    }
  }, [])

  // Track vote/feedback (fire-and-forget)
  const trackVote = useCallback(async (
    turnId: TurnId, 
    rating: 1 | -1, 
    comment?: string
  ): Promise<void> => {
    try {
      await vote(turnId, rating, comment)
    } catch (error) {
      if (env.DEBUG) {
        console.error('Vote tracking failed:', error)
      }
    }
  }, [])

  // Identify user
  const identifyUser = useCallback((userId: UserId): void => {
    try {
      identify(userId)
      setState(prev => ({ ...prev, userId }))
    } catch (error) {
      if (env.DEBUG) {
        console.error('User identification failed:', error)
      }
    }
  }, [])

  // Start session
  const startSession = useCallback((sessionId: SessionId): void => {
    try {
      setSessionId(sessionId)
      setState(prev => ({ ...prev, sessionId }))
      
      // Track session start
      trackEvent('session_started', { sessionId })
    } catch (error) {
      if (env.DEBUG) {
        console.error('Session start failed:', error)
      }
    }
  }, [trackEvent])

  // Start conversation
  const startConversationWrapper = useCallback((userId?: UserId): ConversationId => {
    try {
      const conversationId = startConversation(userId)
      setState(prev => ({ ...prev, conversationId }))
      return conversationId
    } catch (error) {
      if (env.DEBUG) {
        console.error('Conversation start failed:', error)
      }
      // Return a fallback ID so the app doesn't break
      return `fallback_conv_${Date.now()}` as ConversationId
    }
  }, [])

  // Track AI turn with wrapper pattern
  const trackTurn = useCallback(async <T>(
    prompt: string,
    aiFunction: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<TrackTurnResult> => {
    const turnId = `turn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}` as TurnId
    const startTime = Date.now()

    try {
      // Track turn start
      await trackEvent('turn_started', {
        turnId,
        prompt: prompt.substring(0, 200), // Truncate for analytics
        ...metadata,
        timestamp: startTime
      })

      // Execute AI function
      const result = await aiFunction()
      const endTime = Date.now()

      // Track turn completion
      await trackEvent('turn_completed', {
        turnId,
        responseTime: endTime - startTime,
        success: true,
        ...metadata,
        timestamp: endTime
      })

      return { result, turnId }

    } catch (error) {
      const endTime = Date.now()
      
      // Track turn failure
      await trackEvent('turn_failed', {
        turnId,
        responseTime: endTime - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...metadata,
        timestamp: endTime
      })

      // Re-throw the error so the app can handle it
      throw error
    }
  }, [trackEvent])

  // Track journey steps (funnel tracking)
  const trackJourneyStep = useCallback(async (
    step: string, 
    properties: Record<string, any> = {}
  ): Promise<void> => {
    await trackEvent('journey_step', {
      step,
      ...properties,
      sessionId: state.sessionId,
      conversationId: state.conversationId
    })
  }, [trackEvent, state.sessionId, state.conversationId])

  // Reset analytics state
  const reset = useCallback((): void => {
    setState(prev => ({
      ...prev,
      sessionId: undefined,
      conversationId: undefined
    }))
  }, [])

  return {
    state,
    track: trackEvent,
    vote: trackVote,
    identify: identifyUser,
    startSession,
    startConversation: startConversationWrapper,
    trackTurn,
    trackJourneyStep,
    reset,
  }
}

/**
 * Helper hook for AI content generation with automatic analytics
 */
export const useContentGeneration = () => {
  const analytics = useAnalytics()

  const generateWithTracking = useCallback(async <T>(
    contentType: ContentType,
    userBrief: string,
    aiFunction: () => Promise<T>,
    iterationNumber: number = 1
  ): Promise<TrackTurnResult> => {
    return analytics.trackTurn(
      userBrief,
      aiFunction,
      {
        contentType,
        iterationNumber,
        briefLength: userBrief.length,
        journey_id: 'content-creation-workflow'
      }
    )
  }, [analytics])

  const trackUserFeedback = useCallback(async (
    turnId: TurnId,
    feedback: UserFeedback
  ): Promise<void> => {
    // Track the vote
    if (feedback.rating) {
      await analytics.vote(turnId, feedback.rating, feedback.refinementRequest)
    }

    // Track specific feedback type
    await analytics.track('user_feedback', {
      turnId,
      feedbackType: feedback.type,
      acceptanceLevel: feedback.acceptanceLevel,
      hasRefinementRequest: !!feedback.refinementRequest,
      quickFeedbackCount: feedback.quickFeedback?.length || 0
    })

    // Track journey progression
    switch (feedback.type) {
      case 'accept':
        await analytics.trackJourneyStep('content_accepted')
        break
      case 'reject':
        await analytics.trackJourneyStep('content_rejected')
        break
      case 'refine':
        await analytics.trackJourneyStep('refinement_requested')
        break
    }
  }, [analytics])

  return {
    ...analytics,
    generateWithTracking,
    trackUserFeedback,
  }
}

export default useAnalytics 