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
export const generateSessionId = (): SessionId => createSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
export const generateIterationId = (): IterationId => createIterationId(`iter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
export const generateTurnId = (): TurnId => createTurnId(`turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

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
  [key: string]: any
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
  metadata?: Record<string, any>
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
export const isContentType = (value: any): value is ContentType => {
  return typeof value === 'string' && ['blog', 'email', 'social'].includes(value)
}

export const isFeedbackType = (value: any): value is FeedbackType => {
  return typeof value === 'string' && ['accept', 'reject', 'refine'].includes(value)
}

export const isAcceptanceLevel = (value: any): value is AcceptanceLevel => {
  return typeof value === 'string' && ['as_is', 'light_edit', 'heavy_edit', 'inspiration'].includes(value)
}

export const isSessionStatus = (value: any): value is SessionStatus => {
  return typeof value === 'string' && ['active', 'completed', 'abandoned'].includes(value)
}

export const isUserFeedback = (value: any): value is UserFeedback => {
  return (
    typeof value === 'object' &&
    value !== null &&
    isFeedbackType(value.type) &&
    (value.rating === undefined || value.rating === 1 || value.rating === -1) &&
    (value.refinementRequest === undefined || typeof value.refinementRequest === 'string') &&
    (value.quickFeedback === undefined || Array.isArray(value.quickFeedback)) &&
    (value.acceptanceLevel === undefined || isAcceptanceLevel(value.acceptanceLevel))
  )
}

export const isContentIteration = (value: any): value is ContentIteration => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.attemptNumber === 'number' &&
    typeof value.prompt === 'string' &&
    typeof value.generatedContent === 'string' &&
    typeof value.bilanTurnId === 'string' &&
    (value.userFeedback === undefined || isUserFeedback(value.userFeedback)) &&
    typeof value.timing === 'object' &&
    typeof value.timing.requestTime === 'number' &&
    typeof value.timing.responseTime === 'number' &&
    (value.timing.userResponseTime === undefined || typeof value.timing.userResponseTime === 'number')
  )
}

export const isContentSession = (value: any): value is ContentSession => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    isContentType(value.contentType) &&
    typeof value.userBrief === 'string' &&
    Array.isArray(value.iterations) &&
    value.iterations.every(isContentIteration) &&
    isSessionStatus(value.status) &&
    typeof value.startTime === 'number' &&
    (value.endTime === undefined || typeof value.endTime === 'number')
  )
} 