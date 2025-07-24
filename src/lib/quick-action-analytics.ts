import { track } from './bilan'

export interface QuickActionAnalytics {
  actionId: string
  actionLabel: string
  inputLength: number
  outputLength: number
  processingTime: number
  userSatisfaction: 1 | -1 | null
  timestamp: number
  sessionId?: string
}

/**
 * Enhanced analytics tracking for quick action usage patterns
 * 
 * Provides specialized tracking for standalone turns in the Bilan demo,
 * capturing user behavior patterns, satisfaction signals, and performance metrics
 * for each quick action type.
 */
export class QuickActionTracker {
  private sessionId: string
  private actionStartTimes: Map<string, number> = new Map()

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  /**
   * Track quick action initiation
   */
  async trackActionStart(actionId: string, actionLabel: string, inputLength: number) {
    const timestamp = Date.now()
    this.actionStartTimes.set(actionId, timestamp)

    await track('quick_action_started', {
      action_id: actionId,
      action_label: actionLabel,
      input_length: inputLength,
      session_id: this.sessionId,
      timestamp,
      event_type: 'action_initiation'
    })
  }

  /**
   * Track quick action completion with results
   */
  async trackActionComplete(
    actionId: string, 
    actionLabel: string,
    inputLength: number,
    outputLength: number,
    turnId: string
  ) {
    const timestamp = Date.now()
    const startTime = this.actionStartTimes.get(actionId) || timestamp
    const processingTime = timestamp - startTime

    await track('quick_action_completed', {
      action_id: actionId,
      action_label: actionLabel,
      input_length: inputLength,
      output_length: outputLength,
      processing_time: processingTime,
      turn_id: turnId,
      session_id: this.sessionId,
      timestamp,
      event_type: 'action_completion'
    })

    // Clean up start time
    this.actionStartTimes.delete(actionId)

    return {
      actionId,
      actionLabel,
      inputLength,
      outputLength,
      processingTime,
      turnId,
      timestamp
    }
  }

  /**
   * Track user satisfaction feedback
   */
  async trackActionFeedback(
    turnId: string,
    actionId: string,
    rating: 1 | -1,
    feedbackTime: number
  ) {
    await track('quick_action_feedback', {
      turn_id: turnId,
      action_id: actionId,
      rating,
      feedback_time: feedbackTime,
      session_id: this.sessionId,
      timestamp: Date.now(),
      event_type: 'user_feedback'
    })
  }

  /**
   * Track action abandonment (user closed without completing)
   */
  async trackActionAbandoned(actionId: string, actionLabel: string, inputLength: number) {
    const timestamp = Date.now()
    const startTime = this.actionStartTimes.get(actionId) || timestamp
    const timeSpent = timestamp - startTime

    await track('quick_action_abandoned', {
      action_id: actionId,
      action_label: actionLabel,
      input_length: inputLength,
      time_spent: timeSpent,
      session_id: this.sessionId,
      timestamp,
      event_type: 'action_abandonment'
    })

    // Clean up start time
    this.actionStartTimes.delete(actionId)
  }

  /**
   * Track error events
   */
  async trackActionError(
    actionId: string,
    actionLabel: string,
    error: string,
    inputLength: number
  ) {
    const timestamp = Date.now()
    const startTime = this.actionStartTimes.get(actionId) || timestamp
    const timeToError = timestamp - startTime

    await track('quick_action_error', {
      action_id: actionId,
      action_label: actionLabel,
      error_message: error,
      input_length: inputLength,
      time_to_error: timeToError,
      session_id: this.sessionId,
      timestamp,
      event_type: 'action_error'
    })

    // Clean up start time
    this.actionStartTimes.delete(actionId)
  }

  /**
   * Generate session summary analytics
   */
  getSessionSummary() {
    return {
      sessionId: this.sessionId,
      activeActions: Array.from(this.actionStartTimes.keys()),
      sessionStartTime: Math.min(...Array.from(this.actionStartTimes.values())),
      currentTime: Date.now()
    }
  }
}

// Singleton instance for the demo
export const quickActionTracker = new QuickActionTracker()

/**
 * Convenience functions for common tracking scenarios
 */
export const trackQuickActionStart = (actionId: string, actionLabel: string, inputLength: number) =>
  quickActionTracker.trackActionStart(actionId, actionLabel, inputLength)

export const trackQuickActionComplete = (
  actionId: string, 
  actionLabel: string,
  inputLength: number,
  outputLength: number,
  turnId: string
) => quickActionTracker.trackActionComplete(actionId, actionLabel, inputLength, outputLength, turnId)

export const trackQuickActionFeedback = (turnId: string, actionId: string, rating: 1 | -1, feedbackTime: number) =>
  quickActionTracker.trackActionFeedback(turnId, actionId, rating, feedbackTime)

export const trackQuickActionAbandoned = (actionId: string, actionLabel: string, inputLength: number) =>
  quickActionTracker.trackActionAbandoned(actionId, actionLabel, inputLength)

export const trackQuickActionError = (actionId: string, actionLabel: string, error: string, inputLength: number) =>
  quickActionTracker.trackActionError(actionId, actionLabel, error, inputLength) 