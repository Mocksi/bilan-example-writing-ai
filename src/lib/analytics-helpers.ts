/**
 * Analytics Helper Utilities
 * 
 * Structured helpers for conversation lifecycle and journey tracking
 * following standard analytics patterns for user funnel analysis
 */

import { track, getBilan } from './bilan'
import type { 
  UserId, 
  SessionId, 
  ConversationId, 
  ContentType,
  UserFeedback 
} from '../types'

export interface ConversationMeta {
  conversationId: ConversationId
  userId: UserId
  contentType: ContentType
  startTime: number
  sessionId?: SessionId
}

export interface JourneyStepMeta {
  step: string
  timestamp: number
  userId: UserId
  sessionId?: SessionId
  conversationId?: ConversationId
  properties?: Record<string, any>
}

/**
 * Content Creation Journey Steps
 * Standardized funnel steps for consistent tracking
 */
export const JOURNEY_STEPS = {
  // Entry points
  LANDING: 'landing_page_viewed',
  CONTENT_TYPE_SELECTION: 'content_type_selection_viewed',
  
  // Content creation flow
  CONTENT_TYPE_SELECTED: 'content_type_selected',
  BRIEF_PROVIDED: 'brief_provided',
  CONTENT_GENERATED: 'content_generated',
  
  // User feedback loop
  FEEDBACK_PROVIDED: 'feedback_provided',
  CONTENT_ACCEPTED: 'content_accepted',
  CONTENT_REJECTED: 'content_rejected',
  REFINEMENT_REQUESTED: 'refinement_requested',
  
  // Session outcomes
  SESSION_COMPLETED: 'session_completed',
  SESSION_ABANDONED: 'session_abandoned',
  
  // Error states
  GENERATION_FAILED: 'generation_failed',
  FRUSTRATION_DETECTED: 'frustration_detected'
} as const

export type JourneyStep = typeof JOURNEY_STEPS[keyof typeof JOURNEY_STEPS]

/**
 * Simple conversation lifecycle manager
 */
export class ConversationManager {
  private conversations = new Map<ConversationId, ConversationMeta>()

  /**
   * Start a new conversation with analytics tracking
   */
  async startConversation(
    conversationId: ConversationId,
    userId: UserId,
    contentType: ContentType,
    sessionId?: SessionId
  ): Promise<void> {
    const meta: ConversationMeta = {
      conversationId,
      userId,
      contentType,
      startTime: Date.now(),
      sessionId
    }

    this.conversations.set(conversationId, meta)

    // Track conversation start (fire-and-forget)
    await track('conversation_started', {
      conversationId,
      userId,
      contentType,
      sessionId,
      timestamp: meta.startTime
    })
  }

  /**
   * End a conversation with outcome tracking
   */
  async endConversation(
    conversationId: ConversationId,
    outcome: 'completed' | 'abandoned' | 'error'
  ): Promise<void> {
    const meta = this.conversations.get(conversationId)
    if (!meta) {
      console.warn('Attempted to end unknown conversation:', conversationId)
      return
    }

    const endTime = Date.now()
    const duration = endTime - meta.startTime

    // Track conversation end
    await track('conversation_ended', {
      conversationId,
      userId: meta.userId,
      contentType: meta.contentType,
      outcome,
      duration,
      sessionId: meta.sessionId,
      timestamp: endTime
    })

    // Track specific outcome
    const outcomeEvent = outcome === 'completed' 
      ? JOURNEY_STEPS.SESSION_COMPLETED
      : JOURNEY_STEPS.SESSION_ABANDONED

    await track(outcomeEvent, {
      conversationId,
      userId: meta.userId,
      contentType: meta.contentType,
      duration,
      sessionId: meta.sessionId
    })

    // Clean up
    this.conversations.delete(conversationId)
  }

  /**
   * Get conversation metadata
   */
  getConversation(conversationId: ConversationId): ConversationMeta | undefined {
    return this.conversations.get(conversationId)
  }

  /**
   * Get all active conversations
   */
  getActiveConversations(): ConversationMeta[] {
    return Array.from(this.conversations.values())
  }
}

/**
 * Journey tracking utilities
 */
export class JourneyTracker {
  private userJourneys = new Map<UserId, JourneyStepMeta[]>()

  /**
   * Track a journey step with automatic sequencing
   */
  async trackStep(
    step: JourneyStep,
    userId: UserId,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const stepMeta: JourneyStepMeta = {
      step,
      timestamp: Date.now(),
      userId,
      sessionId: properties.sessionId,
      conversationId: properties.conversationId,
      properties: {
        ...properties,
        // Remove IDs from properties to avoid duplication
        sessionId: undefined,
        conversationId: undefined,
        userId: undefined
      }
    }

    // Add to user journey history
    const userSteps = this.userJourneys.get(userId) || []
    userSteps.push(stepMeta)
    this.userJourneys.set(userId, userSteps)

    // Calculate step sequence and timing
    const stepSequence = userSteps.length
    const previousStep = userSteps[stepSequence - 2]
    const timeSincePrevious = previousStep 
      ? stepMeta.timestamp - previousStep.timestamp 
      : 0

    // Track the journey step
    await track('journey_step', {
      step,
      userId,
      stepSequence,
      timeSincePrevious,
      sessionId: stepMeta.sessionId,
      conversationId: stepMeta.conversationId,
      ...stepMeta.properties
    })
  }

  /**
   * Track funnel progression with conversion analysis
   */
  async trackFunnelStep(
    fromStep: JourneyStep,
    toStep: JourneyStep,
    userId: UserId,
    properties: Record<string, any> = {}
  ): Promise<void> {
    await track('funnel_progression', {
      fromStep,
      toStep,
      userId,
      timestamp: Date.now(),
      ...properties
    })

    // Also track the destination step
    await this.trackStep(toStep, userId, properties)
  }

  /**
   * Detect and track abandonment patterns
   */
  async trackAbandonment(
    userId: UserId,
    lastStep: JourneyStep,
    sessionDuration: number,
    properties: Record<string, any> = {}
  ): Promise<void> {
    await track('user_abandonment', {
      userId,
      lastStep,
      sessionDuration,
      timestamp: Date.now(),
      ...properties
    })

    await this.trackStep(JOURNEY_STEPS.SESSION_ABANDONED, userId, {
      lastCompletedStep: lastStep,
      sessionDuration,
      ...properties
    })
  }

  /**
   * Get user journey history
   */
  getUserJourney(userId: UserId): JourneyStepMeta[] {
    return this.userJourneys.get(userId) || []
  }

  /**
   * Clear user journey (for privacy/cleanup)
   */
  clearUserJourney(userId: UserId): void {
    this.userJourneys.delete(userId)
  }
}

/**
 * Frustration detection utilities
 */
export class FrustrationDetector {
  private userActions = new Map<UserId, Array<{ action: string; timestamp: number }>>()

  /**
   * Track user action for frustration detection
   */
  trackAction(userId: UserId, action: string): void {
    const actions = this.userActions.get(userId) || []
    actions.push({ action, timestamp: Date.now() })
    
    // Keep only recent actions (last 5 minutes)
    const recentActions = actions.filter(
      a => Date.now() - a.timestamp < 5 * 60 * 1000
    )
    
    this.userActions.set(userId, recentActions)
  }

  /**
   * Check for frustration patterns and track if detected
   */
  async checkFrustration(userId: UserId): Promise<boolean> {
    const actions = this.userActions.get(userId) || []
    const recentRejections = actions.filter(
      a => a.action === 'content_rejected' && Date.now() - a.timestamp < 2 * 60 * 1000
    )

    const isFrustrated = recentRejections.length >= 3

    if (isFrustrated) {
      await track('frustration_detected', {
        userId,
        rejectionCount: recentRejections.length,
        timeWindow: '2_minutes',
        timestamp: Date.now()
      })
    }

    return isFrustrated
  }
}

// Global instances for easy usage
export const conversationManager = new ConversationManager()
export const journeyTracker = new JourneyTracker()
export const frustrationDetector = new FrustrationDetector()

/**
 * Convenience functions for common patterns
 */

/**
 * Track content creation funnel step
 */
export const trackContentStep = async (
  step: JourneyStep,
  userId: UserId,
  contentType: ContentType,
  properties: Record<string, any> = {}
): Promise<void> => {
  await journeyTracker.trackStep(step, userId, {
    contentType,
    journey_id: 'content-creation-workflow',
    ...properties
  })
}

/**
 * Track user feedback with frustration detection
 */
export const trackFeedbackWithFrustration = async (
  userId: UserId,
  feedback: UserFeedback,
  properties: Record<string, any> = {}
): Promise<void> => {
  // Track the feedback
  const feedbackStep = feedback.type === 'accept' 
    ? JOURNEY_STEPS.CONTENT_ACCEPTED
    : feedback.type === 'reject'
    ? JOURNEY_STEPS.CONTENT_REJECTED
    : JOURNEY_STEPS.REFINEMENT_REQUESTED

  await trackContentStep(feedbackStep, userId, properties.contentType, properties)

  // Track action for frustration detection
  frustrationDetector.trackAction(userId, `content_${feedback.type}`)

  // Check for frustration
  await frustrationDetector.checkFrustration(userId)
}

/**
 * Auto-track page unload for abandonment detection
 */
export const setupAbandonmentTracking = (): void => {
  if (typeof window === 'undefined') return

  let sessionStartTime = Date.now()
  let lastStep: JourneyStep = JOURNEY_STEPS.LANDING
  let currentUserId: UserId | undefined

  // Update tracking variables
  window.addEventListener('analytics-step', ((event: CustomEvent) => {
    lastStep = event.detail.step
    currentUserId = event.detail.userId
  }) as EventListener)

  // Track abandonment on page unload
  window.addEventListener('beforeunload', async () => {
    if (currentUserId) {
      const sessionDuration = Date.now() - sessionStartTime
      
      try {
        // Use navigator.sendBeacon for reliable transmission
        const abandonmentData = {
          eventType: 'user_abandonment',
          userId: currentUserId,
          lastStep,
          sessionDuration,
          timestamp: Date.now()
        }

        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            `${getBilan().getConfig().endpoint}/api/events`,
            JSON.stringify(abandonmentData)
          )
        }
      } catch (error) {
        // Silently fail - abandonment tracking is best effort
      }
    }
  })
}

/**
 * Helper to dispatch step events for abandonment tracking
 */
export const notifyStepChange = (step: JourneyStep, userId: UserId): void => {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent('analytics-step', {
    detail: { step, userId }
  }))
} 