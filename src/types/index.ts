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