/**
 * Core data models for the Bilan Content Creation Demo
 * These interfaces match the technical specification exactly
 */

// Branded types for better type safety and preventing ID confusion
export type SessionId = string & { __brand: 'SessionId' }
export type IterationId = string & { __brand: 'IterationId' }
export type UserId = string & { __brand: 'UserId' }
export type ConversationId = string & { __brand: 'ConversationId' }
export type TurnId = string & { __brand: 'TurnId' }

// Base types
export type ContentType = 'blog' | 'email' | 'social'
export type FeedbackType = 'accept' | 'reject' | 'refine'
export type AcceptanceLevel = 'as_is' | 'light_edit' | 'heavy_edit' | 'inspiration'
export type SessionStatus = 'active' | 'completed' | 'abandoned'

/**
 * Content Session - represents a complete content creation session
 */
export interface ContentSession {
  id: SessionId
  contentType: ContentType
  userBrief: string
  iterations: ContentIteration[]
  status: SessionStatus
  startTime: number
  endTime?: number
  metadata?: Record<string, unknown>
}

/**
 * Content Iteration - represents a single attempt at content generation
 */
export interface ContentIteration {
  id: IterationId
  attemptNumber: number
  prompt: string
  generatedContent: string
  userFeedback?: UserFeedback
  bilanTurnId: TurnId
  timing: {
    requestTime: number
    responseTime: number
    userResponseTime?: number
  }
}

/**
 * User Feedback - captures user response to generated content
 */
export interface UserFeedback {
  type: FeedbackType
  rating?: 1 | -1
  refinementRequest?: string
  quickFeedback?: string[]
  acceptanceLevel?: AcceptanceLevel
}

/**
 * Content Type Configuration - defines settings for each content type
 */
export interface ContentTypeConfig {
  id: ContentType
  name: string
  description: string
  placeholder: string
  icon: string
  examples: string[]
  maxLength?: number
  suggestedPrompts: string[]
}

/**
 * Session Statistics - runtime statistics for the current session
 */
export interface SessionStats {
  totalIterations: number
  acceptedIterations: number
  rejectedIterations: number
  averageResponseTime: number
  sessionDuration: number
  mostRecentFeedback?: UserFeedback
}

/**
 * Type creation utilities for branded types
 */
export const createSessionId = (id: string): SessionId => id as SessionId
export const createIterationId = (id: string): IterationId => id as IterationId
export const createUserId = (id: string): UserId => id as UserId
export const createConversationId = (id: string): ConversationId => id as ConversationId
export const createTurnId = (id: string): TurnId => id as TurnId

/**
 * ID generation utilities
 */
export const generateSessionId = (): SessionId => createSessionId(`session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`)
export const generateIterationId = (): IterationId => createIterationId(`iter_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`)
export const generateTurnId = (): TurnId => createTurnId(`turn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`)

/**
 * Bilan Event Metadata - rich context data sent with analytics events
 */
export interface BilanEventMetadata {
  // Content context
  contentType: ContentType
  iterationNumber: number
  sessionId: SessionId
  
  // User feedback context
  userFeedback?: string
  refinementType?: 'tone' | 'length' | 'topic' | 'style' | 'other'
  
  // Timing context
  sessionDuration: number
  responseTime: number
  userResponseTime?: number
  
  // Workflow context
  previousAttempts: number
  acceptanceLevel?: AcceptanceLevel
  
  // System context
  modelUsed?: string
  systemPromptVersion?: string
  
  // Custom properties
  [key: string]: unknown
}

/**
 * Analytics Event Types - standard event taxonomy for Bilan
 */
export type AnalyticsEventType = 
  | 'session_started'
  | 'content_generated'
  | 'user_feedback_provided'
  | 'content_accepted'
  | 'content_rejected'
  | 'refinement_requested'
  | 'session_completed'
  | 'session_abandoned'
  | 'frustration_detected'

/**
 * Analytics Event - structure for events sent to Bilan
 */
export interface AnalyticsEvent {
  eventType: AnalyticsEventType
  timestamp: number
  userId: UserId
  sessionId: SessionId
  turnId?: TurnId
  conversationId?: ConversationId
  metadata: BilanEventMetadata
}

/**
 * Journey Step - represents progress through content creation workflow
 */
export interface JourneyStep {
  stepName: string
  completedAt: number
  metadata?: Record<string, unknown>
}

/**
 * User Journey - complete workflow tracking
 */
export interface UserJourney {
  journeyId: string
  journeyName: 'content-creation-workflow'
  userId: UserId
  sessionId: SessionId
  steps: JourneyStep[]
  startedAt: number
  completedAt?: number
  status: 'in_progress' | 'completed' | 'abandoned'
}

/**
 * Type guard functions for runtime type validation
 */
export const isContentType = (value: unknown): value is ContentType => {
  return typeof value === 'string' && ['blog', 'email', 'social'].includes(value)
}

export const isFeedbackType = (value: unknown): value is FeedbackType => {
  return typeof value === 'string' && ['accept', 'reject', 'refine'].includes(value)
}

export const isAcceptanceLevel = (value: unknown): value is AcceptanceLevel => {
  return typeof value === 'string' && ['as_is', 'light_edit', 'heavy_edit', 'inspiration'].includes(value)
}

export const isSessionStatus = (value: unknown): value is SessionStatus => {
  return typeof value === 'string' && ['active', 'completed', 'abandoned'].includes(value)
}

export const isUserFeedback = (value: unknown): value is UserFeedback => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    isFeedbackType((value as Record<string, unknown>).type)
  )
}

export const isContentIteration = (value: unknown): value is ContentIteration => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'attemptNumber' in value &&
    'prompt' in value &&
    'generatedContent' in value &&
    'bilanTurnId' in value &&
    'timing' in value
  )
}

export const isContentSession = (value: unknown): value is ContentSession => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'contentType' in value &&
    'userBrief' in value &&
    'iterations' in value &&
    'status' in value &&
    'startTime' in value &&
    isContentType((value as Record<string, unknown>).contentType) &&
    isSessionStatus((value as Record<string, unknown>).status) &&
    Array.isArray((value as Record<string, unknown>).iterations)
  )
} 