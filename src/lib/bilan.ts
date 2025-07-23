/**
 * Bilan SDK Integration
 * 
 * Provides analytics tracking for AI interactions following a simple fire-and-forget pattern.
 * Similar to Amplitude or Mixpanel, but specialized for AI trust metrics.
 * 
 * Key principles:
 * - Fire-and-forget: Never throws errors that break the app
 * - Non-blocking: Analytics failures don't affect user experience
 * - Simple API: Standard patterns developers recognize
 */

import { 
  init as bilanInit, 
  trackTurn as bilanTrackTurn,
  vote as bilanVote,
  track as bilanTrack,
  startConversation as bilanStartConversation,
  endConversation as bilanEndConversation,
  trackJourneyStep as bilanTrackJourneyStep,
  isReady,
  createUserId,
  createConversationId,
  type InitConfig,
  type TurnContext,
  type UserId,
  type ConversationId
} from '@mocksi/bilan-sdk'

import { getEnvVar } from './env'
import type { AnalyticsEventProperties } from '../types/lint-types'

// Bilan configuration interface
export interface BilanConfig {
  mode: 'local' | 'server'
  userId: string
  endpoint?: string
  debug?: boolean
}

// Global configuration
let bilanConfig: BilanConfig | null = null
let currentUserId: UserId | null = null

/**
 * Initialize Bilan SDK
 * Fire-and-forget pattern: failures are logged but never thrown
 */
export async function initializeBilan(userId: string): Promise<void> {
  try {
    // Create configuration
    const mode = getEnvVar('NEXT_PUBLIC_BILAN_MODE', 'local') as 'local' | 'server'
    const endpoint = getEnvVar('NEXT_PUBLIC_BILAN_ENDPOINT', 'http://localhost:3002')
    const debug = getEnvVar('NEXT_PUBLIC_DEBUG', 'false') === 'true'

    bilanConfig = {
      mode,
      userId,
      endpoint: mode === 'server' ? endpoint : undefined,
      debug
    }

    currentUserId = createUserId(userId)

    // Initialize the actual Bilan SDK
    const initConfig: InitConfig = {
      mode,
      userId: currentUserId,
      endpoint: bilanConfig.endpoint,
      debug
    }

    await bilanInit(initConfig)

    if (debug) {
      console.info('Bilan SDK initialized successfully', { mode, endpoint })
    }
  } catch (error) {
    // Fire-and-forget: log error but don't throw
    console.warn('Bilan initialization failed:', error)
  }
}

/**
 * Track an AI turn with automatic failure detection
 * Returns both the AI result and turnId for correlation with votes
 */
export async function trackTurn<T>(
  prompt: string,
  aiFunction: () => Promise<T>,
  context?: TurnContext
): Promise<{ result: T; turnId: string }> {
  try {
    if (!isReady()) {
      // Graceful degradation - execute AI function without tracking
      const result = await aiFunction()
      return { result, turnId: '' }
    }

    const response = await bilanTrackTurn(prompt, aiFunction, context)
    return response
  } catch (error) {
    // Fire-and-forget: log error but still execute AI function
    console.warn('Bilan turn tracking failed:', error)
    try {
      const result = await aiFunction()
      return { result, turnId: '' }
    } catch (aiError) {
      // Re-throw AI errors since they're not related to analytics
      throw aiError
    }
  }
}

/**
 * Record user vote on AI response
 * Fire-and-forget: never throws errors
 */
export async function vote(turnId: string, rating: 1 | -1, comment?: string): Promise<void> {
  try {
    if (!isReady() || !turnId) {
      return
    }

    await bilanVote(turnId, rating, comment)
  } catch (error) {
    // Fire-and-forget: log error but don't throw
    console.warn('Bilan vote tracking failed:', error)
  }
}

/**
 * Track custom events (fire-and-forget)
 */
export async function track(
  eventType: string,
  properties?: AnalyticsEventProperties,
  content?: { promptText?: string; aiResponse?: string; context?: string }
): Promise<void> {
  try {
    if (!isReady()) {
      return
    }

    await bilanTrack(eventType, properties, content)
  } catch (error) {
    console.warn('Bilan event tracking failed:', error)
  }
}

/**
 * Start a conversation session
 */
export async function startConversation(): Promise<string> {
  try {
    if (!isReady() || !currentUserId) {
      return ''
    }

    return await bilanStartConversation(currentUserId)
  } catch (error) {
    console.warn('Bilan conversation start failed:', error)
    return ''
  }
}

/**
 * End a conversation session
 */
export async function endConversation(
  conversationId: string, 
  status: 'completed' | 'abandoned' = 'completed'
): Promise<void> {
  try {
    if (!isReady() || !conversationId) {
      return
    }

    await bilanEndConversation(conversationId, status)
  } catch (error) {
    console.warn('Bilan conversation end failed:', error)
  }
}

/**
 * Track journey progression
 */
export async function trackJourneyStep(
  journeyName: string, 
  stepName: string
): Promise<void> {
  try {
    if (!isReady() || !currentUserId) {
      return
    }

    await bilanTrackJourneyStep(journeyName, stepName, currentUserId)
  } catch (error) {
    console.warn('Bilan journey tracking failed:', error)
  }
}

/**
 * Get current configuration (for debugging)
 */
export function getConfig(): BilanConfig | null {
  return bilanConfig
}

/**
 * Check if Bilan is ready
 */
export function isBilanReady(): boolean {
  return isReady()
}

// Re-export types for use in components
export type { TurnContext, UserId, ConversationId }
export { createUserId, createConversationId } 