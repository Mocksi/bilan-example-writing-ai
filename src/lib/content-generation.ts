/**
 * Content generation service
 * 
 * High-level service that builds on the AI client to provide
 * content-specific generation capabilities with proper typing and context management.
 */

import { aiClient, type GenerationOptions, type GenerationResponse } from './ai-client'

// Local type definitions to avoid import issues
type ContentType = 'blog' | 'email' | 'social'
type SessionId = string & { __brand: 'SessionId' }
type IterationId = string & { __brand: 'IterationId' }

export interface ContentIteration {
  id: IterationId
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

export interface UserFeedback {
  type: 'accept' | 'reject' | 'refine'
  rating?: 1 | -1
  refinementRequest?: string
  quickFeedback?: string[]
  acceptanceLevel?: 'as_is' | 'light_edit' | 'heavy_edit' | 'inspiration'
}

export interface ContentGenerationRequest {
  contentType: ContentType
  userBrief: string
  sessionId: SessionId
  iterationId: IterationId
  previousAttempts?: ContentIteration[]
  refinementRequest?: string
  options?: {
    temperature?: number
    maxTokens?: number
    tone?: 'formal' | 'casual' | 'professional' | 'friendly'
    length?: 'short' | 'medium' | 'long'
  }
}

export interface ContentGenerationResult {
  content: string
  metadata: {
    sessionId: SessionId
    iterationId: IterationId
    contentType: ContentType
    generationTime: number
    tokenCount?: number
    model: string
    promptUsed: string
  }
}

export interface ServiceHealthStatus {
  isHealthy: boolean
  isInitialized: boolean
  isLoading: boolean
  model: string
  error?: string
}

/**
 * Content generation service class
 */
export class ContentGenerationService {
  private aiClient = aiClient

  /**
   * Generate content for a specific content type and user brief
   */
  async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    const startTime = Date.now()
    
    try {
      // Build the prompt based on content type and context
      const prompt = this.buildPrompt(request)
      
      // Configure generation parameters
      const generationOptions: GenerationOptions = {
        maxLength: request.options?.maxTokens ?? this.getMaxTokensForContentType(request.contentType),
        temperature: request.options?.temperature ?? this.getTemperatureForContentType(request.contentType),
        doSample: true,
        topK: 50,
        topP: 0.9,
        repetitionPenalty: 1.1,
      }

      // Generate content using AI client
      const response = await this.aiClient.generateContentForType(
        request.contentType,
        request.userBrief,
        generationOptions
      )
      
      const generationTime = Date.now() - startTime
      
      return {
        content: response.text,
        metadata: {
          sessionId: request.sessionId,
          iterationId: request.iterationId,
          contentType: request.contentType,
          generationTime,
          tokenCount: response.metadata.outputLength,
          model: response.metadata.model,
          promptUsed: prompt,
        },
      }
    } catch (error) {
      throw new Error(`Content generation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Refine existing content based on user feedback
   */
  async refineContent(
    originalContent: string,
    refinementRequest: string,
    request: Omit<ContentGenerationRequest, 'userBrief'>
  ): Promise<ContentGenerationResult> {
    const refinementPrompt = this.buildRefinementPrompt(
      originalContent,
      refinementRequest,
      request.contentType
    )

    return this.generateContent({
      ...request,
      userBrief: refinementPrompt,
    })
  }

  /**
   * Generate multiple variations of content
   */
  async generateVariations(
    request: ContentGenerationRequest,
    count: number = 3
  ): Promise<ContentGenerationResult[]> {
    const variations: ContentGenerationResult[] = []
    
    for (let i = 0; i < count; i++) {
      try {
        // Add slight temperature variation for each attempt
        const variationRequest = {
          ...request,
          options: {
            ...request.options,
            temperature: (request.options?.temperature ?? 0.7) + (i * 0.1),
          },
        }
        
        const result = await this.generateContent(variationRequest)
        variations.push(result)
      } catch (error) {
        console.warn(`Failed to generate variation ${i + 1}:`, error)
        // Continue with other variations
      }
    }
    
    return variations
  }

  /**
   * Build a prompt based on content type, user brief, and context
   */
  private buildPrompt(request: ContentGenerationRequest): string {
    const { contentType, userBrief, previousAttempts, refinementRequest, options } = request
    
    let prompt = this.getBasePromptForContentType(contentType)
    
    // Add tone guidance if specified
    if (options?.tone) {
      prompt += `\n\nTone: Write in a ${options.tone} tone.`
    }
    
    // Add length guidance if specified
    if (options?.length) {
      const lengthGuidance = this.getLengthGuidance(options.length, contentType)
      prompt += `\n\nLength: ${lengthGuidance}`
    }
    
    // Add context from previous attempts if available
    if (previousAttempts && previousAttempts.length > 0) {
      prompt += '\n\nPrevious attempts context:'
      previousAttempts.slice(-2).forEach((attempt) => {
        prompt += `\n\nAttempt ${attempt.attemptNumber}: ${attempt.generatedContent.substring(0, 200)}...`
        if (attempt.userFeedback?.refinementRequest) {
          prompt += `\nUser feedback: ${attempt.userFeedback.refinementRequest}`
        }
      })
      prompt += '\n\nPlease generate a new version that addresses the previous feedback.'
    }
    
    // Add refinement request if provided
    if (refinementRequest) {
      prompt += `\n\nSpecific refinement request: ${refinementRequest}`
    }
    
    // Add the user's brief
    prompt += `\n\nUser request: ${userBrief}`
    
    // Add final instructions
    prompt += '\n\nPlease generate the content now:'
    
    return prompt
  }

  /**
   * Build a refinement prompt for improving existing content
   */
  private buildRefinementPrompt(
    originalContent: string,
    refinementRequest: string,
    contentType: ContentType
  ): string {
    let prompt = `Please refine the following ${contentType} content based on the user's feedback:\n\n`
    prompt += `Original content:\n${originalContent}\n\n`
    prompt += `User feedback: ${refinementRequest}\n\n`
    prompt += 'Please provide an improved version that addresses the feedback:'
    
    return prompt
  }

  /**
   * Get base prompt template for each content type
   */
  private getBasePromptForContentType(contentType: ContentType): string {
    switch (contentType) {
      case 'blog':
        return `You are an expert blog writer. Create engaging, informative blog content that:
- Has a compelling introduction that hooks the reader
- Uses clear, conversational language
- Includes practical insights and actionable advice
- Has a logical flow with smooth transitions
- Ends with a strong conclusion`

      case 'email':
        return `You are an expert email writer. Create professional, effective email content that:
- Has a clear, compelling subject line (if needed)
- Gets to the point quickly and respectfully
- Uses appropriate tone for the context
- Includes a clear call-to-action when needed
- Is concise but complete`

      case 'social':
        return `You are an expert social media content creator. Create engaging social media content that:
- Captures attention quickly
- Uses appropriate hashtags and mentions when relevant
- Encourages engagement and interaction
- Fits the platform's style and character limits
- Has a clear message or call-to-action`

      default:
        return 'You are an expert content writer. Create high-quality, engaging content based on the user\'s requirements.'
    }
  }

  /**
   * Get length guidance for different content types
   */
  private getLengthGuidance(length: 'short' | 'medium' | 'long', contentType: ContentType): string {
    const guidelines = {
      blog: {
        short: 'Write a concise blog post (300-500 words)',
        medium: 'Write a standard blog post (800-1200 words)',
        long: 'Write a comprehensive blog post (1500-2500 words)',
      },
      email: {
        short: 'Write a brief email (50-100 words)',
        medium: 'Write a standard email (150-250 words)',
        long: 'Write a detailed email (300-500 words)',
      },
      social: {
        short: 'Write a short social media post (50-100 characters)',
        medium: 'Write a standard social media post (100-200 characters)',
        long: 'Write a longer social media post (200-300 characters)',
      },
    }

    return guidelines[contentType][length]
  }

  /**
   * Get maximum tokens for different content types
   */
  private getMaxTokensForContentType(contentType: ContentType): number {
    switch (contentType) {
      case 'blog':
        return 400  // ~300 words
      case 'email':
        return 200  // ~150 words
      case 'social':
        return 100  // ~75 words
      default:
        return 200
    }
  }

  /**
   * Get optimal temperature for different content types
   */
  private getTemperatureForContentType(contentType: ContentType): number {
    switch (contentType) {
      case 'blog':
        return 0.8   // More creative for blog posts
      case 'email':
        return 0.6   // More conservative for emails
      case 'social':
        return 0.9   // Most creative for social media
      default:
        return 0.7
    }
  }

  /**
   * Check if the service is healthy and ready for content generation
   */
  async checkServiceHealth(): Promise<ServiceHealthStatus> {
    try {
      const aiStatus = this.aiClient.getStatus()
      return {
        isHealthy: aiStatus.isInitialized && !aiStatus.isLoading,
        isInitialized: aiStatus.isInitialized,
        isLoading: aiStatus.isLoading,
        model: aiStatus.model,
        error: aiStatus.error,
      }
    } catch (error) {
      return {
        isHealthy: false,
        isInitialized: false,
        isLoading: false,
        model: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Initialize the underlying AI client
   */
  async initialize(): Promise<void> {
    return this.aiClient.initialize()
  }

  /**
   * Get processing statistics
   */
  getProcessingStats() {
    return {
      model: this.aiClient.getStatus().model,
      isReady: this.aiClient.getStatus().isInitialized,
      // Add more stats as needed
    }
  }
}

// Export a default instance
export const contentGenerationService = new ContentGenerationService()

/**
 * Convenience function to generate content
 */
export const generateContent = (request: ContentGenerationRequest) =>
  contentGenerationService.generateContent(request)

/**
 * Convenience function to refine content
 */
export const refineContent = (
  originalContent: string,
  refinementRequest: string,
  request: Omit<ContentGenerationRequest, 'userBrief'>
) => contentGenerationService.refineContent(originalContent, refinementRequest, request)

/**
 * Convenience function to generate variations
 */
export const generateVariations = (request: ContentGenerationRequest, count?: number) =>
  contentGenerationService.generateVariations(request, count)

/**
 * Convenience function to check service health
 */
export const checkContentGenerationHealth = () =>
  contentGenerationService.checkServiceHealth()

/**
 * Convenience function to initialize the service
 */
export const initializeContentGeneration = () =>
  contentGenerationService.initialize() 