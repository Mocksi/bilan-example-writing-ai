/**
 * Core data models for the Bilan Content Creation Demo
 * These interfaces match the technical specification exactly
 */

// Base types
export type ContentType = 'blog' | 'email' | 'social'
export type FeedbackType = 'accept' | 'reject' | 'refine'
export type AcceptanceLevel = 'as_is' | 'light_edit' | 'heavy_edit' | 'inspiration'
export type SessionStatus = 'active' | 'completed' | 'abandoned'

/**
 * Content Session - represents a complete content creation session
 */
export interface ContentSession {
  id: string
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
  id: string
  attemptNumber: number
  prompt: string
  generatedContent: string
  userFeedback?: UserFeedback
  bilanTurnId: string
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