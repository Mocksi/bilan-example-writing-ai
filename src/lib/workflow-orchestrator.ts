/**
 * Workflow Orchestrator
 * 
 * Main coordinator for content creation workflows, integrating all business logic
 * components into a cohesive system with high-level API methods.
 */

import type { 
  ContentType, 
  SessionId, 
  IterationId,
  UserFeedback,
  ContentSession,
  ContentIteration,
  SessionStats
} from '../types'
import { 
  contentSessionManager,
  createContentSession,
  getContentSession,
  completeContentSession,
  addContentIteration
} from './content-session-manager'
import { 
  createIteration,
  addIterationFeedback
} from './iteration-manager'
import { 
  processContentRefinement,
  analyzeFeedbackPatterns
} from './refinement-processor'
import { 
  analyzeSessionProgress,
  createSideBySideComparison
} from './content-comparison'
import { 
  exportContentSession,
  createContentSummary,
  type ExportOptions
} from './content-export'
import { generateContentForType } from './ai-client'

export interface WorkflowConfig {
  enableAnalytics?: boolean
  enableComparison?: boolean
  enableExport?: boolean
  maxIterationsPerSession?: number
  autoCompleteThreshold?: number
}

export interface ContentCreationRequest {
  contentType: ContentType
  userBrief: string
  sessionId?: SessionId
  options?: {
    tone?: 'formal' | 'casual' | 'professional' | 'friendly'
    length?: 'short' | 'medium' | 'long'
    temperature?: number
  }
}

export interface ContentRefinementRequest {
  sessionId: SessionId
  iterationId: IterationId
  userFeedback: UserFeedback
}

export interface WorkflowResult {
  success: boolean
  sessionId: SessionId
  iteration: ContentIteration
  metadata: {
    attemptNumber: number
    generationTime: number
    bilanTurnId: string
    sessionStats?: SessionStats
    recommendations?: string[]
  }
}

export interface WorkflowAnalysis {
  sessionProgress: unknown
  feedbackPatterns: unknown
  recommendations: string[]
  qualityTrend: 'improving' | 'declining' | 'stable'
  userSatisfaction: number
}

/**
 * Main Workflow Orchestrator Class
 */
export class WorkflowOrchestrator {
  private config: Required<WorkflowConfig>
  private activeWorkflows = new Map<SessionId, WorkflowState>()

  constructor(config: WorkflowConfig = {}) {
    this.config = {
      enableAnalytics: config.enableAnalytics ?? true,
      enableComparison: config.enableComparison ?? true,
      enableExport: config.enableExport ?? true,
      maxIterationsPerSession: config.maxIterationsPerSession ?? 10,
      autoCompleteThreshold: config.autoCompleteThreshold ?? 0.8
    }
  }

  /**
   * Create new content - main workflow entry point
   */
  async createContent(request: ContentCreationRequest): Promise<WorkflowResult> {
    const startTime = Date.now()

    try {
      // Get or create session
      let session: ContentSession
      if (request.sessionId) {
        const existingSession = getContentSession(request.sessionId)
        if (existingSession) {
          session = existingSession
        } else {
          throw new Error(`Session ${request.sessionId} not found`)
        }
      } else {
        session = await createContentSession({
          contentType: request.contentType,
          userBrief: request.userBrief
        })
      }

      // Check iteration limits
      if (session.iterations.length >= this.config.maxIterationsPerSession) {
        throw new Error(`Maximum iterations (${this.config.maxIterationsPerSession}) reached for session`)
      }

      // Update workflow state
      this.updateWorkflowState(session.id, {
        status: 'generating',
        currentRequest: request,
        lastActivity: Date.now()
      })

      // Generate content using AI
      const generationResponse = await generateContentForType(
        request.contentType,
        request.userBrief,
        {
          temperature: request.options?.temperature,
          maxLength: this.getMaxLengthForType(request.contentType)
        }
      )

      const responseTime = Date.now()

      // Create iteration
      const iteration = await createIteration(
        {
          sessionId: session.id,
          contentType: request.contentType,
          userBrief: request.userBrief,
          previousAttempts: session.iterations
        },
        this.buildPromptFromRequest(request),
        generationResponse.text,
        { requestTime: startTime, responseTime }
      )

      // Update session with new iteration using proper persistence
      await addContentIteration(session.id, {
        prompt: this.buildPromptFromRequest(request),
        generatedContent: iteration.generatedContent,
        bilanTurnId: iteration.bilanTurnId,
        timing: iteration.timing
      })

      // Get session stats for metadata
      const sessionStats = this.config.enableAnalytics 
        ? contentSessionManager.getSessionStats(session.id) || undefined
        : undefined

      // Generate recommendations
      const recommendations = await this.generateRecommendations(session)

      // Update workflow state
      this.updateWorkflowState(session.id, {
        status: 'awaiting_feedback',
        lastIteration: iteration,
        lastActivity: Date.now()
      })

      return {
        success: true,
        sessionId: session.id,
        iteration,
        metadata: {
          attemptNumber: iteration.attemptNumber,
          generationTime: responseTime - startTime,
          bilanTurnId: iteration.bilanTurnId,
          sessionStats,
          recommendations
        }
      }

    } catch (error) {
      // Only update workflow state if sessionId exists
      if (request.sessionId) {
        this.updateWorkflowState(request.sessionId, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastActivity: Date.now()
        })
      }

      throw error
    }
  }

  /**
   * Refine existing content based on user feedback
   */
  async refineContent(request: ContentRefinementRequest): Promise<WorkflowResult> {
    const startTime = Date.now()

    try {
      // Get session
      const session = getContentSession(request.sessionId)
      if (!session) {
        throw new Error(`Session ${request.sessionId} not found`)
      }

      // Find iteration to refine
      const iterationToRefine = session.iterations.find(iter => iter.id === request.iterationId)
      if (!iterationToRefine) {
        throw new Error(`Iteration ${request.iterationId} not found`)
      }

      // Update workflow state
      this.updateWorkflowState(request.sessionId, {
        status: 'refining',
        currentRequest: request,
        lastActivity: Date.now()
      })

      // Add feedback to iteration
      await addIterationFeedback(request.sessionId, request.iterationId, request.userFeedback)

      let result: WorkflowResult

      // Handle different feedback types
      if (request.userFeedback.type === 'accept') {
        // Content accepted - complete session
        await completeContentSession(request.sessionId)
        
        result = {
          success: true,
          sessionId: request.sessionId,
          iteration: iterationToRefine,
          metadata: {
            attemptNumber: iterationToRefine.attemptNumber,
            generationTime: 0,
            bilanTurnId: iterationToRefine.bilanTurnId,
            recommendations: ['Content accepted - session completed']
          }
        }

        this.updateWorkflowState(request.sessionId, {
          status: 'completed',
          lastActivity: Date.now()
        })

      } else {
        // Process refinement
        const refinementResponse = await processContentRefinement({
          sessionId: request.sessionId,
          iterationId: request.iterationId,
          userFeedback: request.userFeedback,
          contentType: session.contentType,
          userBrief: session.userBrief,
          previousIterations: session.iterations
        })

        const responseTime = Date.now()

        // Add refined iteration to session
        session.iterations.push(refinementResponse.iteration)

        // Generate recommendations
        const recommendations = await this.generateRecommendations(session)

        result = {
          success: true,
          sessionId: request.sessionId,
          iteration: refinementResponse.iteration,
          metadata: {
            attemptNumber: refinementResponse.iteration.attemptNumber,
            generationTime: responseTime - startTime,
            bilanTurnId: refinementResponse.iteration.bilanTurnId,
            recommendations
          }
        }

        this.updateWorkflowState(request.sessionId, {
          status: 'awaiting_feedback',
          lastIteration: refinementResponse.iteration,
          lastActivity: Date.now()
        })
      }

      // Check for auto-completion
      await this.checkAutoCompletion(request.sessionId)

      return result

    } catch (error) {
      this.updateWorkflowState(request.sessionId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastActivity: Date.now()
      })

      throw error
    }
  }

  /**
   * Get comprehensive analysis of a workflow session
   */
  async analyzeWorkflow(sessionId: SessionId): Promise<WorkflowAnalysis> {
    const session = getContentSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    // Get session progress analysis
    const sessionProgress = this.config.enableAnalytics
      ? await analyzeSessionProgress(sessionId, session.iterations)
      : null

    // Analyze feedback patterns
    const feedbackPatterns = await analyzeFeedbackPatterns(sessionId)

    // Generate quality trend
    let qualityTrend: 'improving' | 'declining' | 'stable' = 'stable'
    if (sessionProgress && sessionProgress.qualityProgression && sessionProgress.qualityProgression.length > 1) {
      const recent = sessionProgress.qualityProgression.slice(-2)
      const trend = recent[1].overallScore - recent[0].overallScore
      
      if (trend > 0.1) qualityTrend = 'improving'
      else if (trend < -0.1) qualityTrend = 'declining'
    }

    // Calculate user satisfaction
    const userSatisfaction = this.calculateUserSatisfaction(session.iterations)

    // Generate recommendations
    const recommendations = await this.generateRecommendations(session)

    return {
      sessionProgress,
      feedbackPatterns,
      recommendations,
      qualityTrend,
      userSatisfaction
    }
  }

  /**
   * Export workflow session in various formats
   */
  async exportWorkflow(sessionId: SessionId, options: Partial<ExportOptions> = {}) {
    if (!this.config.enableExport) {
      throw new Error('Export functionality is disabled')
    }

    const session = getContentSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const exportOptions: ExportOptions = {
      format: 'markdown',
      template: 'standard',
      includeMetadata: true,
      includeHistory: false,
      includeAnalytics: false,
      ...options
    }
    
    return exportContentSession(session, exportOptions)
  }

  /**
   * Get workflow summary
   */
  async getWorkflowSummary(sessionId: SessionId) {
    const session = getContentSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    return createContentSummary(session)
  }

  /**
   * Compare different iterations within a session
   */
  async compareIterations(sessionId: SessionId, iterationIds?: IterationId[]) {
    if (!this.config.enableComparison) {
      throw new Error('Comparison functionality is disabled')
    }

    const session = getContentSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    let iterationsToCompare = session.iterations
    if (iterationIds) {
      iterationsToCompare = session.iterations.filter(iter => 
        iterationIds.includes(iter.id)
      )
    }

    return createSideBySideComparison(iterationsToCompare)
  }

  /**
   * Get current workflow status
   */
  getWorkflowStatus(sessionId: SessionId): WorkflowState | null {
    return this.activeWorkflows.get(sessionId) || null
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows(): Array<{ sessionId: SessionId; state: WorkflowState }> {
    return Array.from(this.activeWorkflows.entries()).map(([sessionId, state]) => ({
      sessionId,
      state
    }))
  }

  /**
   * Clean up completed or abandoned workflows
   */
  cleanupWorkflows(): void {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    for (const [sessionId, state] of this.activeWorkflows.entries()) {
      if (now - state.lastActivity > maxAge || 
          state.status === 'completed' || 
          state.status === 'error') {
        this.activeWorkflows.delete(sessionId)
      }
    }
  }

  /**
   * Private helper methods
   */
  private updateWorkflowState(sessionId: SessionId, updates: Partial<WorkflowState>): void {
    const current = this.activeWorkflows.get(sessionId) || {
      status: 'idle',
      lastActivity: Date.now()
    }

    this.activeWorkflows.set(sessionId, {
      ...current,
      ...updates
    })
  }

  private buildPromptFromRequest(request: ContentCreationRequest): string {
    let prompt = request.userBrief

    if (request.options?.tone) {
      prompt += ` (Use a ${request.options.tone} tone)`
    }

    if (request.options?.length) {
      prompt += ` (Make it ${request.options.length} length)`
    }

    return prompt
  }

  private getMaxLengthForType(contentType: ContentType): number {
    const lengths = {
      blog: 400,
      email: 200,
      social: 100
    }
    return lengths[contentType] || 200
  }

  private async generateRecommendations(session: ContentSession): Promise<string[]> {
    const recommendations: string[] = []

    // Basic recommendations based on iteration count
    if (session.iterations.length === 1) {
      recommendations.push('Try providing specific feedback to refine the content')
    } else if (session.iterations.length >= 3) {
      recommendations.push('Consider accepting current content or starting fresh')
    }

    // Analyze recent feedback
    const recentIteration = session.iterations[session.iterations.length - 1]
    if (recentIteration.userFeedback) {
      if (recentIteration.userFeedback.type === 'reject') {
        recommendations.push('Try providing more specific refinement guidance')
      } else if (recentIteration.userFeedback.type === 'refine') {
        recommendations.push('Content is improving - continue with refinements')
      }
    }

    return recommendations
  }

  private calculateUserSatisfaction(iterations: ContentIteration[]): number {
    const feedbacks = iterations
      .map(iter => iter.userFeedback)
      .filter((feedback): feedback is NonNullable<typeof feedback> => feedback !== undefined)

    if (feedbacks.length === 0) return 0.5

    let totalScore = 0
    for (const feedback of feedbacks) {
      let score = 0.5

      if (feedback.type === 'accept') score = 0.9
      else if (feedback.type === 'reject') score = 0.1
      else if (feedback.type === 'refine') score = 0.5

      if (feedback.rating === 1) score += 0.1
      else if (feedback.rating === -1) score -= 0.1

      totalScore += Math.min(Math.max(score, 0), 1)
    }

    return totalScore / feedbacks.length
  }

  private async checkAutoCompletion(sessionId: SessionId): Promise<void> {
    const session = getContentSession(sessionId)
    if (!session) return

    const satisfaction = this.calculateUserSatisfaction(session.iterations)
    
    if (satisfaction >= this.config.autoCompleteThreshold && 
        session.iterations.length >= 2) {
      // Auto-complete session if satisfaction is high
      await completeContentSession(sessionId)
      
      this.updateWorkflowState(sessionId, {
        status: 'completed',
        lastActivity: Date.now()
      })
    }
  }
}

interface WorkflowState {
  status: 'idle' | 'generating' | 'refining' | 'awaiting_feedback' | 'completed' | 'error'
  lastActivity: number
  currentRequest?: unknown
  lastIteration?: ContentIteration
  error?: string
}

// Export a default instance
export const workflowOrchestrator = new WorkflowOrchestrator()

/**
 * Convenience functions for high-level workflow operations
 */
export const createContentWorkflow = (request: ContentCreationRequest) =>
  workflowOrchestrator.createContent(request)

export const refineContentWorkflow = (request: ContentRefinementRequest) =>
  workflowOrchestrator.refineContent(request)

export const analyzeContentWorkflow = (sessionId: SessionId) =>
  workflowOrchestrator.analyzeWorkflow(sessionId)

export const exportContentWorkflow = (sessionId: SessionId, options?: Partial<ExportOptions>) =>
  workflowOrchestrator.exportWorkflow(sessionId, options)

export const getWorkflowSummary = (sessionId: SessionId) =>
  workflowOrchestrator.getWorkflowSummary(sessionId) 