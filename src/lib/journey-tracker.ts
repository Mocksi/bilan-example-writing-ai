'use client'

import { track, trackTurn } from './bilan'
import type { UserId } from '../types'

/**
 * Journey state interface for persistence
 */
interface JourneyState {
  sessionId: string
  journeyName: string
  userId: UserId
  startedAt: number
  currentStep: number
  currentStepName: string
  completedSteps: string[]
  stepAttempts: Record<string, number>
  stepData: Record<string, any>
  totalSteps: number
  metadata: Record<string, any>
}

/**
 * Comprehensive journey tracking based on Bilan team recommendations
 * 
 * Features:
 * - Unique session ID for each journey instance
 * - Step sequencing and retry tracking
 * - Rich metadata for each step
 * - Abandonment detection
 * - State persistence for page refreshes
 * - Navigation pattern tracking
 */
export class JourneyTracker {
  private sessionId: string
  private startTime: number
  private stepAttempts: Map<string, number>
  private completedSteps: string[]
  private currentStep: number
  private currentStepName: string
  private stepStartTime: number
  private previousStepName: string | null
  private stepData: Record<string, any>
  private isCompleted: boolean
  private totalSteps: number

  constructor(
    private journeyName: string,
    private userId: UserId,
    totalSteps: number,
    metadata: Record<string, any> = {}
  ) {
    this.sessionId = this.generateSessionId()
    this.startTime = Date.now()
    this.stepStartTime = Date.now()
    this.stepAttempts = new Map()
    this.completedSteps = []
    this.currentStep = 0
    this.currentStepName = ''
    this.previousStepName = null
    this.stepData = {}
    this.isCompleted = false
    this.totalSteps = totalSteps

    // Try to restore from saved state
    this.restoreState()

    // Save initial state
    this.saveState()

    // Set up abandonment tracking
    this.setupAbandonmentTracking()
  }

  /**
   * Generate unique session ID for this journey instance
   */
  private generateSessionId(): string {
    return `journey_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  /**
   * Start the journey and track the event
   */
  async start(metadata: Record<string, any> = {}): Promise<void> {
    await track('user_action', {
      action_type: 'journey_started',
      journey_name: this.journeyName,
      journey_session_id: this.sessionId,
      user_id: this.userId.toString(),
      started_at: this.startTime,
      expected_steps: this.totalSteps,
      journey_metadata: JSON.stringify({
        ...metadata,
        source: metadata.source || 'unknown',
        ai_model: 'webllm',
        browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      })
    })

    console.log(`🚀 Journey started: ${this.journeyName} (${this.sessionId})`)
  }

  /**
   * Track a step in the journey
   */
  async trackStep(
    stepName: string,
    sequence: number,
    data: Record<string, any> = {},
    navigationType: 'forward' | 'back' = 'forward'
  ): Promise<void> {
    const attemptKey = `${stepName}-${sequence}`
    const attempts = this.stepAttempts.get(attemptKey) || 0
    this.stepAttempts.set(attemptKey, attempts + 1)

    const timeOnStep = Date.now() - this.stepStartTime

    await track('journey_step', {
      journey_name: this.journeyName,
      step_name: stepName,
      user_id: this.userId.toString(),
      completed_at: Date.now(),
      journey_session_id: this.sessionId,
      step_sequence: sequence,
      step_attempt: attempts + 1,
      total_steps: this.totalSteps,
      time_on_step_ms: timeOnStep,
      previous_step: this.previousStepName,
      navigation_type: navigationType,
      step_data: JSON.stringify(data),
      steps_completed_so_far: this.completedSteps.length,
      journey_progress_percentage: Math.round((this.completedSteps.length / this.totalSteps) * 100)
    })

    // Update state
    this.previousStepName = this.currentStepName
    this.currentStepName = stepName
    this.currentStep = sequence
    this.stepStartTime = Date.now()
    this.stepData[stepName] = data

    if (!this.completedSteps.includes(stepName)) {
      this.completedSteps.push(stepName)
    }

    this.saveState()

    console.log(`📍 Journey step tracked: ${stepName} (attempt ${attempts + 1})`)
  }

  /**
   * Link a turn to the current journey step
   */
  async linkTurn(turnId: string, metadata: Record<string, any> = {}): Promise<void> {
    await track('user_action', {
      action_type: 'journey_turn_link',
      journey_session_id: this.sessionId,
      journey_name: this.journeyName,
      journey_step: this.currentStepName,
      turn_id: turnId,
      step_sequence: this.currentStep,
      user_id: this.userId.toString(),
      ...metadata
    })
  }

  /**
   * Track turn with journey context
   */
  async trackTurnWithJourney(
    prompt: string,
    generateFn: () => Promise<string>,
    metadata: Record<string, any> = {}
  ): Promise<{ result: string; turnId: string }> {
    const { result, turnId } = await trackTurn(prompt, generateFn, {
      ...metadata,
      journey_session_id: this.sessionId,
      journey_name: this.journeyName,
      journey_step: this.currentStepName,
      step_sequence: this.currentStep
    })

    // Also link the turn
    await this.linkTurn(turnId, { prompt_length: prompt.length })

    return { result, turnId }
  }

  /**
   * Handle back navigation
   */
  async navigateBack(
    targetStepName: string,
    targetSequence: number,
    reason: string = 'user_navigation'
  ): Promise<void> {
    await this.trackStep(targetStepName, targetSequence, {
      reason_for_back: reason,
      from_step: this.currentStepName,
      from_sequence: this.currentStep
    }, 'back')
  }

  /**
   * Complete the journey
   */
  async complete(outcome: 'completed' | 'abandoned' = 'completed', metadata: Record<string, any> = {}): Promise<void> {
    const totalAttempts = Array.from(this.stepAttempts.values()).reduce((a, b) => a + b, 0)
    const duration = Date.now() - this.startTime

    await track('user_action', {
      action_type: 'journey_completed',
      journey_name: this.journeyName,
      journey_session_id: this.sessionId,
      user_id: this.userId.toString(),
      completed_at: Date.now(),
      duration_ms: duration,
      steps_completed: this.completedSteps.length,
      total_attempts: totalAttempts,
      outcome,
      average_attempts_per_step: totalAttempts / Math.max(this.completedSteps.length, 1),
      final_step_data: JSON.stringify(this.stepData),
      ...metadata
    })

    this.isCompleted = true
    this.clearState()

    console.log(`🏁 Journey ${outcome}: ${this.journeyName} (${this.sessionId})`)
    console.log(`   Duration: ${Math.round(duration / 1000)}s, Steps: ${this.completedSteps.length}, Attempts: ${totalAttempts}`)
  }

  /**
   * Abandon the journey
   */
  async abandon(reason: string = 'user_left'): Promise<void> {
    if (this.isCompleted) return

    const duration = Date.now() - this.startTime

    await track('user_action', {
      action_type: 'journey_abandoned',
      journey_name: this.journeyName,
      journey_session_id: this.sessionId,
      user_id: this.userId.toString(),
      abandoned_at_step: this.currentStepName,
      step_sequence: this.currentStep,
      time_in_journey_ms: duration,
      steps_completed: this.completedSteps.length,
      completion_percentage: Math.round((this.completedSteps.length / this.totalSteps) * 100),
      abandonment_reason: reason,
      last_step_data: this.stepData[this.currentStepName] || {}
    })

    this.clearState()

    console.log(`🚪 Journey abandoned: ${this.journeyName} at step ${this.currentStepName}`)
  }

  /**
   * Save journey state to localStorage
   */
  private saveState(): void {
    if (typeof window === 'undefined') return

    const state: JourneyState = {
      sessionId: this.sessionId,
      journeyName: this.journeyName,
      userId: this.userId,
      startedAt: this.startTime,
      currentStep: this.currentStep,
      currentStepName: this.currentStepName,
      completedSteps: this.completedSteps,
      stepAttempts: Object.fromEntries(this.stepAttempts),
      stepData: this.stepData,
      totalSteps: this.totalSteps,
      metadata: {
        previousStepName: this.previousStepName,
        stepStartTime: this.stepStartTime
      }
    }

    localStorage.setItem(`journey_${this.journeyName}_${this.sessionId}`, JSON.stringify(state))
  }

  /**
   * Restore journey state from localStorage
   */
  private restoreState(): boolean {
    if (typeof window === 'undefined') return false

    // Look for any active journey of this type using precise pattern matching
    const keyPrefix = `journey_${this.journeyName}_`
    const keys = Object.keys(localStorage).filter(k => 
      k.startsWith(keyPrefix)
    )

    if (keys.length === 0) return false

    // Get the most recent one
    const latestKey = keys.sort().reverse()[0]
    const saved = localStorage.getItem(latestKey)

    if (!saved) return false

    try {
      const state: JourneyState = JSON.parse(saved)
      
      // Only restore if it's recent (within last hour)
      if (Date.now() - state.startedAt > 3600000) {
        localStorage.removeItem(latestKey)
        return false
      }

      // Restore state
      this.sessionId = state.sessionId
      this.startTime = state.startedAt
      this.currentStep = state.currentStep
      this.currentStepName = state.currentStepName
      this.completedSteps = state.completedSteps
      this.stepAttempts = new Map(Object.entries(state.stepAttempts))
      this.stepData = state.stepData
      this.previousStepName = state.metadata?.previousStepName || null
      this.stepStartTime = state.metadata?.stepStartTime || Date.now()

      console.log(`♻️ Restored journey: ${this.journeyName} (${this.sessionId})`)
      return true
    } catch (error) {
      console.error('Failed to restore journey state:', error)
      return false
    }
  }

  /**
   * Clear saved state
   */
  private clearState(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`journey_${this.journeyName}_${this.sessionId}`)
  }

  /**
   * Set up abandonment tracking for page unload
   */
  private setupAbandonmentTracking(): void {
    if (typeof window === 'undefined') return

    const handleUnload = () => {
      if (!this.isCompleted && this.currentStep > 0) {
        // Use sendBeacon for reliability
        const payload = {
          event_type: 'user_action',
          properties: {
            action_type: 'journey_abandoned',
            journey_name: this.journeyName,
            journey_session_id: this.sessionId,
            abandoned_at_step: this.currentStepName,
            step_sequence: this.currentStep,
            time_in_journey_ms: Date.now() - this.startTime,
            steps_completed: this.completedSteps.length,
            abandonment_reason: 'page_unload'
          }
        }

        navigator.sendBeacon('/api/track', JSON.stringify(payload))
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    
    // Clean up on completion
    const originalComplete = this.complete.bind(this)
    this.complete = async (...args) => {
      window.removeEventListener('beforeunload', handleUnload)
      return originalComplete(...args)
    }
  }

  /**
   * Get current journey state
   */
  getState() {
    return {
      sessionId: this.sessionId,
      journeyName: this.journeyName,
      currentStep: this.currentStep,
      currentStepName: this.currentStepName,
      completedSteps: this.completedSteps.length,
      totalSteps: this.totalSteps,
      progressPercentage: Math.round((this.completedSteps.length / this.totalSteps) * 100),
      duration: Date.now() - this.startTime,
      isCompleted: this.isCompleted
    }
  }
} 