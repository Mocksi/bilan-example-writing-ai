/**
 * Iteration Manager
 * 
 * Handles content iteration versioning, tracks changes between attempts,
 * and manages the iteration workflow for content refinement.
 */

import type { 
  ContentIteration, 
  UserFeedback, 
  ContentType,
  IterationId,
  SessionId,
  TurnId
} from '../types'
import { generateIterationId, generateTurnId } from '../types'

export interface IterationContext {
  sessionId: SessionId
  contentType: ContentType
  userBrief: string
  previousAttempts: ContentIteration[]
  currentIteration?: ContentIteration
}

export interface IterationComparison {
  previousIteration: ContentIteration
  currentIteration: ContentIteration
  changes: {
    contentDiff: ContentDiff[]
    improvementScore: number
    changeTypes: ChangeType[]
    userFeedbackImpact: FeedbackImpact
  }
}

export interface ContentDiff {
  type: 'addition' | 'deletion' | 'modification'
  position: number
  oldText?: string
  newText?: string
  confidence: number
}

export type ChangeType = 
  | 'tone_adjustment' 
  | 'length_change' 
  | 'structure_change' 
  | 'content_addition' 
  | 'content_removal' 
  | 'style_refinement'

export interface FeedbackImpact {
  addressedFeedback: string[]
  remainingIssues: string[]
  improvementAreas: string[]
}

export interface IterationMetrics {
  iterationId: IterationId
  attemptNumber: number
  generationTime: number
  userResponseTime?: number
  contentLength: number
  promptTokens: number
  responseTokens: number
  qualityScore?: number
  userSatisfaction?: number
}

export interface VersionTree {
  rootIteration: ContentIteration
  branches: Map<IterationId, ContentIteration[]>
  currentPath: IterationId[]
  alternatives: Map<IterationId, ContentIteration[]>
}

/**
 * Iteration Manager Class
 */
export class IterationManager {
  private iterationHistory = new Map<SessionId, ContentIteration[]>()
  private versionTrees = new Map<SessionId, VersionTree>()
  private iterationMetrics = new Map<IterationId, IterationMetrics>()

  /**
   * Create a new iteration for a session
   */
  async createIteration(
    context: IterationContext,
    prompt: string,
    generatedContent: string,
    timing: { requestTime: number; responseTime: number }
  ): Promise<ContentIteration> {
    const iterationId = generateIterationId()
    const bilanTurnId = generateTurnId()
    const attemptNumber = (context.previousAttempts?.length || 0) + 1

    const iteration: ContentIteration = {
      id: iterationId,
      attemptNumber,
      prompt,
      generatedContent,
      bilanTurnId,
      timing: {
        requestTime: timing.requestTime,
        responseTime: timing.responseTime
      }
    }

    // Store in history
    const sessionHistory = this.iterationHistory.get(context.sessionId) || []
    sessionHistory.push(iteration)
    this.iterationHistory.set(context.sessionId, sessionHistory)

    // Update version tree
    this.updateVersionTree(context.sessionId, iteration)

    // Calculate metrics
    await this.calculateIterationMetrics(iteration, context)

    return iteration
  }

  /**
   * Add user feedback to an iteration
   */
  async addFeedback(
    sessionId: SessionId,
    iterationId: IterationId,
    feedback: UserFeedback
  ): Promise<ContentIteration | null> {
    const sessionHistory = this.iterationHistory.get(sessionId)
    if (!sessionHistory) {
      return null
    }

    const iteration = sessionHistory.find(iter => iter.id === iterationId)
    if (!iteration) {
      return null
    }

    // Add feedback and timestamp
    iteration.userFeedback = feedback
    iteration.timing.userResponseTime = Date.now()

    // Update metrics based on feedback
    await this.updateMetricsWithFeedback(iteration, feedback)

    return iteration
  }

  /**
   * Get iteration history for a session
   */
  getIterationHistory(sessionId: SessionId): ContentIteration[] {
    return this.iterationHistory.get(sessionId) || []
  }

  /**
   * Get the latest iteration for a session
   */
  getLatestIteration(sessionId: SessionId): ContentIteration | null {
    const history = this.getIterationHistory(sessionId)
    return history.length > 0 ? history[history.length - 1] : null
  }

  /**
   * Compare two iterations
   */
  compareIterations(
    previous: ContentIteration,
    current: ContentIteration
  ): IterationComparison {
    const contentDiff = this.calculateContentDiff(
      previous.generatedContent,
      current.generatedContent
    )

    const improvementScore = this.calculateImprovementScore(previous, current)
    const changeTypes = this.identifyChangeTypes(previous, current, contentDiff)
    const userFeedbackImpact = this.analyzeFeedbackImpact(previous, current)

    return {
      previousIteration: previous,
      currentIteration: current,
      changes: {
        contentDiff,
        improvementScore,
        changeTypes,
        userFeedbackImpact
      }
    }
  }

  /**
   * Get version tree for a session
   */
  getVersionTree(sessionId: SessionId): VersionTree | null {
    return this.versionTrees.get(sessionId) || null
  }

  /**
   * Create an alternative iteration branch
   */
  async createAlternative(
    sessionId: SessionId,
    baseIterationId: IterationId,
    context: IterationContext,
    prompt: string,
    generatedContent: string,
    timing: { requestTime: number; responseTime: number }
  ): Promise<ContentIteration> {
    const iteration = await this.createIteration(context, prompt, generatedContent, timing)
    
    // Add to alternatives in version tree
    const versionTree = this.versionTrees.get(sessionId)
    if (versionTree) {
      const alternatives = versionTree.alternatives.get(baseIterationId) || []
      alternatives.push(iteration)
      versionTree.alternatives.set(baseIterationId, alternatives)
    }

    return iteration
  }

  /**
   * Get metrics for an iteration
   */
  getIterationMetrics(iterationId: IterationId): IterationMetrics | null {
    return this.iterationMetrics.get(iterationId) || null
  }

  /**
   * Get all metrics for a session
   */
  getSessionMetrics(sessionId: SessionId): IterationMetrics[] {
    const history = this.getIterationHistory(sessionId)
    return history
      .map(iter => this.getIterationMetrics(iter.id))
      .filter((metrics): metrics is IterationMetrics => metrics !== null)
  }

  /**
   * Calculate content diff between two texts
   */
  private calculateContentDiff(oldText: string, newText: string): ContentDiff[] {
    const diffs: ContentDiff[] = []
    
    // Simple word-by-word diff algorithm
    const oldWords = oldText.split(/\s+/)
    const newWords = newText.split(/\s+/)
    
    let oldIndex = 0
    let newIndex = 0
    let position = 0

    while (oldIndex < oldWords.length || newIndex < newWords.length) {
      if (oldIndex >= oldWords.length) {
        // Addition at end
        diffs.push({
          type: 'addition',
          position,
          newText: newWords.slice(newIndex).join(' '),
          confidence: 0.9
        })
        break
      }
      
      if (newIndex >= newWords.length) {
        // Deletion at end
        diffs.push({
          type: 'deletion',
          position,
          oldText: oldWords.slice(oldIndex).join(' '),
          confidence: 0.9
        })
        break
      }

      if (oldWords[oldIndex] === newWords[newIndex]) {
        // Words match, move forward
        oldIndex++
        newIndex++
        position++
        continue
      }

      // Look for matching words in a window
      const windowSize = 3
      let foundMatch = false
      
      for (let i = 1; i <= windowSize && !foundMatch; i++) {
        // Check if old word appears later in new text
        if (newIndex + i < newWords.length && oldWords[oldIndex] === newWords[newIndex + i]) {
          // Addition
          diffs.push({
            type: 'addition',
            position,
            newText: newWords.slice(newIndex, newIndex + i).join(' '),
            confidence: 0.8
          })
          newIndex += i
          foundMatch = true
        }
        
        // Check if new word appears later in old text
        if (oldIndex + i < oldWords.length && newWords[newIndex] === oldWords[oldIndex + i]) {
          // Deletion
          diffs.push({
            type: 'deletion',
            position,
            oldText: oldWords.slice(oldIndex, oldIndex + i).join(' '),
            confidence: 0.8
          })
          oldIndex += i
          foundMatch = true
        }
      }

      if (!foundMatch) {
        // Modification
        diffs.push({
          type: 'modification',
          position,
          oldText: oldWords[oldIndex],
          newText: newWords[newIndex],
          confidence: 0.7
        })
        oldIndex++
        newIndex++
      }
      
      position++
    }

    return diffs
  }

  /**
   * Calculate improvement score between iterations
   */
  private calculateImprovementScore(
    previous: ContentIteration,
    current: ContentIteration
  ): number {
    let score = 0.5 // Neutral baseline

    // Factor in user feedback
    if (previous.userFeedback) {
      if (previous.userFeedback.type === 'reject') {
        score += 0.2 // Improvement if previous was rejected
      }
      if (previous.userFeedback.rating === -1) {
        score += 0.1
      }
    }

    // Content length considerations
    const lengthDiff = current.generatedContent.length - previous.generatedContent.length
    const lengthRatio = Math.abs(lengthDiff) / previous.generatedContent.length
    
    if (lengthRatio > 0.5) {
      score += 0.1 // Significant length change might be improvement
    }

    // Response time (faster might indicate better prompting)
    const prevResponseTime = previous.timing.responseTime - previous.timing.requestTime
    const currResponseTime = current.timing.responseTime - current.timing.requestTime
    
    if (currResponseTime < prevResponseTime * 0.8) {
      score += 0.1
    }

    return Math.min(Math.max(score, 0), 1) // Clamp between 0 and 1
  }

  /**
   * Identify types of changes between iterations
   */
  private identifyChangeTypes(
    previous: ContentIteration,
    current: ContentIteration,
    diffs: ContentDiff[]
  ): ChangeType[] {
    const changes: Set<ChangeType> = new Set()

    // Analyze length changes
    const lengthDiff = current.generatedContent.length - previous.generatedContent.length
    const lengthChangeRatio = Math.abs(lengthDiff) / previous.generatedContent.length

    if (lengthChangeRatio > 0.2) {
      changes.add('length_change')
    }

    // Analyze diff patterns
    const additionCount = diffs.filter(d => d.type === 'addition').length
    const deletionCount = diffs.filter(d => d.type === 'deletion').length
    const modificationCount = diffs.filter(d => d.type === 'modification').length

    if (additionCount > deletionCount * 2) {
      changes.add('content_addition')
    }
    
    if (deletionCount > additionCount * 2) {
      changes.add('content_removal')
    }

    if (modificationCount > (additionCount + deletionCount)) {
      changes.add('style_refinement')
    }

    // Check for structural changes (paragraph breaks, bullet points, etc.)
    const prevStructure = this.analyzeTextStructure(previous.generatedContent)
    const currStructure = this.analyzeTextStructure(current.generatedContent)
    
    if (prevStructure.paragraphs !== currStructure.paragraphs ||
        prevStructure.lists !== currStructure.lists) {
      changes.add('structure_change')
    }

    // Analyze tone based on feedback
    if (previous.userFeedback?.refinementRequest) {
      const feedbackLower = previous.userFeedback.refinementRequest.toLowerCase()
      if (feedbackLower.includes('tone') || 
          feedbackLower.includes('formal') || 
          feedbackLower.includes('casual')) {
        changes.add('tone_adjustment')
      }
    }

    return Array.from(changes)
  }

  /**
   * Analyze feedback impact
   */
  private analyzeFeedbackImpact(
    previous: ContentIteration,
    current: ContentIteration
  ): FeedbackImpact {
    const addressedFeedback: string[] = []
    const remainingIssues: string[] = []
    const improvementAreas: string[] = []

    if (previous.userFeedback?.refinementRequest) {
      // Simple keyword analysis
      const feedbackKeywords = previous.userFeedback.refinementRequest
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)

      const currentContentLower = current.generatedContent.toLowerCase()
      
      for (const keyword of feedbackKeywords) {
        if (currentContentLower.includes(keyword)) {
          addressedFeedback.push(keyword)
        } else {
          remainingIssues.push(keyword)
        }
      }
    }

    // Identify potential improvement areas
    if (current.generatedContent.length > previous.generatedContent.length * 1.2) {
      improvementAreas.push('content_expansion')
    }
    
    if (current.generatedContent.length < previous.generatedContent.length * 0.8) {
      improvementAreas.push('content_conciseness')
    }

    return {
      addressedFeedback,
      remainingIssues,
      improvementAreas
    }
  }

  /**
   * Analyze text structure
   */
  private analyzeTextStructure(text: string): { paragraphs: number; lists: number; sentences: number } {
    const paragraphs = text.split(/\n\s*\n/).length
    const lists = (text.match(/^\s*[-*•]\s/gm) || []).length
    const sentences = (text.match(/[.!?]+/g) || []).length

    return { paragraphs, lists, sentences }
  }

  /**
   * Update version tree with new iteration
   */
  private updateVersionTree(sessionId: SessionId, iteration: ContentIteration): void {
    let versionTree = this.versionTrees.get(sessionId)
    
    if (!versionTree) {
      // Create new version tree
      versionTree = {
        rootIteration: iteration,
        branches: new Map(),
        currentPath: [iteration.id],
        alternatives: new Map()
      }
      this.versionTrees.set(sessionId, versionTree)
    } else {
      // Add to current path
      versionTree.currentPath.push(iteration.id)
    }
  }

  /**
   * Calculate iteration metrics
   */
  private async calculateIterationMetrics(
    iteration: ContentIteration,
    context: IterationContext
  ): Promise<void> {
    const generationTime = iteration.timing.responseTime - iteration.timing.requestTime
    const contentLength = iteration.generatedContent.length
    
    // Estimate token counts (rough approximation)
    const promptTokens = Math.ceil(iteration.prompt.length / 4)
    const responseTokens = Math.ceil(contentLength / 4)

    const metrics: IterationMetrics = {
      iterationId: iteration.id,
      attemptNumber: iteration.attemptNumber,
      generationTime,
      contentLength,
      promptTokens,
      responseTokens
    }

    this.iterationMetrics.set(iteration.id, metrics)
  }

  /**
   * Update metrics with user feedback
   */
  private async updateMetricsWithFeedback(
    iteration: ContentIteration,
    feedback: UserFeedback
  ): Promise<void> {
    const metrics = this.iterationMetrics.get(iteration.id)
    if (!metrics) {
      return
    }

    // Calculate user response time
    if (iteration.timing.userResponseTime) {
      metrics.userResponseTime = iteration.timing.userResponseTime - iteration.timing.responseTime
    }

    // Simple satisfaction score based on feedback
    let userSatisfaction = 0.5 // Neutral
    
    if (feedback.type === 'accept') {
      userSatisfaction = 0.8
      if (feedback.acceptanceLevel === 'as_is') {
        userSatisfaction = 1.0
      } else if (feedback.acceptanceLevel === 'inspiration') {
        userSatisfaction = 0.6
      }
    } else if (feedback.type === 'reject') {
      userSatisfaction = 0.2
    } else if (feedback.type === 'refine') {
      userSatisfaction = 0.4
    }

    if (feedback.rating === 1) {
      userSatisfaction += 0.1
    } else if (feedback.rating === -1) {
      userSatisfaction -= 0.1
    }

    metrics.userSatisfaction = Math.min(Math.max(userSatisfaction, 0), 1)
    metrics.qualityScore = metrics.userSatisfaction // Simple quality score

    this.iterationMetrics.set(iteration.id, metrics)
  }

  /**
   * Clear session data
   */
  clearSession(sessionId: SessionId): void {
    this.iterationHistory.delete(sessionId)
    this.versionTrees.delete(sessionId)
    
    // Clean up metrics for this session
    const history = this.iterationHistory.get(sessionId) || []
    for (const iteration of history) {
      this.iterationMetrics.delete(iteration.id)
    }
  }

  /**
   * Get iteration statistics for a session
   */
  getIterationStats(sessionId: SessionId): {
    totalIterations: number
    averageGenerationTime: number
    averageUserResponseTime: number
    improvementTrend: number
    satisfactionTrend: number
  } {
    const metrics = this.getSessionMetrics(sessionId)
    
    if (metrics.length === 0) {
      return {
        totalIterations: 0,
        averageGenerationTime: 0,
        averageUserResponseTime: 0,
        improvementTrend: 0,
        satisfactionTrend: 0
      }
    }

    const totalIterations = metrics.length
    const averageGenerationTime = metrics.reduce((sum, m) => sum + m.generationTime, 0) / totalIterations
    
    const responseTimeMetrics = metrics.filter(m => m.userResponseTime !== undefined)
    const averageUserResponseTime = responseTimeMetrics.length > 0
      ? responseTimeMetrics.reduce((sum, m) => sum + (m.userResponseTime || 0), 0) / responseTimeMetrics.length
      : 0

    // Calculate trends (simple linear trend)
    const satisfactionScores = metrics
      .filter(m => m.userSatisfaction !== undefined)
      .map(m => m.userSatisfaction!)
    
    let satisfactionTrend = 0
    if (satisfactionScores.length > 1) {
      const firstHalf = satisfactionScores.slice(0, Math.floor(satisfactionScores.length / 2))
      const secondHalf = satisfactionScores.slice(Math.floor(satisfactionScores.length / 2))
      
      const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length
      
      satisfactionTrend = secondAvg - firstAvg
    }

    // Simple improvement trend based on satisfaction
    const improvementTrend = satisfactionTrend

    return {
      totalIterations,
      averageGenerationTime,
      averageUserResponseTime,
      improvementTrend,
      satisfactionTrend
    }
  }
}

// Export a default instance
export const iterationManager = new IterationManager()

/**
 * Convenience functions
 */
export const createIteration = (
  context: IterationContext,
  prompt: string,
  generatedContent: string,
  timing: { requestTime: number; responseTime: number }
) => iterationManager.createIteration(context, prompt, generatedContent, timing)

export const addIterationFeedback = (
  sessionId: SessionId,
  iterationId: IterationId,
  feedback: UserFeedback
) => iterationManager.addFeedback(sessionId, iterationId, feedback)

export const getIterationHistory = (sessionId: SessionId) =>
  iterationManager.getIterationHistory(sessionId)

export const compareContentIterations = (
  previous: ContentIteration,
  current: ContentIteration
) => iterationManager.compareIterations(previous, current) 