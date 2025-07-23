/**
 * Analytics Helper Utilities
 * 
 * Structured helpers for conversation lifecycle and journey tracking
 * following standard analytics patterns for user funnel analysis
 */

import { track, getConfig } from './bilan'
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
 * Journey tracking utilities with memory management
 */
export class JourneyTracker {
  private userJourneys = new Map<UserId, JourneyStepMeta[]>()
  private userLastAccess = new Map<UserId, number>()
  
  // Memory management configuration
  private static readonly MAX_STEPS_PER_USER = 50 // Limit journey length per user
  private static readonly MAX_USERS_TRACKED = 1000 // Maximum number of users to track
  private static readonly MAX_JOURNEY_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours
  private static readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // Cleanup every hour
  
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor() {
    // Start periodic cleanup
    this.startPeriodicCleanup()
  }

  /**
   * Track a journey step with automatic sequencing and memory management
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

    // Add to user journey history with memory management
    const userSteps = this.userJourneys.get(userId) || []
    userSteps.push(stepMeta)
    
    // Trim to maximum steps per user to prevent unbounded growth
    if (userSteps.length > JourneyTracker.MAX_STEPS_PER_USER) {
      userSteps.splice(0, userSteps.length - JourneyTracker.MAX_STEPS_PER_USER)
    }
    
    this.userJourneys.set(userId, userSteps)
    this.userLastAccess.set(userId, Date.now())
    
    // Evict oldest users if we exceed the maximum user limit
    this.evictOldestUsersIfNeeded()

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
    const journey = this.userJourneys.get(userId) || []
    // Update last access time when journey is accessed
    if (journey.length > 0) {
      this.userLastAccess.set(userId, Date.now())
    }
    return journey
  }

  /**
   * Clear user journey (for privacy/cleanup)
   */
  clearUserJourney(userId: UserId): void {
    this.userJourneys.delete(userId)
    this.userLastAccess.delete(userId)
  }

  /**
   * Evict oldest users when user limit is exceeded (LRU eviction)
   */
  private evictOldestUsersIfNeeded(): void {
    if (this.userJourneys.size <= JourneyTracker.MAX_USERS_TRACKED) {
      return
    }

    // Calculate how many users to evict (10% buffer to avoid frequent evictions)
    const usersToEvict = Math.ceil(this.userJourneys.size * 0.1)
    
    // Get users sorted by last access time (oldest first)
    const usersByAccess = Array.from(this.userLastAccess.entries())
      .sort(([, aTime], [, bTime]) => aTime - bTime)
      .slice(0, usersToEvict)

    // Evict oldest users
    for (const [userId] of usersByAccess) {
      this.userJourneys.delete(userId)
      this.userLastAccess.delete(userId)
    }

    // Log eviction for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`JourneyTracker: Evicted ${usersToEvict} oldest users (total: ${this.userJourneys.size})`)
    }
  }

  /**
   * Clean up old journeys based on time
   */
  private cleanupOldJourneys(): void {
    const now = Date.now()
    const cutoffTime = now - JourneyTracker.MAX_JOURNEY_AGE_MS
    let cleanedCount = 0

    for (const [userId, steps] of this.userJourneys.entries()) {
      // Remove steps older than the cutoff time
      const recentSteps = steps.filter(step => step.timestamp > cutoffTime)
      
      if (recentSteps.length === 0) {
        // No recent steps, remove user entirely
        this.userJourneys.delete(userId)
        this.userLastAccess.delete(userId)
        cleanedCount++
      } else if (recentSteps.length !== steps.length) {
        // Some steps were old, update with recent steps only
        this.userJourneys.set(userId, recentSteps)
      }
    }

    // Log cleanup for debugging
    if (process.env.NODE_ENV === 'development' && cleanedCount > 0) {
      console.log(`JourneyTracker: Cleaned up ${cleanedCount} old user journeys`)
    }
  }

  /**
   * Start periodic cleanup of old journeys
   */
  private startPeriodicCleanup(): void {
    // Only run cleanup in environments that support timers
    if (typeof setTimeout === 'undefined') {
      return
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupOldJourneys()
    }, JourneyTracker.CLEANUP_INTERVAL_MS)
  }

  /**
   * Stop periodic cleanup (for testing or cleanup)
   */
  stopPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Get memory usage statistics for monitoring
   */
  getMemoryStats(): {
    totalUsers: number
    totalSteps: number
    averageStepsPerUser: number
    oldestJourneyAge: number
  } {
    const totalUsers = this.userJourneys.size
    let totalSteps = 0
    let oldestTimestamp = Date.now()

    for (const steps of this.userJourneys.values()) {
      totalSteps += steps.length
      if (steps.length > 0) {
        const firstStep = steps[0]
        if (firstStep.timestamp < oldestTimestamp) {
          oldestTimestamp = firstStep.timestamp
        }
      }
    }

    return {
      totalUsers,
      totalSteps,
      averageStepsPerUser: totalUsers > 0 ? Math.round(totalSteps / totalUsers) : 0,
      oldestJourneyAge: Date.now() - oldestTimestamp
    }
  }

  /**
   * Manual cleanup method for testing or explicit cleanup
   */
  cleanup(): void {
    this.cleanupOldJourneys()
    this.evictOldestUsersIfNeeded()
  }

  /**
   * Destroy the tracker and clean up resources
   */
  destroy(): void {
    this.stopPeriodicCleanup()
    this.userJourneys.clear()
    this.userLastAccess.clear()
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
          const config = getConfig()
          const endpoint = config?.endpoint || 'http://localhost:3002'
          navigator.sendBeacon(
            `${endpoint}/api/events`,
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