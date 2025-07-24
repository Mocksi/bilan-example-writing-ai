/**
 * Refinement Processor
 * 
 * Processes user feedback to generate improved content iterations,
 * with context accumulation and intelligent refinement strategies.
 */

import type { 
  ContentIteration, 
  UserFeedback, 
  ContentType,
  SessionId,
  IterationId
} from '../types'
import { generateContentForType } from './ai-client'
import { buildRefinementPrompt, type PromptContext } from './prompts'
import { iterationManager, type IterationContext } from './iteration-manager'

export interface RefinementRequest {
  sessionId: SessionId
  iterationId: IterationId
  userFeedback: UserFeedback
  contentType: ContentType
  userBrief: string
  previousIterations: ContentIteration[]
}

export interface RefinementContext {
  originalContent: string
  feedbackHistory: UserFeedback[]
  iterationCount: number
  successfulPatterns: string[]
  failurePatterns: string[]
  userPreferences: UserPreferences
}

export interface UserPreferences {
  preferredTone?: 'formal' | 'casual' | 'professional' | 'friendly'
  preferredLength?: 'short' | 'medium' | 'long'
  stylePreferences: string[]
  avoidedPatterns: string[]
  acceptedPatterns: string[]
}

export interface RefinementStrategy {
  type: RefinementStrategyType
  description: string
  promptModifications: string[]
  contextWeight: number
  successProbability: number
}

export type RefinementStrategyType = 
  | 'tone_adjustment'
  | 'length_modification'
  | 'structure_reorganization'
  | 'content_expansion'
  | 'content_condensation'
  | 'style_refinement'
  | 'topic_refocus'
  | 'format_change'

export interface RefinementResult {
  iteration: ContentIteration
  strategy: RefinementStrategy
  contextUsed: string[]
  improvementHypothesis: string
  confidenceScore: number
}

export interface ProcessingMetrics {
  processingTime: number
  strategyEffectiveness: Map<RefinementStrategyType, number>
  userSatisfactionTrend: number[]
  contextAccuracyScore: number
}

/**
 * Refinement Processor Class
 */
export class RefinementProcessor {
  private userPreferencesCache = new Map<SessionId, UserPreferences>()
  private strategySuccessRates = new Map<RefinementStrategyType, number>()
  private processingMetrics = new Map<SessionId, ProcessingMetrics>()

  constructor() {
    // Initialize default strategy success rates
    this.initializeStrategyRates()
  }

  /**
   * Process a refinement request to generate improved content
   */
  async processRefinement(request: RefinementRequest): Promise<RefinementResult> {
    const startTime = Date.now()

    // Build refinement context
    const context = this.buildRefinementContext(request)
    
    // Select optimal refinement strategy
    const strategy = this.selectRefinementStrategy(request, context)
    
    // Generate refined content
    const refinedIteration = await this.generateRefinedContent(request, context, strategy)
    
    // Update user preferences based on feedback
    this.updateUserPreferences(request.sessionId, request.userFeedback, strategy)
    
    // Update strategy effectiveness
    this.updateStrategyMetrics(request.sessionId, strategy, startTime)

    const confidenceScore = this.calculateConfidenceScore(strategy, context)

    return {
      iteration: refinedIteration,
      strategy,
      contextUsed: this.getContextSources(context),
      improvementHypothesis: this.generateImprovementHypothesis(strategy, context),
      confidenceScore
    }
  }

  /**
   * Process multiple refinement alternatives
   */
  async processRefinementAlternatives(
    request: RefinementRequest,
    alternativeCount: number = 2
  ): Promise<RefinementResult[]> {
    const context = this.buildRefinementContext(request)
    const strategies = this.selectMultipleStrategies(request, context, alternativeCount)
    
    const results: RefinementResult[] = []
    
    for (const _strategy of strategies) {
      try {
        const result = await this.processRefinement({
          ...request,
          // Add slight variation to avoid identical outputs
          userFeedback: {
            ...request.userFeedback,
            refinementRequest: `${request.userFeedback.refinementRequest} (approach ${results.length + 1})`
          }
        })
        results.push(result)
      } catch (error) {
        console.warn(`Failed to generate refinement alternative ${results.length + 1}:`, error)
      }
    }

    return results
  }

  /**
   * Analyze feedback patterns to improve future refinements
   */
  analyzeFeedbackPatterns(sessionId: SessionId): {
    dominantFeedbackTypes: string[]
    preferenceSignals: UserPreferences
    improvementSuggestions: string[]
  } {
    const iterations = iterationManager.getIterationHistory(sessionId)
    const feedbackHistory = iterations
      .map(iter => iter.userFeedback)
      .filter((feedback): feedback is UserFeedback => feedback !== undefined)

    // Analyze dominant feedback types
    const feedbackTypeCounts = new Map<string, number>()
    const refinementRequests: string[] = []

    for (const feedback of feedbackHistory) {
      feedbackTypeCounts.set(feedback.type, (feedbackTypeCounts.get(feedback.type) || 0) + 1)
      
      if (feedback.refinementRequest) {
        refinementRequests.push(feedback.refinementRequest)
      }
      
      if (feedback.quickFeedback) {
        for (const quick of feedback.quickFeedback) {
          feedbackTypeCounts.set(quick, (feedbackTypeCounts.get(quick) || 0) + 1)
        }
      }
    }

    const dominantFeedbackTypes = Array.from(feedbackTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type)

    // Extract preference signals
    const preferenceSignals = this.extractPreferenceSignals(refinementRequests)
    
    // Generate improvement suggestions
    const improvementSuggestions = this.generateImprovementSuggestions(
      dominantFeedbackTypes,
      preferenceSignals
    )

    return {
      dominantFeedbackTypes,
      preferenceSignals,
      improvementSuggestions
    }
  }

  /**
   * Get processing metrics for a session
   */
  getProcessingMetrics(sessionId: SessionId): ProcessingMetrics | null {
    return this.processingMetrics.get(sessionId) || null
  }

  /**
   * Build refinement context from request and history
   */
  private buildRefinementContext(request: RefinementRequest): RefinementContext {
    const currentIteration = request.previousIterations.find(iter => iter.id === request.iterationId)
    const originalContent = currentIteration?.generatedContent || ''
    
    const feedbackHistory = request.previousIterations
      .map(iter => iter.userFeedback)
      .filter((feedback): feedback is UserFeedback => feedback !== undefined)

    const userPreferences = this.getUserPreferences(request.sessionId)
    
    // Analyze patterns
    const successfulPatterns = this.extractSuccessfulPatterns(request.previousIterations)
    const failurePatterns = this.extractFailurePatterns(request.previousIterations)

    return {
      originalContent,
      feedbackHistory,
      iterationCount: request.previousIterations.length,
      successfulPatterns,
      failurePatterns,
      userPreferences
    }
  }

  /**
   * Select the most appropriate refinement strategy
   */
  private selectRefinementStrategy(
    request: RefinementRequest,
    context: RefinementContext
  ): RefinementStrategy {
    const availableStrategies = this.getAvailableStrategies(request, context)
    
    // Score strategies based on context and success rates
    const scoredStrategies = availableStrategies.map(strategy => ({
      strategy,
      score: this.scoreStrategy(strategy, context, request)
    }))

    // Select the highest scoring strategy
    scoredStrategies.sort((a, b) => b.score - a.score)
    
    return scoredStrategies[0]?.strategy || this.getDefaultStrategy(request)
  }

  /**
   * Select multiple strategies for alternatives
   */
  private selectMultipleStrategies(
    request: RefinementRequest,
    context: RefinementContext,
    count: number
  ): RefinementStrategy[] {
    const availableStrategies = this.getAvailableStrategies(request, context)
    
    const scoredStrategies = availableStrategies.map(strategy => ({
      strategy,
      score: this.scoreStrategy(strategy, context, request)
    }))

    scoredStrategies.sort((a, b) => b.score - a.score)
    
    return scoredStrategies.slice(0, count).map(item => item.strategy)
  }

  /**
   * Generate refined content using the selected strategy
   */
  private async generateRefinedContent(
    request: RefinementRequest,
    context: RefinementContext,
    strategy: RefinementStrategy
  ): Promise<ContentIteration> {
    const requestTime = Date.now()
    
    // Build enhanced prompt with strategy-specific modifications
    const enhancedPrompt = this.buildEnhancedPrompt(request, context, strategy)
    
    // Generate content using AI client
    const response = await generateContentForType(
      request.contentType,
      enhancedPrompt,
      {
        temperature: this.getTemperatureForStrategy(strategy),
        maxLength: this.getMaxLengthForStrategy(strategy, request.contentType)
      }
    )

    const responseTime = Date.now()

    // Create iteration context
    const iterationContext: IterationContext = {
      sessionId: request.sessionId,
      contentType: request.contentType,
      userBrief: request.userBrief,
      previousAttempts: request.previousIterations
    }

    // Create the refined iteration
    const refinedIteration = await iterationManager.createIteration(
      iterationContext,
      enhancedPrompt,
      response.text,
      { requestTime, responseTime }
    )

    return refinedIteration
  }

  /**
   * Build enhanced prompt with strategy-specific modifications
   */
  private buildEnhancedPrompt(
    request: RefinementRequest,
    context: RefinementContext,
    strategy: RefinementStrategy
  ): string {
    const basePromptContext: PromptContext = {
      contentType: request.contentType,
      userBrief: request.userBrief,
      previousAttempts: request.previousIterations.map(iter => ({
        content: iter.generatedContent,
        feedback: iter.userFeedback?.refinementRequest,
        rating: iter.userFeedback?.rating
      })),
      refinementRequest: request.userFeedback.refinementRequest
    }

    // Apply strategy-specific enhancements
    if (strategy.type === 'tone_adjustment' && context.userPreferences.preferredTone) {
      basePromptContext.tone = context.userPreferences.preferredTone
    }

    if (strategy.type === 'length_modification' && context.userPreferences.preferredLength) {
      basePromptContext.length = context.userPreferences.preferredLength
    }

    const promptResult = buildRefinementPrompt(
      context.originalContent,
      request.userFeedback.refinementRequest || 'Please improve this content',
      request.contentType,
      basePromptContext
    )

    // Add strategy-specific modifications
    let enhancedPrompt = promptResult.fullPrompt
    
    for (const modification of strategy.promptModifications) {
      enhancedPrompt += `\n\n${modification}`
    }

    // Add successful patterns from context
    if (context.successfulPatterns.length > 0) {
      enhancedPrompt += `\n\nPlease incorporate these successful elements from previous attempts: ${context.successfulPatterns.join(', ')}`
    }

    // Add patterns to avoid
    if (context.failurePatterns.length > 0) {
      enhancedPrompt += `\n\nPlease avoid these elements that received negative feedback: ${context.failurePatterns.join(', ')}`
    }

    return enhancedPrompt
  }

  /**
   * Get available refinement strategies for the request
   */
  private getAvailableStrategies(
    request: RefinementRequest,
    context: RefinementContext
  ): RefinementStrategy[] {
    const strategies: RefinementStrategy[] = []

    // Tone adjustment strategy
    if (this.shouldUseToneAdjustment(request, context)) {
      strategies.push({
        type: 'tone_adjustment',
        description: 'Adjust the tone and style of the content',
        promptModifications: [
          'Focus on adjusting the tone to better match user preferences',
          'Maintain the core message while changing the communication style'
        ],
        contextWeight: 0.8,
        successProbability: this.strategySuccessRates.get('tone_adjustment') || 0.7
      })
    }

    // Length modification strategy
    if (this.shouldUseLengthModification(request, context)) {
      const isExpansion = this.shouldExpandContent(request)
      strategies.push({
        type: 'length_modification',
        description: isExpansion ? 'Expand content with more details' : 'Condense content for brevity',
        promptModifications: [
          isExpansion 
            ? 'Expand the content with more details, examples, and explanations'
            : 'Condense the content while preserving key information and impact'
        ],
        contextWeight: 0.6,
        successProbability: this.strategySuccessRates.get('length_modification') || 0.6
      })
    }

    // Structure reorganization strategy
    if (this.shouldUseStructureReorganization(request, context)) {
      strategies.push({
        type: 'structure_reorganization',
        description: 'Reorganize content structure and flow',
        promptModifications: [
          'Reorganize the content structure for better flow and readability',
          'Use clear headings, bullet points, or numbered lists where appropriate'
        ],
        contextWeight: 0.7,
        successProbability: this.strategySuccessRates.get('structure_reorganization') || 0.65
      })
    }

    // Style refinement strategy
    strategies.push({
      type: 'style_refinement',
      description: 'Refine writing style and word choice',
      promptModifications: [
        'Refine the writing style with better word choices and sentence flow',
        'Ensure consistency in voice and style throughout'
      ],
      contextWeight: 0.5,
      successProbability: this.strategySuccessRates.get('style_refinement') || 0.7
    })

    return strategies
  }

  /**
   * Score a strategy based on context and success probability
   */
  private scoreStrategy(
    strategy: RefinementStrategy,
    context: RefinementContext,
    request: RefinementRequest
  ): number {
    let score = strategy.successProbability

    // Boost score based on context weight
    score *= strategy.contextWeight

    // Analyze feedback for strategy relevance
    const feedbackText = (request.userFeedback.refinementRequest || '').toLowerCase()
    
    if (strategy.type === 'tone_adjustment' && 
        (feedbackText.includes('tone') || feedbackText.includes('formal') || feedbackText.includes('casual'))) {
      score += 0.2
    }

    if (strategy.type === 'length_modification' && 
        (feedbackText.includes('longer') || feedbackText.includes('shorter') || feedbackText.includes('brief'))) {
      score += 0.2
    }

    if (strategy.type === 'structure_reorganization' && 
        (feedbackText.includes('structure') || feedbackText.includes('organize') || feedbackText.includes('flow'))) {
      score += 0.2
    }

    // Penalty for recently unsuccessful strategies
    if (context.failurePatterns.some(pattern => pattern.includes(strategy.type))) {
      score -= 0.1
    }

    // Boost for previously successful strategies
    if (context.successfulPatterns.some(pattern => pattern.includes(strategy.type))) {
      score += 0.15
    }

    return Math.min(Math.max(score, 0), 1)
  }

  /**
   * Extract successful patterns from iteration history
   */
  private extractSuccessfulPatterns(iterations: ContentIteration[]): string[] {
    const patterns: string[] = []
    
    for (const iteration of iterations) {
      if (iteration.userFeedback?.type === 'accept' || iteration.userFeedback?.rating === 1) {
        // Extract keywords from successful content
        const words = iteration.generatedContent.toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 4)
          .slice(0, 5) // Top 5 words

        patterns.push(...words)
      }
    }

    return Array.from(new Set(patterns)) // Remove duplicates
  }

  /**
   * Extract failure patterns from iteration history
   */
  private extractFailurePatterns(iterations: ContentIteration[]): string[] {
    const patterns: string[] = []
    
    for (const iteration of iterations) {
      if (iteration.userFeedback?.type === 'reject' || iteration.userFeedback?.rating === -1) {
        if (iteration.userFeedback.refinementRequest) {
          patterns.push(iteration.userFeedback.refinementRequest)
        }
        
        if (iteration.userFeedback.quickFeedback) {
          patterns.push(...iteration.userFeedback.quickFeedback)
        }
      }
    }

    return patterns
  }

  /**
   * Get or initialize user preferences for a session
   */
  private getUserPreferences(sessionId: SessionId): UserPreferences {
    if (!this.userPreferencesCache.has(sessionId)) {
      this.userPreferencesCache.set(sessionId, {
        stylePreferences: [],
        avoidedPatterns: [],
        acceptedPatterns: []
      })
    }
    
    return this.userPreferencesCache.get(sessionId)!
  }

  /**
   * Update user preferences based on feedback
   */
  private updateUserPreferences(
    sessionId: SessionId,
    feedback: UserFeedback,
    strategy: RefinementStrategy
  ): void {
    const preferences = this.getUserPreferences(sessionId)
    
    if (feedback.type === 'accept') {
      preferences.acceptedPatterns.push(strategy.type)
    } else if (feedback.type === 'reject') {
      preferences.avoidedPatterns.push(strategy.type)
    }

    // Extract tone preferences from feedback
    if (feedback.refinementRequest) {
      const feedbackLower = feedback.refinementRequest.toLowerCase()
      if (feedbackLower.includes('formal')) {
        preferences.preferredTone = 'formal'
      } else if (feedbackLower.includes('casual')) {
        preferences.preferredTone = 'casual'
      } else if (feedbackLower.includes('professional')) {
        preferences.preferredTone = 'professional'
      } else if (feedbackLower.includes('friendly')) {
        preferences.preferredTone = 'friendly'
      }
    }
  }

  /**
   * Strategy decision helpers
   */
  private shouldUseToneAdjustment(request: RefinementRequest, _context: RefinementContext): boolean {
    const feedbackText = (request.userFeedback.refinementRequest || '').toLowerCase()
    return feedbackText.includes('tone') || 
           feedbackText.includes('formal') || 
           feedbackText.includes('casual') ||
           feedbackText.includes('professional') ||
           feedbackText.includes('friendly')
  }

  private shouldUseLengthModification(request: RefinementRequest, _context: RefinementContext): boolean {
    const feedbackText = (request.userFeedback.refinementRequest || '').toLowerCase()
    return feedbackText.includes('longer') || 
           feedbackText.includes('shorter') || 
           feedbackText.includes('brief') ||
           feedbackText.includes('expand') ||
           feedbackText.includes('condense')
  }

  private shouldUseStructureReorganization(request: RefinementRequest, _context: RefinementContext): boolean {
    const feedbackText = (request.userFeedback.refinementRequest || '').toLowerCase()
    return feedbackText.includes('structure') || 
           feedbackText.includes('organize') || 
           feedbackText.includes('flow') ||
           feedbackText.includes('format')
  }

  private shouldExpandContent(request: RefinementRequest): boolean {
    const feedbackText = (request.userFeedback.refinementRequest || '').toLowerCase()
    return feedbackText.includes('longer') || 
           feedbackText.includes('expand') || 
           feedbackText.includes('more detail')
  }

  /**
   * Get temperature for strategy
   */
  private getTemperatureForStrategy(strategy: RefinementStrategy): number {
    const temperatureMap: Record<RefinementStrategyType, number> = {
      tone_adjustment: 0.8,
      length_modification: 0.6,
      structure_reorganization: 0.7,
      content_expansion: 0.8,
      content_condensation: 0.5,
      style_refinement: 0.7,
      topic_refocus: 0.9,
      format_change: 0.6
    }

    return temperatureMap[strategy.type] || 0.7
  }

  /**
   * Get max length for strategy
   */
  private getMaxLengthForStrategy(strategy: RefinementStrategy, contentType: ContentType): number {
    const baseLengths = {
      blog: 400,
      email: 200,
      social: 100
    }

    let baseLength = baseLengths[contentType]

    if (strategy.type === 'content_expansion' || strategy.type === 'length_modification') {
      baseLength *= 1.5
    } else if (strategy.type === 'content_condensation') {
      baseLength *= 0.7
    }

    return Math.round(baseLength)
  }

  /**
   * Get default strategy when none are suitable
   */
  private getDefaultStrategy(_request: RefinementRequest): RefinementStrategy {
    return {
      type: 'style_refinement',
      description: 'General style and content refinement',
      promptModifications: [
        'Please improve the overall quality and clarity of the content',
        'Focus on better word choices and sentence structure'
      ],
      contextWeight: 0.5,
      successProbability: 0.6
    }
  }

  /**
   * Calculate confidence score for the refinement
   */
  private calculateConfidenceScore(strategy: RefinementStrategy, context: RefinementContext): number {
    let confidence = strategy.successProbability

    // Boost confidence based on context quality
    if (context.iterationCount > 2) {
      confidence += 0.1 // More iterations = better context
    }

    if (context.feedbackHistory.length > 1) {
      confidence += 0.1 // More feedback = better understanding
    }

    if (context.successfulPatterns.length > context.failurePatterns.length) {
      confidence += 0.1 // More success patterns
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Get context sources used
   */
  private getContextSources(context: RefinementContext): string[] {
    const sources: string[] = []
    
    if (context.feedbackHistory.length > 0) {
      sources.push('feedback_history')
    }
    
    if (context.successfulPatterns.length > 0) {
      sources.push('successful_patterns')
    }
    
    if (context.failurePatterns.length > 0) {
      sources.push('failure_patterns')
    }
    
    if (context.userPreferences.preferredTone) {
      sources.push('tone_preferences')
    }

    return sources
  }

  /**
   * Generate improvement hypothesis
   */
  private generateImprovementHypothesis(strategy: RefinementStrategy, context: RefinementContext): string {
    let hypothesis = `Using ${strategy.type} strategy: ${strategy.description}.`
    
    if (context.successfulPatterns.length > 0) {
      hypothesis += ` Incorporating ${context.successfulPatterns.length} successful patterns from previous iterations.`
    }
    
    if (context.failurePatterns.length > 0) {
      hypothesis += ` Avoiding ${context.failurePatterns.length} patterns that received negative feedback.`
    }

    return hypothesis
  }

  /**
   * Extract preference signals from refinement requests
   */
  private extractPreferenceSignals(refinementRequests: string[]): UserPreferences {
    const preferences: UserPreferences = {
      stylePreferences: [],
      avoidedPatterns: [],
      acceptedPatterns: []
    }

    const allText = refinementRequests.join(' ').toLowerCase()

    // Extract tone preferences
    if (allText.includes('formal')) preferences.preferredTone = 'formal'
    else if (allText.includes('casual')) preferences.preferredTone = 'casual'
    else if (allText.includes('professional')) preferences.preferredTone = 'professional'
    else if (allText.includes('friendly')) preferences.preferredTone = 'friendly'

    // Extract length preferences
    if (allText.includes('shorter') || allText.includes('brief')) {
      preferences.preferredLength = 'short'
    } else if (allText.includes('longer') || allText.includes('expand')) {
      preferences.preferredLength = 'long'
    }

    return preferences
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovementSuggestions(
    dominantFeedbackTypes: string[],
    preferences: UserPreferences
  ): string[] {
    const suggestions: string[] = []

    if (dominantFeedbackTypes.includes('reject')) {
      suggestions.push('Consider trying alternative content generation approaches')
    }

    if (dominantFeedbackTypes.includes('refine')) {
      suggestions.push('Focus on incremental improvements rather than complete rewrites')
    }

    if (preferences.preferredTone) {
      suggestions.push(`Consistently use ${preferences.preferredTone} tone across all content`)
    }

    if (preferences.preferredLength) {
      suggestions.push(`Default to ${preferences.preferredLength} content length`)
    }

    return suggestions
  }

  /**
   * Initialize default strategy success rates
   */
  private initializeStrategyRates(): void {
    this.strategySuccessRates.set('tone_adjustment', 0.75)
    this.strategySuccessRates.set('length_modification', 0.65)
    this.strategySuccessRates.set('structure_reorganization', 0.7)
    this.strategySuccessRates.set('content_expansion', 0.6)
    this.strategySuccessRates.set('content_condensation', 0.65)
    this.strategySuccessRates.set('style_refinement', 0.8)
    this.strategySuccessRates.set('topic_refocus', 0.55)
    this.strategySuccessRates.set('format_change', 0.6)
  }

  /**
   * Update strategy metrics
   */
  private updateStrategyMetrics(
    sessionId: SessionId,
    strategy: RefinementStrategy,
    startTime: number
  ): void {
    let metrics = this.processingMetrics.get(sessionId)
    
    if (!metrics) {
      metrics = {
        processingTime: 0,
        strategyEffectiveness: new Map(),
        userSatisfactionTrend: [],
        contextAccuracyScore: 0
      }
      this.processingMetrics.set(sessionId, metrics)
    }

    metrics.processingTime = Date.now() - startTime
    
    // Update strategy effectiveness (will be updated when user provides feedback)
    if (!metrics.strategyEffectiveness.has(strategy.type)) {
      metrics.strategyEffectiveness.set(strategy.type, 0)
    }
  }
}

// Export a default instance
export const refinementProcessor = new RefinementProcessor()

/**
 * Convenience functions
 */
export const processContentRefinement = (request: RefinementRequest) =>
  refinementProcessor.processRefinement(request)

export const processRefinementAlternatives = (request: RefinementRequest, count?: number) =>
  refinementProcessor.processRefinementAlternatives(request, count)

export const analyzeFeedbackPatterns = (sessionId: SessionId) =>
  refinementProcessor.analyzeFeedbackPatterns(sessionId) 