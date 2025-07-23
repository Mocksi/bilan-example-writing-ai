/**
 * Content Comparison Utilities
 * 
 * Provides comprehensive analysis and comparison tools for content iterations,
 * including side-by-side comparisons, quality metrics, and improvement tracking.
 */

import type { 
  ContentIteration, 
  UserFeedback, 
  ContentType,
  SessionId,
  IterationId
} from '../types'
import { compareContentIterations, type IterationComparison } from './iteration-manager'

export interface ComparisonAnalysis {
  iterations: ContentIteration[]
  qualityProgression: QualityMetric[]
  bestIteration: ContentIteration
  improvementInsights: ImprovementInsight[]
  userSatisfactionTrend: SatisfactionTrend
  recommendedNext: RecommendedAction[]
}

export interface QualityMetric {
  iterationId: IterationId
  attemptNumber: number
  overallScore: number
  dimensions: {
    clarity: number
    engagement: number
    relevance: number
    completeness: number
    style: number
  }
  userFeedbackScore: number
  improvementFromPrevious: number
}

export interface ImprovementInsight {
  type: InsightType
  description: string
  evidence: string[]
  confidence: number
  actionable: boolean
}

export type InsightType = 
  | 'quality_improvement'
  | 'quality_regression' 
  | 'style_consistency'
  | 'tone_evolution'
  | 'length_optimization'
  | 'user_preference_alignment'
  | 'engagement_enhancement'

export interface SatisfactionTrend {
  overall: 'improving' | 'declining' | 'stable' | 'unknown'
  trendScore: number
  milestones: SatisfactionMilestone[]
  predictionConfidence: number
}

export interface SatisfactionMilestone {
  iterationNumber: number
  satisfactionLevel: number
  significantChange: boolean
  changeReason?: string
}

export interface RecommendedAction {
  action: ActionType
  description: string
  rationale: string
  priority: 'high' | 'medium' | 'low'
  estimatedImpact: number
}

export type ActionType = 
  | 'continue_current_approach'
  | 'try_alternative_style'
  | 'focus_on_structure'
  | 'adjust_tone'
  | 'modify_length'
  | 'start_fresh'
  | 'accept_current'

export interface SideBySideComparison {
  iterations: ContentIteration[]
  alignedSections: AlignedSection[]
  keyDifferences: KeyDifference[]
  improvementHighlights: ImprovementHighlight[]
  visualDiffData: DiffData[]
}

export interface AlignedSection {
  sectionId: string
  sectionType: 'introduction' | 'body' | 'conclusion' | 'other'
  versions: {
    iterationId: IterationId
    content: string
    qualityScore: number
  }[]
}

export interface KeyDifference {
  type: 'addition' | 'removal' | 'modification' | 'reordering'
  description: string
  location: string
  impact: 'positive' | 'negative' | 'neutral'
  significance: number
}

export interface ImprovementHighlight {
  area: string
  before: string
  after: string
  improvementType: string
  userLikelyToApprove: boolean
}

export interface DiffData {
  type: 'unchanged' | 'added' | 'removed' | 'modified'
  content: string
  startPosition: number
  endPosition: number
  confidence: number
}

export interface ContentAnalysisResult {
  readabilityScore: number
  sentimentScore: number
  keyTopics: string[]
  styleSummary: StyleAnalysis
  structuralElements: StructuralAnalysis
}

export interface StyleAnalysis {
  tone: 'formal' | 'casual' | 'professional' | 'friendly' | 'mixed'
  complexity: 'simple' | 'moderate' | 'complex'
  voice: 'active' | 'passive' | 'mixed'
  averageSentenceLength: number
  vocabularyLevel: 'basic' | 'intermediate' | 'advanced'
}

export interface StructuralAnalysis {
  paragraphCount: number
  sentenceCount: number
  averageParagraphLength: number
  hasIntroduction: boolean
  hasConclusion: boolean
  listElements: number
  headingElements: number
}

/**
 * Content Comparison Service Class
 */
export class ContentComparisonService {
  private analysisCache = new Map<IterationId, ContentAnalysisResult>()
  private comparisonCache = new Map<string, SideBySideComparison>()

  /**
   * Perform comprehensive analysis of all iterations in a session
   */
  async analyzeSessionProgress(
    sessionId: SessionId,
    iterations: ContentIteration[]
  ): Promise<ComparisonAnalysis> {
    if (iterations.length === 0) {
      throw new Error('No iterations provided for analysis')
    }

    // Calculate quality metrics for each iteration
    const qualityProgression = await this.calculateQualityProgression(iterations)
    
    // Identify the best iteration
    const bestIteration = this.identifyBestIteration(iterations, qualityProgression)
    
    // Generate improvement insights
    const improvementInsights = await this.generateImprovementInsights(iterations, qualityProgression)
    
    // Analyze satisfaction trends
    const userSatisfactionTrend = this.analyzeSatisfactionTrend(iterations)
    
    // Generate recommended actions
    const recommendedNext = this.generateRecommendedActions(
      iterations,
      qualityProgression,
      userSatisfactionTrend
    )

    return {
      iterations,
      qualityProgression,
      bestIteration,
      improvementInsights,
      userSatisfactionTrend,
      recommendedNext
    }
  }

  /**
   * Create side-by-side comparison of specific iterations
   */
  async createSideBySideComparison(
    iterations: ContentIteration[]
  ): Promise<SideBySideComparison> {
    const cacheKey = iterations.map(iter => iter.id).join('-')
    
    if (this.comparisonCache.has(cacheKey)) {
      return this.comparisonCache.get(cacheKey)!
    }

    // Align content sections across iterations
    const alignedSections = await this.alignContentSections(iterations)
    
    // Identify key differences
    const keyDifferences = this.identifyKeyDifferences(iterations)
    
    // Highlight improvements
    const improvementHighlights = this.identifyImprovementHighlights(iterations)
    
    // Generate visual diff data
    const visualDiffData = this.generateVisualDiffData(iterations)

    const comparison: SideBySideComparison = {
      iterations,
      alignedSections,
      keyDifferences,
      improvementHighlights,
      visualDiffData
    }

    this.comparisonCache.set(cacheKey, comparison)
    return comparison
  }

  /**
   * Analyze individual content for quality metrics
   */
  async analyzeContent(iteration: ContentIteration): Promise<ContentAnalysisResult> {
    if (this.analysisCache.has(iteration.id)) {
      return this.analysisCache.get(iteration.id)!
    }

    const content = iteration.generatedContent
    
    // Calculate readability score (simplified Flesch Reading Ease)
    const readabilityScore = this.calculateReadabilityScore(content)
    
    // Analyze sentiment
    const sentimentScore = this.analyzeSentiment(content)
    
    // Extract key topics
    const keyTopics = this.extractKeyTopics(content)
    
    // Analyze style
    const styleSummary = this.analyzeStyle(content)
    
    // Analyze structure
    const structuralElements = this.analyzeStructure(content)

    const analysis: ContentAnalysisResult = {
      readabilityScore,
      sentimentScore,
      keyTopics,
      styleSummary,
      structuralElements
    }

    this.analysisCache.set(iteration.id, analysis)
    return analysis
  }

  /**
   * Compare two specific iterations in detail
   */
  async compareIterations(
    iteration1: ContentIteration,
    iteration2: ContentIteration
  ): Promise<IterationComparison> {
    return compareContentIterations(iteration1, iteration2)
  }

  /**
   * Get quality score for an iteration
   */
  async getQualityScore(iteration: ContentIteration): Promise<number> {
    const analysis = await this.analyzeContent(iteration)
    
    // Weighted quality score calculation
    let score = 0
    
    // Base content quality (40%)
    score += (analysis.readabilityScore / 100) * 0.4
    
    // Sentiment appropriateness (20%)
    const sentimentAppropriate = Math.abs(analysis.sentimentScore) < 0.8 ? 1 : 0.5
    score += sentimentAppropriate * 0.2
    
    // Structural completeness (20%)
    const structuralScore = this.calculateStructuralScore(analysis.structuralElements)
    score += structuralScore * 0.2
    
    // User feedback incorporation (20%)
    const feedbackScore = this.calculateFeedbackScore(iteration.userFeedback)
    score += feedbackScore * 0.2

    return Math.min(Math.max(score, 0), 1)
  }

  /**
   * Calculate quality progression across iterations
   */
  private async calculateQualityProgression(
    iterations: ContentIteration[]
  ): Promise<QualityMetric[]> {
    const metrics: QualityMetric[] = []
    
    for (let i = 0; i < iterations.length; i++) {
      const iteration = iterations[i]
      const analysis = await this.analyzeContent(iteration)
      
      const overallScore = await this.getQualityScore(iteration)
      
      // Calculate dimension scores
      const dimensions = {
        clarity: this.calculateClarityScore(analysis),
        engagement: this.calculateEngagementScore(analysis),
        relevance: this.calculateRelevanceScore(analysis),
        completeness: this.calculateCompletenessScore(analysis),
        style: this.calculateStyleScore(analysis)
      }
      
      const userFeedbackScore = this.calculateFeedbackScore(iteration.userFeedback)
      
      // Calculate improvement from previous iteration
      const improvementFromPrevious = i > 0 
        ? overallScore - metrics[i - 1].overallScore
        : 0

      metrics.push({
        iterationId: iteration.id,
        attemptNumber: iteration.attemptNumber,
        overallScore,
        dimensions,
        userFeedbackScore,
        improvementFromPrevious
      })
    }

    return metrics
  }

  /**
   * Identify the best iteration based on multiple factors
   */
  private identifyBestIteration(
    iterations: ContentIteration[],
    qualityProgression: QualityMetric[]
  ): ContentIteration {
    let bestIndex = 0
    let bestScore = 0

    for (let i = 0; i < iterations.length; i++) {
      const iteration = iterations[i]
      const metrics = qualityProgression[i]
      
      let score = metrics.overallScore
      
      // Boost score for positive user feedback
      if (iteration.userFeedback?.type === 'accept') {
        score += 0.2
      }
      
      if (iteration.userFeedback?.rating === 1) {
        score += 0.1
      }
      
      // Penalty for negative feedback
      if (iteration.userFeedback?.type === 'reject') {
        score -= 0.2
      }
      
      if (iteration.userFeedback?.rating === -1) {
        score -= 0.1
      }
      
      // Slight preference for later iterations (learning effect)
      score += i * 0.01

      if (score > bestScore) {
        bestScore = score
        bestIndex = i
      }
    }

    return iterations[bestIndex]
  }

  /**
   * Generate improvement insights from iteration analysis
   */
  private async generateImprovementInsights(
    iterations: ContentIteration[],
    qualityProgression: QualityMetric[]
  ): Promise<ImprovementInsight[]> {
    const insights: ImprovementInsight[] = []

    // Analyze overall quality trend
    if (qualityProgression.length > 1) {
      const firstScore = qualityProgression[0].overallScore
      const lastScore = qualityProgression[qualityProgression.length - 1].overallScore
      const trend = lastScore - firstScore

      if (trend > 0.1) {
        insights.push({
          type: 'quality_improvement',
          description: 'Content quality has improved significantly across iterations',
          evidence: [
            `Quality score increased from ${firstScore.toFixed(2)} to ${lastScore.toFixed(2)}`,
            `${qualityProgression.filter(m => m.improvementFromPrevious > 0).length} iterations showed improvement`
          ],
          confidence: Math.min(trend * 2, 1),
          actionable: false
        })
      } else if (trend < -0.1) {
        insights.push({
          type: 'quality_regression',
          description: 'Content quality has declined in recent iterations',
          evidence: [
            `Quality score decreased from ${firstScore.toFixed(2)} to ${lastScore.toFixed(2)}`,
            'Consider reverting to an earlier approach'
          ],
          confidence: Math.min(Math.abs(trend) * 2, 1),
          actionable: true
        })
      }
    }

    // Analyze user satisfaction trend
    const userFeedbacks = iterations
      .map(iter => iter.userFeedback)
      .filter((feedback): feedback is UserFeedback => feedback !== undefined)

    if (userFeedbacks.length > 1) {
      const acceptanceRate = userFeedbacks.filter(f => f.type === 'accept').length / userFeedbacks.length
      
      if (acceptanceRate > 0.6) {
        insights.push({
          type: 'user_preference_alignment',
          description: 'Content is well-aligned with user preferences',
          evidence: [
            `${Math.round(acceptanceRate * 100)}% acceptance rate`,
            'User feedback patterns show consistency'
          ],
          confidence: acceptanceRate,
          actionable: false
        })
      }
    }

    // Analyze style consistency
    const styleAnalyses = await Promise.all(
      iterations.map(iter => this.analyzeContent(iter))
    )
    
    const tones = styleAnalyses.map(analysis => analysis.styleSummary.tone)
    const uniqueTones = new Set(tones)
    
    if (uniqueTones.size === 1 && iterations.length > 2) {
      insights.push({
        type: 'style_consistency',
        description: `Consistent ${tones[0]} tone maintained throughout iterations`,
        evidence: [`All ${iterations.length} iterations use ${tones[0]} tone`],
        confidence: 0.9,
        actionable: false
      })
    } else if (uniqueTones.size > 2) {
      insights.push({
        type: 'tone_evolution',
        description: 'Tone has varied significantly across iterations',
        evidence: [`Used ${uniqueTones.size} different tones: ${Array.from(uniqueTones).join(', ')}`],
        confidence: 0.8,
        actionable: true
      })
    }

    return insights
  }

  /**
   * Analyze satisfaction trend across iterations
   */
  private analyzeSatisfactionTrend(iterations: ContentIteration[]): SatisfactionTrend {
    const feedbacks = iterations
      .map((iter, index) => ({ iteration: index + 1, feedback: iter.userFeedback }))
      .filter(item => item.feedback !== undefined)

    if (feedbacks.length < 2) {
      return {
        overall: 'unknown',
        trendScore: 0,
        milestones: [],
        predictionConfidence: 0
      }
    }

    // Calculate satisfaction scores
    const satisfactionScores = feedbacks.map(item => {
      const feedback = item.feedback!
      let score = 0.5 // Neutral baseline

      if (feedback.type === 'accept') score = 0.8
      else if (feedback.type === 'reject') score = 0.2
      else if (feedback.type === 'refine') score = 0.4

      if (feedback.rating === 1) score += 0.2
      else if (feedback.rating === -1) score -= 0.2

      if (feedback.acceptanceLevel === 'as_is') score = 1.0
      else if (feedback.acceptanceLevel === 'inspiration') score = 0.3

      return { iteration: item.iteration, score: Math.min(Math.max(score, 0), 1) }
    })

    // Calculate trend
    const firstHalfAvg = satisfactionScores.slice(0, Math.floor(satisfactionScores.length / 2))
      .reduce((sum, item) => sum + item.score, 0) / Math.floor(satisfactionScores.length / 2)
    
    const secondHalfAvg = satisfactionScores.slice(Math.floor(satisfactionScores.length / 2))
      .reduce((sum, item) => sum + item.score, 0) / Math.ceil(satisfactionScores.length / 2)

    const trendScore = secondHalfAvg - firstHalfAvg

    let overall: SatisfactionTrend['overall']
    if (trendScore > 0.1) overall = 'improving'
    else if (trendScore < -0.1) overall = 'declining'
    else overall = 'stable'

    // Identify milestones (significant changes)
    const milestones: SatisfactionMilestone[] = []
    for (let i = 1; i < satisfactionScores.length; i++) {
      const change = satisfactionScores[i].score - satisfactionScores[i - 1].score
      if (Math.abs(change) > 0.3) {
        milestones.push({
          iterationNumber: satisfactionScores[i].iteration,
          satisfactionLevel: satisfactionScores[i].score,
          significantChange: true,
          changeReason: change > 0 ? 'significant_improvement' : 'significant_decline'
        })
      }
    }

    return {
      overall,
      trendScore,
      milestones,
      predictionConfidence: Math.min(satisfactionScores.length * 0.2, 1)
    }
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendedActions(
    iterations: ContentIteration[],
    qualityProgression: QualityMetric[],
    satisfactionTrend: SatisfactionTrend
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = []

    // Analyze recent performance
    const recentMetrics = qualityProgression.slice(-2)
    const latestIteration = iterations[iterations.length - 1]
    
    // High satisfaction + high quality = continue or accept
    if (satisfactionTrend.overall === 'improving' && 
        recentMetrics[recentMetrics.length - 1]?.overallScore > 0.7) {
      
      if (latestIteration.userFeedback?.type === 'accept') {
        actions.push({
          action: 'accept_current',
          description: 'Accept the current content as it meets quality standards',
          rationale: 'High quality score and positive user feedback indicate success',
          priority: 'high',
          estimatedImpact: 0.9
        })
      } else {
        actions.push({
          action: 'continue_current_approach',
          description: 'Continue with the current content direction',
          rationale: 'Quality is improving and user satisfaction is trending upward',
          priority: 'medium',
          estimatedImpact: 0.7
        })
      }
    }

    // Declining satisfaction = try alternatives
    if (satisfactionTrend.overall === 'declining') {
      actions.push({
        action: 'try_alternative_style',
        description: 'Experiment with a different writing style or approach',
        rationale: 'Current approach is showing declining user satisfaction',
        priority: 'high',
        estimatedImpact: 0.6
      })
    }

    // Low structure scores = focus on organization
    const latestStructuralScore = this.calculateStructuralScore(
      (await this.analyzeContent(latestIteration)).structuralElements
    )
    
    if (latestStructuralScore < 0.5) {
      actions.push({
        action: 'focus_on_structure',
        description: 'Improve content organization and structure',
        rationale: 'Content structure analysis shows room for improvement',
        priority: 'medium',
        estimatedImpact: 0.5
      })
    }

    // Many iterations without success = start fresh
    if (iterations.length > 4 && 
        !iterations.slice(-3).some(iter => iter.userFeedback?.type === 'accept')) {
      actions.push({
        action: 'start_fresh',
        description: 'Start with a completely new approach',
        rationale: 'Multiple iterations without successful outcomes suggest need for fresh perspective',
        priority: 'medium',
        estimatedImpact: 0.4
      })
    }

    // Sort by priority and estimated impact
    actions.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.estimatedImpact - a.estimatedImpact
    })

    return actions.slice(0, 3) // Return top 3 recommendations
  }

  /**
   * Align content sections across iterations for comparison
   */
  private async alignContentSections(iterations: ContentIteration[]): Promise<AlignedSection[]> {
    // Simple paragraph-based alignment
    const sections: AlignedSection[] = []
    
    // Find maximum number of paragraphs across all iterations
    const maxParagraphs = Math.max(
      ...iterations.map(iter => iter.generatedContent.split(/\n\s*\n/).length)
    )

    for (let i = 0; i < maxParagraphs; i++) {
      const sectionId = `section_${i + 1}`
      const sectionType = i === 0 ? 'introduction' : 
                         i === maxParagraphs - 1 ? 'conclusion' : 'body'

      const versions = iterations.map(iter => {
        const paragraphs = iter.generatedContent.split(/\n\s*\n/)
        const content = paragraphs[i] || ''
        
        return {
          iterationId: iter.id,
          content,
          qualityScore: content.length > 0 ? 0.7 : 0 // Simplified scoring
        }
      })

      if (versions.some(v => v.content.length > 0)) {
        sections.push({
          sectionId,
          sectionType,
          versions
        })
      }
    }

    return sections
  }

  /**
   * Identify key differences between iterations
   */
  private identifyKeyDifferences(iterations: ContentIteration[]): KeyDifference[] {
    const differences: KeyDifference[] = []
    
    for (let i = 1; i < iterations.length; i++) {
      const prev = iterations[i - 1].generatedContent
      const curr = iterations[i].generatedContent
      
      // Simple length comparison
      const lengthDiff = curr.length - prev.length
      if (Math.abs(lengthDiff) > prev.length * 0.2) {
        differences.push({
          type: lengthDiff > 0 ? 'addition' : 'removal',
          description: `Content ${lengthDiff > 0 ? 'expanded' : 'condensed'} by ${Math.abs(lengthDiff)} characters`,
          location: 'overall',
          impact: 'neutral',
          significance: Math.min(Math.abs(lengthDiff) / prev.length, 1)
        })
      }

      // Word choice changes (simplified)
      const prevWords = new Set(prev.toLowerCase().split(/\s+/))
      const currWords = new Set(curr.toLowerCase().split(/\s+/))
      
      const addedWords = Array.from(currWords).filter(word => !prevWords.has(word))
      const removedWords = Array.from(prevWords).filter(word => !currWords.has(word))
      
      if (addedWords.length > 5) {
        differences.push({
          type: 'addition',
          description: `Added ${addedWords.length} new terms`,
          location: 'vocabulary',
          impact: 'positive',
          significance: Math.min(addedWords.length / 20, 1)
        })
      }

      if (removedWords.length > 5) {
        differences.push({
          type: 'removal',
          description: `Removed ${removedWords.length} terms`,
          location: 'vocabulary',
          impact: 'neutral',
          significance: Math.min(removedWords.length / 20, 1)
        })
      }
    }

    return differences
  }

  /**
   * Identify improvement highlights
   */
  private identifyImprovementHighlights(iterations: ContentIteration[]): ImprovementHighlight[] {
    const highlights: ImprovementHighlight[] = []
    
    for (let i = 1; i < iterations.length; i++) {
      const prev = iterations[i - 1]
      const curr = iterations[i]
      
      // Check if user feedback was addressed
      if (prev.userFeedback?.refinementRequest && prev.userFeedback.type !== 'accept') {
        const feedbackKeywords = prev.userFeedback.refinementRequest.toLowerCase().split(/\s+/)
        const currentContent = curr.generatedContent.toLowerCase()
        
        const addressedKeywords = feedbackKeywords.filter(keyword => 
          keyword.length > 3 && currentContent.includes(keyword)
        )

        if (addressedKeywords.length > 0) {
          highlights.push({
            area: 'feedback_incorporation',
            before: 'User requested changes not addressed',
            after: `Incorporated user feedback: ${addressedKeywords.join(', ')}`,
            improvementType: 'user_feedback_addressing',
            userLikelyToApprove: true
          })
        }
      }

      // Structure improvements
      const prevParagraphs = prev.generatedContent.split(/\n\s*\n/).length
      const currParagraphs = curr.generatedContent.split(/\n\s*\n/).length
      
      if (currParagraphs > prevParagraphs && prevParagraphs === 1) {
        highlights.push({
          area: 'structure',
          before: 'Single paragraph format',
          after: `Improved structure with ${currParagraphs} paragraphs`,
          improvementType: 'structure_enhancement',
          userLikelyToApprove: true
        })
      }
    }

    return highlights
  }

  /**
   * Generate visual diff data for UI rendering
   */
  private generateVisualDiffData(iterations: ContentIteration[]): DiffData[] {
    if (iterations.length < 2) return []
    
    // Simple diff between last two iterations
    const prev = iterations[iterations.length - 2].generatedContent
    const curr = iterations[iterations.length - 1].generatedContent
    
    const diffData: DiffData[] = []
    
    // Simplified diff - split by sentences
    const prevSentences = prev.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const currSentences = curr.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    let position = 0
    
    for (let i = 0; i < Math.max(prevSentences.length, currSentences.length); i++) {
      const prevSentence = prevSentences[i]?.trim()
      const currSentence = currSentences[i]?.trim()
      
      if (prevSentence === currSentence) {
        diffData.push({
          type: 'unchanged',
          content: currSentence || prevSentence,
          startPosition: position,
          endPosition: position + (currSentence || prevSentence).length,
          confidence: 1.0
        })
      } else if (!prevSentence && currSentence) {
        diffData.push({
          type: 'added',
          content: currSentence,
          startPosition: position,
          endPosition: position + currSentence.length,
          confidence: 0.9
        })
      } else if (prevSentence && !currSentence) {
        diffData.push({
          type: 'removed',
          content: prevSentence,
          startPosition: position,
          endPosition: position + prevSentence.length,
          confidence: 0.9
        })
      } else if (prevSentence && currSentence) {
        diffData.push({
          type: 'modified',
          content: currSentence,
          startPosition: position,
          endPosition: position + currSentence.length,
          confidence: 0.8
        })
      }
      
      position += (currSentence || prevSentence || '').length + 1
    }

    return diffData
  }

  /**
   * Quality calculation helpers
   */
  private calculateReadabilityScore(content: string): number {
    // Simplified Flesch Reading Ease formula
    const sentences = content.split(/[.!?]+/).length - 1
    const words = content.split(/\s+/).length
    const syllables = this.countSyllables(content)
    
    if (sentences === 0 || words === 0) return 0
    
    const avgSentenceLength = words / sentences
    const avgSyllablesPerWord = syllables / words
    
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord)
    return Math.min(Math.max(score, 0), 100)
  }

  private countSyllables(text: string): number {
    // Simple syllable counting
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiouy]+/g, 'a')
      .length
  }

  private analyzeSentiment(content: string): number {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic']
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing', 'poor']
    
    const words = content.toLowerCase().split(/\s+/)
    const positiveCount = words.filter(word => positiveWords.includes(word)).length
    const negativeCount = words.filter(word => negativeWords.includes(word)).length
    
    const totalSentimentWords = positiveCount + negativeCount
    if (totalSentimentWords === 0) return 0
    
    return (positiveCount - negativeCount) / words.length
  }

  private extractKeyTopics(content: string): string[] {
    // Simple keyword extraction
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4)
    
    const wordCounts = new Map<string, number>()
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    })
    
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)
  }

  private analyzeStyle(content: string): StyleAnalysis {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const words = content.split(/\s+/)
    
    return {
      tone: this.detectTone(content),
      complexity: this.detectComplexity(content),
      voice: this.detectVoice(content),
      averageSentenceLength: words.length / sentences.length,
      vocabularyLevel: this.detectVocabularyLevel(content)
    }
  }

  private analyzeStructure(content: string): StructuralAnalysis {
    const paragraphs = content.split(/\n\s*\n/)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const listElements = (content.match(/^\s*[-*•]/gm) || []).length
    const headingElements = (content.match(/^#+\s/gm) || []).length
    
    return {
      paragraphCount: paragraphs.length,
      sentenceCount: sentences.length,
      averageParagraphLength: sentences.length / paragraphs.length,
      hasIntroduction: paragraphs.length > 0,
      hasConclusion: paragraphs.length > 1,
      listElements,
      headingElements
    }
  }

  private detectTone(content: string): StyleAnalysis['tone'] {
    const formalWords = ['therefore', 'furthermore', 'consequently', 'nevertheless']
    const casualWords = ['yeah', 'gonna', 'wanna', 'stuff', 'things']
    
    const contentLower = content.toLowerCase()
    const formalCount = formalWords.filter(word => contentLower.includes(word)).length
    const casualCount = casualWords.filter(word => contentLower.includes(word)).length
    
    if (formalCount > casualCount) return 'formal'
    if (casualCount > formalCount) return 'casual'
    return 'professional'
  }

  private detectComplexity(content: string): StyleAnalysis['complexity'] {
    const avgWordLength = content.replace(/[^\w\s]/g, '').split(/\s+/)
      .reduce((sum, word) => sum + word.length, 0) / content.split(/\s+/).length
    
    if (avgWordLength > 6) return 'complex'
    if (avgWordLength < 4) return 'simple'
    return 'moderate'
  }

  private detectVoice(content: string): StyleAnalysis['voice'] {
    const passiveIndicators = ['was', 'were', 'been', 'being']
    const sentences = content.split(/[.!?]+/)
    
    const passiveCount = sentences.filter(sentence => 
      passiveIndicators.some(indicator => sentence.toLowerCase().includes(indicator))
    ).length
    
    const passiveRatio = passiveCount / sentences.length
    
    if (passiveRatio > 0.3) return 'passive'
    if (passiveRatio < 0.1) return 'active'
    return 'mixed'
  }

  private detectVocabularyLevel(content: string): StyleAnalysis['vocabularyLevel'] {
    const advancedWords = ['consequently', 'nevertheless', 'furthermore', 'comprehensive']
    const words = content.toLowerCase().split(/\s+/)
    
    const advancedCount = words.filter(word => 
      advancedWords.includes(word) || word.length > 8
    ).length
    
    const advancedRatio = advancedCount / words.length
    
    if (advancedRatio > 0.1) return 'advanced'
    if (advancedRatio < 0.03) return 'basic'
    return 'intermediate'
  }

  private calculateStructuralScore(structure: StructuralAnalysis): number {
    let score = 0.5 // Base score
    
    if (structure.hasIntroduction) score += 0.1
    if (structure.hasConclusion) score += 0.1
    if (structure.paragraphCount > 1) score += 0.1
    if (structure.averageParagraphLength > 2 && structure.averageParagraphLength < 8) score += 0.1
    if (structure.listElements > 0) score += 0.05
    if (structure.headingElements > 0) score += 0.05
    
    return Math.min(score, 1.0)
  }

  private calculateFeedbackScore(feedback?: UserFeedback): number {
    if (!feedback) return 0.5
    
    let score = 0.5
    
    if (feedback.type === 'accept') score = 0.9
    else if (feedback.type === 'reject') score = 0.1
    else if (feedback.type === 'refine') score = 0.4
    
    if (feedback.rating === 1) score += 0.1
    else if (feedback.rating === -1) score -= 0.1
    
    if (feedback.acceptanceLevel === 'as_is') score = 1.0
    else if (feedback.acceptanceLevel === 'inspiration') score = 0.3
    
    return Math.min(Math.max(score, 0), 1)
  }

  private calculateClarityScore(analysis: ContentAnalysisResult): number {
    return analysis.readabilityScore / 100
  }

  private calculateEngagementScore(analysis: ContentAnalysisResult): number {
    const sentimentMagnitude = Math.abs(analysis.sentimentScore)
    const topicRichness = Math.min(analysis.keyTopics.length / 5, 1)
    return (sentimentMagnitude + topicRichness) / 2
  }

  private calculateRelevanceScore(analysis: ContentAnalysisResult): number {
    // Simplified relevance based on topic consistency
    return analysis.keyTopics.length > 0 ? 0.7 : 0.3
  }

  private calculateCompletenessScore(analysis: ContentAnalysisResult): number {
    const structuralScore = this.calculateStructuralScore(analysis.structuralElements)
    const lengthScore = Math.min(analysis.structuralElements.sentenceCount / 10, 1)
    return (structuralScore + lengthScore) / 2
  }

  private calculateStyleScore(analysis: ContentAnalysisResult): Number {
    const style = analysis.styleSummary
    let score = 0.5
    
    if (style.tone !== 'mixed') score += 0.1
    if (style.voice === 'active') score += 0.1
    if (style.complexity === 'moderate') score += 0.1
    if (style.averageSentenceLength > 10 && style.averageSentenceLength < 25) score += 0.1
    if (style.vocabularyLevel === 'intermediate' || style.vocabularyLevel === 'advanced') score += 0.1
    
    return Math.min(score, 1.0)
  }
}

// Export a default instance
export const contentComparisonService = new ContentComparisonService()

/**
 * Convenience functions
 */
export const analyzeSessionProgress = (sessionId: SessionId, iterations: ContentIteration[]) =>
  contentComparisonService.analyzeSessionProgress(sessionId, iterations)

export const createSideBySideComparison = (iterations: ContentIteration[]) =>
  contentComparisonService.createSideBySideComparison(iterations)

export const analyzeContentQuality = (iteration: ContentIteration) =>
  contentComparisonService.analyzeContent(iteration)

export const getContentQualityScore = (iteration: ContentIteration) =>
  contentComparisonService.getQualityScore(iteration) 