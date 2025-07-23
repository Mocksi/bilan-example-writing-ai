/**
 * Content Session Manager
 * 
 * Manages the complete lifecycle of content creation sessions,
 * including session creation, state transitions, persistence, and cleanup.
 */

import type { 
  ContentSession, 
  ContentIteration, 
  ContentType, 
  SessionId, 
  IterationId,
  SessionStatus,
  UserFeedback,
  SessionStats
} from '../types'
import type { MetadataRecord } from '../types/lint-types'
import { 
  generateSessionId, 
  generateIterationId,
  createSessionId,
  isContentSession 
} from '../types'

export interface SessionManagerConfig {
  maxSessionsPerUser?: number
  sessionTimeoutMs?: number
  persistenceKey?: string
  autoCleanupEnabled?: boolean
}

export interface CreateSessionOptions {
  contentType: ContentType
  userBrief: string
  userId?: string
  metadata?: MetadataRecord
}

export interface SessionUpdateOptions {
  status?: SessionStatus
  userBrief?: string
  metadata?: MetadataRecord
}

export interface SessionQuery {
  userId?: string
  contentType?: ContentType
  status?: SessionStatus
  limit?: number
  offset?: number
}

/**
 * Content Session Manager Class
 */
export class ContentSessionManager {
  private sessions = new Map<SessionId, ContentSession>()
  private config: Required<SessionManagerConfig>
  private cleanupInterval?: NodeJS.Timeout

  constructor(config: SessionManagerConfig = {}) {
    this.config = {
      maxSessionsPerUser: config.maxSessionsPerUser ?? 10,
      sessionTimeoutMs: config.sessionTimeoutMs ?? 24 * 60 * 60 * 1000, // 24 hours
      persistenceKey: config.persistenceKey ?? 'bilan-content-sessions',
      autoCleanupEnabled: config.autoCleanupEnabled ?? true
    }

    this.loadPersistedSessions()
    
    if (this.config.autoCleanupEnabled) {
      this.startAutoCleanup()
    }
  }

  /**
   * Create a new content creation session
   */
  async createSession(options: CreateSessionOptions): Promise<ContentSession> {
    const sessionId = generateSessionId()
    const startTime = Date.now()

    const session: ContentSession = {
      id: sessionId,
      contentType: options.contentType,
      userBrief: options.userBrief,
      iterations: [],
      status: 'active',
      startTime,
      endTime: undefined
    }

    // Store session
    this.sessions.set(sessionId, session)
    
    // Persist to storage
    await this.persistSessions()
    
    // Cleanup old sessions if needed
    await this.cleanupExpiredSessions()

    return session
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: SessionId): ContentSession | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * Update session properties
   */
  async updateSession(
    sessionId: SessionId, 
    updates: SessionUpdateOptions
  ): Promise<ContentSession | null> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    // Apply updates
    const updatedSession: ContentSession = {
      ...session,
      ...updates,
      // Handle status transitions
      endTime: updates.status === 'completed' || updates.status === 'abandoned' 
        ? Date.now() 
        : session.endTime
    }

    this.sessions.set(sessionId, updatedSession)
    await this.persistSessions()

    return updatedSession
  }

  /**
   * Add an iteration to a session
   */
  async addIteration(
    sessionId: SessionId, 
    iteration: Omit<ContentIteration, 'id' | 'attemptNumber'>
  ): Promise<ContentIteration | null> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'active') {
      return null
    }

    const iterationWithId: ContentIteration = {
      ...iteration,
      id: generateIterationId(),
      attemptNumber: session.iterations.length + 1
    }

    session.iterations.push(iterationWithId)
    await this.persistSessions()

    return iterationWithId
  }

  /**
   * Update iteration feedback
   */
  async updateIterationFeedback(
    sessionId: SessionId,
    iterationId: IterationId,
    feedback: UserFeedback
  ): Promise<ContentIteration | null> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    const iteration = session.iterations.find(iter => iter.id === iterationId)
    if (!iteration) {
      return null
    }

    // Update feedback and user response time
    iteration.userFeedback = feedback
    iteration.timing.userResponseTime = Date.now()

    await this.persistSessions()
    return iteration
  }

  /**
   * Complete a session
   */
  async completeSession(sessionId: SessionId): Promise<ContentSession | null> {
    return this.updateSession(sessionId, { 
      status: 'completed' 
    })
  }

  /**
   * Abandon a session
   */
  async abandonSession(sessionId: SessionId): Promise<ContentSession | null> {
    return this.updateSession(sessionId, { 
      status: 'abandoned' 
    })
  }

  /**
   * Get sessions by query
   */
  querySessions(query: SessionQuery = {}): ContentSession[] {
    let sessions = Array.from(this.sessions.values())

    // Apply filters
    if (query.contentType) {
      sessions = sessions.filter(s => s.contentType === query.contentType)
    }
    
    if (query.status) {
      sessions = sessions.filter(s => s.status === query.status)
    }

    // Sort by start time (newest first)
    sessions.sort((a, b) => b.startTime - a.startTime)

    // Apply pagination
    if (query.offset) {
      sessions = sessions.slice(query.offset)
    }
    
    if (query.limit) {
      sessions = sessions.slice(0, query.limit)
    }

    return sessions
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): ContentSession[] {
    return this.querySessions({ status: 'active' })
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: SessionId): SessionStats | null {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    const totalIterations = session.iterations.length
    const acceptedIterations = session.iterations.filter(
      iter => iter.userFeedback?.type === 'accept'
    ).length
    const rejectedIterations = session.iterations.filter(
      iter => iter.userFeedback?.type === 'reject'
    ).length

    // Calculate average response time
    const responseTimes = session.iterations
      .map(iter => iter.timing.responseTime - iter.timing.requestTime)
      .filter(time => time > 0)
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

    // Calculate session duration
    const sessionDuration = session.endTime 
      ? session.endTime - session.startTime
      : Date.now() - session.startTime

    // Get most recent feedback
    const iterationsWithFeedback = session.iterations.filter(iter => iter.userFeedback)
    const mostRecentFeedback = iterationsWithFeedback.length > 0
      ? iterationsWithFeedback[iterationsWithFeedback.length - 1].userFeedback
      : undefined

    return {
      totalIterations,
      acceptedIterations,
      rejectedIterations,
      averageResponseTime,
      sessionDuration,
      mostRecentFeedback
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: SessionId): Promise<boolean> {
    const deleted = this.sessions.delete(sessionId)
    if (deleted) {
      await this.persistSessions()
    }
    return deleted
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now()
    const expiredSessions: SessionId[] = []

    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now - session.startTime
      const isExpired = sessionAge > this.config.sessionTimeoutMs
      const isCompleted = session.status === 'completed' || session.status === 'abandoned'
      
      if (isExpired || isCompleted) {
        expiredSessions.push(sessionId)
      }
    }

    // Remove expired sessions
    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId)
    }

    if (expiredSessions.length > 0) {
      await this.persistSessions()
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startAutoCleanup(): void {
    // Clean up every hour
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredSessions(),
      60 * 60 * 1000
    )
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
  }

  /**
   * Persist sessions to storage
   */
  private async persistSessions(): Promise<void> {
    if (typeof window === 'undefined') {
      return // Skip persistence on server side
    }

    try {
      const sessionsData = Array.from(this.sessions.entries())
      localStorage.setItem(
        this.config.persistenceKey,
        JSON.stringify(sessionsData)
      )
    } catch (error) {
      console.warn('Failed to persist sessions:', error)
    }
  }

  /**
   * Load persisted sessions from storage
   */
  private loadPersistedSessions(): void {
    if (typeof window === 'undefined') {
      return // Skip loading on server side
    }

    try {
      const stored = localStorage.getItem(this.config.persistenceKey)
      if (!stored) {
        return
      }

      const sessionsData: [string, unknown][] = JSON.parse(stored)
      
      for (const [sessionIdStr, sessionData] of sessionsData) {
        if (isContentSession(sessionData)) {
          const sessionId = createSessionId(sessionIdStr)
          this.sessions.set(sessionId, sessionData)
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted sessions:', error)
    }
  }

  /**
   * Get total session count
   */
  getSessionCount(): number {
    return this.sessions.size
  }

  /**
   * Clear all sessions
   */
  async clearAllSessions(): Promise<void> {
    this.sessions.clear()
    await this.persistSessions()
  }

  /**
   * Export sessions for backup/analysis
   */
  exportSessions(): ContentSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Import sessions from backup
   */
  async importSessions(sessions: ContentSession[]): Promise<number> {
    let importedCount = 0
    
    for (const session of sessions) {
      if (isContentSession(session)) {
        this.sessions.set(session.id, session)
        importedCount++
      }
    }

    if (importedCount > 0) {
      await this.persistSessions()
    }

    return importedCount
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopAutoCleanup()
    this.sessions.clear()
  }
}

// Export a default instance
export const contentSessionManager = new ContentSessionManager()

/**
 * Convenience functions
 */
export const createContentSession = (options: CreateSessionOptions) =>
  contentSessionManager.createSession(options)

export const getContentSession = (sessionId: SessionId) =>
  contentSessionManager.getSession(sessionId)

export const updateContentSession = (sessionId: SessionId, updates: SessionUpdateOptions) =>
  contentSessionManager.updateSession(sessionId, updates)

export const addContentIteration = (sessionId: SessionId, iteration: Omit<ContentIteration, 'id' | 'attemptNumber'>) =>
  contentSessionManager.addIteration(sessionId, iteration)

export const completeContentSession = (sessionId: SessionId) =>
  contentSessionManager.completeSession(sessionId)

export const getContentSessionStats = (sessionId: SessionId) =>
  contentSessionManager.getSessionStats(sessionId) 