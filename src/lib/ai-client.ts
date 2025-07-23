/**
 * Transformers.js AI client for local content generation
 * 
 * Provides a TypeScript interface to Transformers.js for completely local
 * AI inference without any external services or APIs.
 */

import type { ContentType } from '../types'
import type { TransformersModule, TextGenerationPipeline } from '../types/transformers'

// Dynamic import to avoid TypeScript issues
let transformers: TransformersModule | null = null

export interface AIClientConfig {
  model?: string
  maxLength?: number
  temperature?: number
  device?: 'cpu' | 'gpu'
  padTokenId?: number
}

export interface GenerationOptions {
  maxLength?: number
  temperature?: number
  doSample?: boolean
  topK?: number
  topP?: number
  repetitionPenalty?: number
  padTokenId?: number
}

export interface GenerationResponse {
  text: string
  metadata: {
    model: string
    generationTime: number
    inputLength: number
    outputLength: number
  }
}

export interface AIClientStatus {
  isInitialized: boolean
  isLoading: boolean
  model: string
  error?: string
  config: Required<AIClientConfig>
}

/**
 * AI client using Transformers.js for local inference
 */
export class AIClient {
  private generator: TextGenerationPipeline | null = null
  private isInitialized = false
  private isLoading = false
  private config: Required<AIClientConfig>
  private initializationPromise: Promise<void> | null = null
  private transformersModule: TransformersModule | null = null

  constructor(config: AIClientConfig = {}, transformersModule?: TransformersModule) {
    this.config = {
      model: config.model || 'Xenova/distilgpt2',
      maxLength: config.maxLength || 200,
      temperature: config.temperature || 0.7,
      device: config.device || 'cpu',
      padTokenId: config.padTokenId || this.getDefaultPadTokenId(config.model || 'Xenova/distilgpt2'),
    }
    this.transformersModule = transformersModule || null
  }

  /**
   * Get default pad token ID based on model type
   * Different models use different pad token IDs
   */
  private getDefaultPadTokenId(model: string): number {
    // Common pad token IDs for different model families
    if (model.includes('gpt') || model.includes('distilgpt')) {
      return 50256 // GPT-2/DistilGPT-2 pad token
    } else if (model.includes('bert')) {
      return 0 // BERT pad token
    } else if (model.includes('t5')) {
      return 0 // T5 pad token
    } else if (model.includes('llama')) {
      return 0 // LLaMA pad token
    } else {
      // Default fallback - GPT-2 style
      return 50256
    }
  }

  /**
   * Initialize the AI model (downloads and caches model on first run)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this._doInitialize()
    return this.initializationPromise
  }

  private async _doInitialize(): Promise<void> {
    try {
      this.isLoading = true
      
      // Log model loading for debugging
      console.info('Loading AI model:', this.config.model)
      
      // Dynamic import of transformers
      if (!transformers) {
        transformers = this.transformersModule || (await import('@xenova/transformers')) as TransformersModule
      }
      
      // Create text generation pipeline
      this.generator = await transformers.pipeline('text-generation', this.config.model, {
        device: this.config.device,
      })
      
      this.isInitialized = true
      this.isLoading = false
      
      console.info(`AI model loaded successfully: ${this.config.model}`)
    } catch (error) {
      this.isLoading = false
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to initialize AI model:', errorMessage)
      throw new Error(`AI model initialization failed: ${errorMessage}`)
    }
  }

  /**
   * Generate content using the loaded model
   */
  async generateContent(
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResponse> {
    await this.initialize()

    if (!this.generator) {
      throw new Error('AI model not initialized')
    }

    const startTime = Date.now()
    const inputLength = prompt.length

    try {
      const generationOptions = {
        max_length: options.maxLength ?? this.config.maxLength,
        temperature: options.temperature ?? this.config.temperature,
        do_sample: options.doSample ?? true,
        top_k: options.topK ?? 50,
        top_p: options.topP ?? 0.9,
        repetition_penalty: options.repetitionPenalty ?? 1.1,
        pad_token_id: options.padTokenId ?? this.config.padTokenId,
      }

      const result = await this.generator(prompt, generationOptions)
      
      // Extract generated text (remove the original prompt)
      const fullText = Array.isArray(result) ? result[0].generated_text : result.generated_text
      const generatedText = fullText.slice(prompt.length).trim()
      
      const generationTime = Date.now() - startTime

      return {
        text: generatedText,
        metadata: {
          model: this.config.model,
          generationTime,
          inputLength,
          outputLength: generatedText.length,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Content generation failed: ${errorMessage}`)
    }
  }

  /**
   * Generate content specifically for a content type with optimized prompts
   */
  async generateContentForType(
    contentType: ContentType,
    userBrief: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResponse> {
    const optimizedPrompt = this.buildPromptForContentType(contentType, userBrief)
    
    // Adjust generation parameters based on content type
    const typeSpecificOptions: GenerationOptions = {
      ...options,
      maxLength: options.maxLength ?? this.getMaxLengthForContentType(contentType),
      temperature: options.temperature ?? this.getTemperatureForContentType(contentType),
    }

    return this.generateContent(optimizedPrompt, typeSpecificOptions)
  }

  /**
   * Check the current status of the AI client
   */
  getStatus(): AIClientStatus {
    return {
      isInitialized: this.isInitialized,
      isLoading: this.isLoading,
      model: this.config.model,
      config: this.config,
    }
  }

  /**
   * Update configuration (requires reinitialization if model changes)
   */
  updateConfig(newConfig: Partial<AIClientConfig>): void {
    const oldModel = this.config.model
    this.config = { ...this.config, ...newConfig }
    
    // If model changed, reset initialization
    if (newConfig.model && newConfig.model !== oldModel) {
      this.isInitialized = false
      this.generator = null
      this.initializationPromise = null
    }
  }

  /**
   * Build optimized prompts for different content types
   */
  private buildPromptForContentType(contentType: ContentType, userBrief: string): string {
    const templates = {
      blog: `Write an engaging blog post about ${userBrief}. Make it informative and well-structured:\n\n`,
      email: `Write a professional email about ${userBrief}. Keep it clear and concise:\n\n`,
      social: `Write a social media post about ${userBrief}. Make it engaging and shareable:\n\n`,
    }

    return templates[contentType] || `Write about ${userBrief}:\n\n`
  }

  /**
   * Get optimal max length for different content types
   */
  private getMaxLengthForContentType(contentType: ContentType): number {
    const lengths = {
      blog: 400,   // ~300 words
      email: 200,  // ~150 words
      social: 100, // ~75 words
    }

    return lengths[contentType] || 200
  }

  /**
   * Get optimal temperature for different content types
   */
  private getTemperatureForContentType(contentType: ContentType): number {
    const temperatures = {
      blog: 0.8,   // More creative for blog posts
      email: 0.6,  // More conservative for emails
      social: 0.9, // Most creative for social media
    }

    return temperatures[contentType] || 0.7
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.generator = null
    this.isInitialized = false
    this.isLoading = false
    this.initializationPromise = null
  }
}

// Export a default instance
export const aiClient = new AIClient()

/**
 * Convenience function to initialize the AI client
 */
export const initializeAI = (config?: AIClientConfig) => {
  if (config) {
    aiClient.updateConfig(config)
  }
  return aiClient.initialize()
}

/**
 * Convenience function to generate content
 */
export const generateContent = (prompt: string, options?: GenerationOptions) =>
  aiClient.generateContent(prompt, options)

/**
 * Convenience function to generate content for specific types
 */
export const generateContentForType = (
  contentType: ContentType,
  userBrief: string,
  options?: GenerationOptions
) => aiClient.generateContentForType(contentType, userBrief, options)

/**
 * Convenience function to get AI client status
 */
export const getAIStatus = () => aiClient.getStatus() 