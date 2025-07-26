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
  token?: string
  tokenExpiresAt?: number
}



// Global configuration
let bilanConfig: BilanConfig | null = null
let currentUserId: UserId | null = null



/**
 * Initialize Bilan SDK with token authentication
 * Fire-and-forget pattern: failures are logged but never thrown
 */
export async function initializeBilan(userId: string): Promise<void> {
  try {
    // Use environment configuration directly for demo
    const mode = getEnvVar('NEXT_PUBLIC_BILAN_MODE', 'local') as 'local' | 'server'
    const endpoint = getEnvVar('NEXT_PUBLIC_BILAN_ENDPOINT', 'http://localhost:3002')
    const debug = getEnvVar('NEXT_PUBLIC_DEBUG', 'false') === 'true'
    
    // For server mode, use API key from environment
    const apiKeyFromEnv = getEnvVar('NEXT_PUBLIC_BILAN_API_KEY', '')
    const token = mode === 'server' 
      ? apiKeyFromEnv
      : `demo-token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    
    // Debug logging for API key
    console.log('🔍 Environment config debug:', {
      mode,
      endpoint,
      debug,
      apiKeyFromEnv: apiKeyFromEnv ? `${apiKeyFromEnv.slice(0, 4)}***${apiKeyFromEnv.slice(-4)}` : 'EMPTY',
      tokenSet: !!token
    })
    
    // Create configuration
    bilanConfig = {
      mode,
      userId,
      endpoint,
      debug,
      token,
      tokenExpiresAt: Date.now() + (24 * 60 * 60 * 1000)
    }

    currentUserId = createUserId(userId)

    // NEW in v0.4.2: Validate apiKey for server mode
    const apiKey = getEnvVar('NEXT_PUBLIC_BILAN_API_KEY') || bilanConfig.token
    if (bilanConfig.mode === 'server' && !apiKey) {
      throw new Error('NEXT_PUBLIC_BILAN_API_KEY is required for server mode in SDK v0.4.2+')
    }

    // Initialize the actual Bilan SDK with required apiKey for server mode
    const initConfig: InitConfig = {
      mode: bilanConfig.mode,
      userId: currentUserId,
      endpoint: bilanConfig.endpoint,
      debug: bilanConfig.debug,
      // NEW in v0.4.2: apiKey is required for server mode
      ...(bilanConfig.mode === 'server' && { apiKey }),
      // CRITICAL: privacyConfig is required for event system to initialize
      privacyConfig: {
        defaultCaptureLevel: 'sanitized' as const,
        captureLevels: {
          prompts: 'sanitized' as const,
          responses: 'sanitized' as const,
          errors: 'sanitized' as const,
          metadata: 'full' as const
        },
        customPiiPatterns: [],
        detectBuiltinPii: true,
        hashSensitiveContent: false
      }
    }

    if (bilanConfig.debug) {
      console.log('🚀 About to call bilanInit with:', initConfig)
      console.log('🔑 API Key details:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0,
        apiKeyStatus: apiKey ? '[REDACTED-FOR-SECURITY]' : 'none',
        configMode: initConfig.mode,
        willPassApiKey: bilanConfig.mode === 'server'
      })
    }
    
    // Add comprehensive network monitoring to catch ALL request types (development only)
    if (typeof window !== 'undefined' && bilanConfig.mode === 'server' && process.env.NODE_ENV === 'development') {
      console.log('🕵️ Setting up comprehensive network monitoring...')
      
      // Monitor fetch requests
      const originalFetch = window.fetch
      window.fetch = async (...args) => {
        const [resource, config] = args
        const url = typeof resource === 'string' ? resource : 
                    resource instanceof URL ? resource.toString() : 
                    resource instanceof Request ? resource.url : 'unknown'
        
        if (url.includes('localhost:3002') || url.includes('/api/events')) {
          // Log Bilan API requests for debugging
          let eventCount = 0
          try {
            if (config?.body && typeof config.body === 'string') {
              const parsedBody = JSON.parse(config.body)
              eventCount = parsedBody?.events?.length || 0
            }
          } catch (e) {}
          
          console.log(`🌐 → Bilan API: ${config?.method || 'GET'} ${eventCount} events`)
        }
        
        const response = await originalFetch(...args)
        
        if (url.includes('localhost:3002') || url.includes('/api/events')) {
          console.log(`🌐 ← Bilan API: ${response.status} ${response.ok ? '✅' : '❌'}`)
        }
        
        return response
      }



      console.log('🕵️ Network monitoring setup complete')
    }
    
    await bilanInit(initConfig)

    // Verify the SDK is actually in server mode
    const { getConfig } = await import('@mocksi/bilan-sdk')
    const actualConfig = getConfig()
    
    if (bilanConfig.debug) {
      console.log('🔍 SDK actual config after init:', actualConfig)
      
      if (actualConfig) {
        console.log('🔍 SDK config detailed inspection:', {
          mode: actualConfig.mode,
          endpoint: actualConfig.endpoint,
          hasApiKey: 'apiKey' in actualConfig ? !!actualConfig.apiKey : false,
          debug: actualConfig.debug,
          userId: actualConfig.userId
        })
      }
    }

    if (bilanConfig.debug) {
      console.info('✅ Bilan SDK v0.4.2 initialized successfully', { 
        mode: bilanConfig.mode, 
        endpoint: bilanConfig.endpoint,
        hasApiKey: bilanConfig.mode === 'server' ? !!getEnvVar('BILAN_API_KEY') : 'N/A',
        actualSDKConfig: actualConfig
      })
    }


  } catch (error) {
    // Fire-and-forget: log error but don't throw
    console.warn('Bilan initialization failed:', error)
  }
}

/**
 * Enhanced turn tracking with comprehensive metadata
 * Following .cursorrules pattern for content generation workflow
 * Returns both the AI result and turnId for correlation with votes
 */
export async function trackTurn<T>(
  prompt: string,
  aiFunction: () => Promise<T>,
  metadata?: {
    contentType?: 'blog' | 'email' | 'social'
    iterationNumber?: number
    conversationId?: string
    journey_id?: string
    journey_step?: string
    model?: string
    previousAttempts?: number
    userIntent?: string
    [key: string]: any
  }
): Promise<{ result: T; turnId: string }> {
  try {
    if (!isReady()) {
      // Graceful degradation - execute AI function without tracking
      const result = await aiFunction()
      return { result, turnId: '' }
    }

    // Build comprehensive turn context following .cursorrules patterns
    const turnContext: TurnContext = {
      // Core metadata from .cursorrules content generation pattern
      contentType: metadata?.contentType,
      iterationNumber: metadata?.iterationNumber || 1,
      conversationId: metadata?.conversationId,
      journey_id: metadata?.journey_id,
      journey_step: metadata?.journey_step,
      
      // AI model information
      model: metadata?.model || (bilanConfig?.mode === 'local' ? 'Llama-3.2-1B-Instruct-q4f32_1-MLC' : 'unknown'),
      provider: 'webllm',
      
      // Performance and context metadata
      timestamp: Date.now(),
      previousAttempts: metadata?.previousAttempts || 0,
      userIntent: metadata?.userIntent,
      
      // Include any additional metadata
      ...metadata
    }

    const startTime = Date.now()
    
    console.log('📊 TrackTurn:', {
      actionType: metadata?.action_type || 'unknown',
      promptLength: prompt.length,
      model: metadata?.model || 'unknown'
    })
    
    const response = await bilanTrackTurn(prompt, aiFunction, turnContext)
    const responseTime = Date.now() - startTime
    
    console.log('📊 Turn completed:', response.turnId, `${responseTime}ms`)

    // Update conversation turn count if this turn is part of a conversation
    if (metadata?.conversationId) {
      incrementConversationTurnCount(metadata.conversationId)
    }

    // Log successful tracking in debug mode
    if (bilanConfig?.debug) {
      console.info('✅ Turn tracked successfully', {
        turnId: response.turnId,
        responseTime: `${responseTime}ms`,
        actionType: turnContext.action_type || 'ai_interaction'
      })
    }

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
 * Enhanced vote tracking with turn correlation
 * Following .cursorrules user feedback pattern
 * Fire-and-forget: never throws errors
 */
export async function vote(
  turnId: string, 
  rating: 1 | -1, 
  comment?: string,
  metadata?: {
    feedbackType?: 'accept' | 'reject' | 'refine'
    acceptanceLevel?: 'as_is' | 'light_edit' | 'heavy_edit' | 'inspiration'
    quickFeedback?: string[]
    refinementRequest?: string
    responseTime?: number
    [key: string]: any
  }
): Promise<void> {
  try {
    if (!isReady() || !turnId) {
      return
    }

    // Enhanced vote with comprehensive comment including metadata
    const enhancedComment = comment ? 
      `${comment} [metadata: ${JSON.stringify({
        feedbackType: metadata?.feedbackType || (rating === 1 ? 'accept' : 'reject'),
        acceptanceLevel: metadata?.acceptanceLevel,
        quickFeedback: metadata?.quickFeedback,
        responseTime: metadata?.responseTime,
        voteTimestamp: Date.now()
      })}]` : undefined

    console.log('🗳️ Vote:', turnId, rating === 1 ? '👍' : '👎')
    
    await bilanVote(turnId, rating, enhancedComment)

    // Log successful vote tracking in debug mode
    if (bilanConfig?.debug) {
      console.info('Vote tracked successfully', {
        turnId,
        rating,
        hasComment: !!comment,
        metadata
      })
    }
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

// Conversation state management
interface ActiveConversation {
  id: string
  userId: string
  startTime: number
  journeyId?: string
  topic?: string
  turnCount: number
}

let activeConversations = new Map<string, ActiveConversation>()

// Memory management constants
const MAX_CONVERSATION_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_JOURNEY_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

// Periodic cleanup for conversations
function cleanupStaleConversations(): void {
  const now = Date.now()
  for (const [id, conv] of activeConversations) {
    if (now - conv.startTime > MAX_CONVERSATION_AGE_MS) {
      activeConversations.delete(id)
    }
  }
}

// Start periodic cleanup
if (typeof window === 'undefined') { // Server-side only
  setInterval(cleanupStaleConversations, CLEANUP_INTERVAL_MS)
}

/**
 * Enhanced conversation start with state management
 * Following .cursorrules conversation lifecycle pattern
 */
export async function startConversation(
  metadata?: {
    journeyId?: string
    topic?: string
    contentType?: 'blog' | 'email' | 'social'
    userIntent?: string
    [key: string]: any
  }
): Promise<string> {
  try {
    if (!isReady() || !currentUserId) {
      return ''
    }

    const conversationId = await bilanStartConversation(currentUserId)
    
    // Track conversation state
    const conversation: ActiveConversation = {
      id: conversationId,
      userId: currentUserId,
      startTime: Date.now(),
      journeyId: metadata?.journeyId,
      topic: metadata?.topic,
      turnCount: 0
    }
    
    activeConversations.set(conversationId, conversation)

    // Track conversation start event with comprehensive metadata
    await track('conversation_started', {
      conversationId,
      journeyId: metadata?.journeyId,
      topic: metadata?.topic,
      contentType: metadata?.contentType,
      userIntent: metadata?.userIntent,
      timestamp: Date.now(),
      ...metadata
    })

    // Log successful conversation start in debug mode
    if (bilanConfig?.debug) {
      console.info('Conversation started successfully', {
        conversationId,
        metadata
      })
    }

    return conversationId
  } catch (error) {
    console.warn('Bilan conversation start failed:', error)
    return ''
  }
}

/**
 * Enhanced conversation end with comprehensive tracking
 * Following .cursorrules conversation lifecycle pattern
 */
export async function endConversation(
  conversationId: string, 
  status: 'completed' | 'abandoned' = 'completed',
  metadata?: {
    satisfactionScore?: number
    outcome?: string
    finalTopic?: string
    [key: string]: any
  }
): Promise<void> {
  try {
    if (!isReady() || !conversationId) {
      return
    }

    // Get conversation state for metrics
    const conversation = activeConversations.get(conversationId)
    const duration = conversation ? Date.now() - conversation.startTime : 0

    await bilanEndConversation(conversationId, status)

    // Track conversation end event with comprehensive metrics
    await track('conversation_ended', {
      conversationId,
      status,
      duration,
      turnCount: conversation?.turnCount || 0,
      journeyId: conversation?.journeyId,
      topic: conversation?.topic || metadata?.finalTopic,
      satisfactionScore: metadata?.satisfactionScore,
      outcome: metadata?.outcome,
      timestamp: Date.now(),
      ...metadata
    })

    // Clean up conversation state
    activeConversations.delete(conversationId)

    // Log successful conversation end in debug mode
    if (bilanConfig?.debug) {
      console.info('Conversation ended successfully', {
        conversationId,
        status,
        duration,
        turnCount: conversation?.turnCount
      })
    }
  } catch (error) {
    console.warn('Bilan conversation end failed:', error)
  }
}

/**
 * Update conversation turn count (called internally by trackTurn)
 */
function incrementConversationTurnCount(conversationId: string): void {
  const conversation = activeConversations.get(conversationId)
  if (conversation) {
    conversation.turnCount++
    activeConversations.set(conversationId, conversation)
  }
}

/**
 * Get active conversation info
 */
export function getActiveConversation(conversationId: string): ActiveConversation | undefined {
  return activeConversations.get(conversationId)
}

// Journey state management following .cursorrules content workflow patterns
interface ActiveJourney {
  id: string
  type: 'blog-creation' | 'email-campaign' | 'social-media'
  userId: string
  startTime: number
  currentStep: string
  completedSteps: string[]
  stepData: Record<string, any>
  conversationIds: string[]
  turnIds: string[]
  status: 'in-progress' | 'completed' | 'abandoned'
}

let activeJourneys = new Map<string, ActiveJourney>()

// Periodic cleanup for journeys
function cleanupStaleJourneys(): void {
  const now = Date.now()
  for (const [id, journey] of activeJourneys) {
    if (now - journey.startTime > MAX_JOURNEY_AGE_MS) {
      activeJourneys.delete(id)
    }
  }
}

// Start periodic cleanup for journeys
if (typeof window === 'undefined') { // Server-side only
  setInterval(cleanupStaleJourneys, CLEANUP_INTERVAL_MS)
}

/**
 * Start a new content creation journey
 * Following .cursorrules journey patterns: Blog, Email, Social workflows
 */
export async function startJourney(
  journeyType: 'blog-creation' | 'email-campaign' | 'social-media',
  metadata?: {
    topic?: string
    userBrief?: string
    contentType?: 'blog' | 'email' | 'social'
    initialConversationId?: string
    [key: string]: any
  }
): Promise<string> {
  try {
    if (!isReady() || !currentUserId) {
      return ''
    }

    const journeyId = `journey_${journeyType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    
    // Define journey steps based on .cursorrules workflow patterns
    const journeySteps = getJourneySteps(journeyType)
    
    // Create journey state
    const journey: ActiveJourney = {
      id: journeyId,
      type: journeyType,
      userId: currentUserId,
      startTime: Date.now(),
      currentStep: journeySteps[0] || 'start',
      completedSteps: [],
      stepData: {},
      conversationIds: metadata?.initialConversationId ? [metadata.initialConversationId] : [],
      turnIds: [],
      status: 'in-progress'
    }
    
    activeJourneys.set(journeyId, journey)

    // Track journey start event
    await track('journey_started', {
      journeyId,
      journeyType,
      topic: metadata?.topic,
      userBrief: metadata?.userBrief,
      contentType: metadata?.contentType,
      initialConversationId: metadata?.initialConversationId,
      totalSteps: journeySteps.length,
      timestamp: Date.now(),
      ...metadata
    })

    // Log successful journey start in debug mode
    if (bilanConfig?.debug) {
      console.info('Journey started successfully', {
        journeyId,
        journeyType,
        steps: journeySteps
      })
    }

    return journeyId
  } catch (error) {
    console.warn('Bilan journey start failed:', error)
    return ''
  }
}

/**
 * Enhanced journey step tracking with progress management
 * Following .cursorrules content creation workflow patterns
 */
export async function trackJourneyStep(
  journeyId: string,
  stepName: string,
  metadata?: {
    stepData?: any
    conversationId?: string
    turnId?: string
    completionStatus?: 'started' | 'completed' | 'skipped'
    [key: string]: any
  }
): Promise<void> {
  try {
    if (!isReady() || !currentUserId || !journeyId) {
      return
    }

    // Get journey state
    const journey = activeJourneys.get(journeyId)
    if (!journey) {
      console.warn('Journey not found:', journeyId)
      return
    }

    // Update journey state
    if (metadata?.completionStatus === 'completed' && !journey.completedSteps.includes(stepName)) {
      journey.completedSteps.push(stepName)
    }
    
    if (metadata?.stepData) {
      journey.stepData[stepName] = metadata.stepData
    }
    
    if (metadata?.conversationId && !journey.conversationIds.includes(metadata.conversationId)) {
      journey.conversationIds.push(metadata.conversationId)
    }
    
    if (metadata?.turnId && !journey.turnIds.includes(metadata.turnId)) {
      journey.turnIds.push(metadata.turnId)
    }

    journey.currentStep = stepName
    activeJourneys.set(journeyId, journey)

    // Track step progression with Bilan SDK
    await bilanTrackJourneyStep(journey.type, stepName, currentUserId)

    // Track detailed step event
    await track('journey_step_tracked', {
      journeyId,
      journeyType: journey.type,
      stepName,
      completionStatus: metadata?.completionStatus || 'started',
      completedSteps: journey.completedSteps.length,
      totalSteps: getJourneySteps(journey.type).length,
      progress: journey.completedSteps.length / getJourneySteps(journey.type).length,
      conversationId: metadata?.conversationId,
      turnId: metadata?.turnId,
      timestamp: Date.now(),
      ...metadata
    })

    // Log successful step tracking in debug mode
    if (bilanConfig?.debug) {
      console.info('Journey step tracked successfully', {
        journeyId,
        stepName,
        progress: `${journey.completedSteps.length}/${getJourneySteps(journey.type).length}`,
        completionStatus: metadata?.completionStatus
      })
    }
  } catch (error) {
    console.warn('Bilan journey step tracking failed:', error)
  }
}

/**
 * End a journey with comprehensive completion tracking
 */
export async function endJourney(
  journeyId: string,
  status: 'completed' | 'abandoned' = 'completed',
  metadata?: {
    finalOutput?: string
    satisfactionScore?: number
    completionTime?: number
    [key: string]: any
  }
): Promise<void> {
  try {
    if (!isReady() || !journeyId) {
      return
    }

    // Get journey state for metrics
    const journey = activeJourneys.get(journeyId)
    if (!journey) {
      console.warn('Journey not found for ending:', journeyId)
      return
    }

    const duration = Date.now() - journey.startTime
    const totalSteps = getJourneySteps(journey.type).length
    const completionRate = journey.completedSteps.length / totalSteps

    // Update journey status
    journey.status = status
    activeJourneys.set(journeyId, journey)

    // Track journey completion event
    await track('journey_ended', {
      journeyId,
      journeyType: journey.type,
      status,
      duration,
      completedSteps: journey.completedSteps.length,
      totalSteps,
      completionRate,
      conversationCount: journey.conversationIds.length,
      turnCount: journey.turnIds.length,
      finalOutput: metadata?.finalOutput,
      satisfactionScore: metadata?.satisfactionScore,
      timestamp: Date.now(),
      ...metadata
    })

    // Clean up journey state
    activeJourneys.delete(journeyId)

    // Log successful journey end in debug mode
    if (bilanConfig?.debug) {
      console.info('Journey ended successfully', {
        journeyId,
        status,
        completionRate,
        duration
      })
    }
  } catch (error) {
    console.warn('Bilan journey end failed:', error)
  }
}

/**
 * Get journey steps based on .cursorrules workflow patterns
 */
function getJourneySteps(journeyType: 'blog-creation' | 'email-campaign' | 'social-media'): string[] {
  switch (journeyType) {
    case 'blog-creation':
      return ['topic-exploration', 'outline-generation', 'section-writing', 'review-polish']
    case 'email-campaign':
      return ['purpose-definition', 'subject-generation', 'body-writing', 'cta-creation']
    case 'social-media':
      return ['goal-setting', 'content-ideation', 'post-creation', 'hashtag-generation']
    default:
      return ['start', 'middle', 'end']
  }
}

/**
 * Get active journey info
 */
export function getActiveJourney(journeyId: string): ActiveJourney | undefined {
  return activeJourneys.get(journeyId)
}

/**
 * Get all active journeys for user
 */
export function getActiveJourneys(): ActiveJourney[] {
  return Array.from(activeJourneys.values()).filter(j => j.userId === currentUserId)
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