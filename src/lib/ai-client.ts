/**
 * WebLLM AI client for local content generation
 * 
 * Provides a TypeScript interface to WebLLM for completely local
 * AI inference without any external services or APIs.
 */

import type { ContentType } from '../types'
import type { 
  WebLLMModule, 
  WebLLMEngine, 
  WebLLMModelId,
  ModelInitProgressCallback,
  MLCEngineConfig
} from '../types/webllm'
import { WEBLLM_MODELS } from '../types/webllm'

// Dynamic import to avoid TypeScript issues
let webllm: WebLLMModule | null = null

export interface AIClientConfig {
  model?: string
  maxLength?: number
  temperature?: number
  topP?: number
  progressCallback?: ModelInitProgressCallback
}

export interface GenerationOptions {
  maxLength?: number
  temperature?: number
  doSample?: boolean
  topK?: number
  topP?: number
  repetitionPenalty?: number
  stop?: string[]
}

export interface GenerationResponse {
  text: string
  metadata: {
    model: string
    generationTime: number
    inputLength: number
    outputLength: number
    tokenCount?: number
    promptTokens?: number
  }
}

export interface AIClientStatus {
  isInitialized: boolean
  isLoading: boolean
  model: string
  error?: string
  config: Required<AIClientConfig>
  downloadProgress?: number
}

/**
 * AI client using WebLLM for local inference
 */
export class AIClient {
  private engine: WebLLMEngine | null = null
  private isInitialized = false
  private isLoading = false
  private downloadProgress = 0
  private config: Required<AIClientConfig>
  private initializationPromise: Promise<void> | null = null
  private webllmModule: WebLLMModule | null = null

  constructor(config: AIClientConfig = {}, webllmModule?: WebLLMModule) {
    this.config = {
      model: config.model || 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
      maxLength: config.maxLength || 200,
      temperature: config.temperature || 0.7,
      topP: config.topP || 0.9,
      progressCallback: config.progressCallback || this.defaultProgressCallback.bind(this),
    }
    this.webllmModule = webllmModule || null
  }

  /**
   * Default progress callback for model loading
   */
  private defaultProgressCallback(progress: any) {
    this.downloadProgress = progress.progress || 0
    if (this.config.progressCallback && this.config.progressCallback !== this.defaultProgressCallback) {
      this.config.progressCallback(progress)
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
      this.downloadProgress = 0
      
      // Log model loading for debugging
      console.info('Loading AI model:', this.config.model)
      
      // Dynamic import of WebLLM
      if (!webllm) {
        const webllmImport = this.webllmModule || (await import('@mlc-ai/web-llm'))
        webllm = webllmImport as WebLLMModule
      }
      
      // Ensure webllm is not null
      if (!webllm) {
        throw new Error('Failed to load WebLLM module')
      }
      
      // Create WebLLM engine with progress callback
      const engineConfig: MLCEngineConfig = {
        initProgressCallback: this.defaultProgressCallback,
        logLevel: 'INFO'
      }
      
      this.engine = await webllm.CreateMLCEngine(this.config.model, engineConfig)
      
      this.isInitialized = true
      this.isLoading = false
      this.downloadProgress = 100
      
      console.info(`AI model loaded successfully: ${this.config.model}`)
    } catch (error) {
      this.isLoading = false
      this.downloadProgress = 0
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

    if (!this.engine) {
      throw new Error('AI model not initialized')
    }

    const startTime = Date.now()
    const inputLength = prompt.length

    try {
      // Build messages for chat completion
      const messages = [
        {
          role: 'user' as const,
          content: prompt
        }
      ]

      const chatRequest = {
        messages,
        temperature: options.temperature ?? this.config.temperature,
        top_p: options.topP ?? this.config.topP,
        max_tokens: options.maxLength ?? this.config.maxLength,
        stop: options.stop || undefined
      }

      const result = await this.engine.chat.completions.create(chatRequest)
      
      // Extract generated text
      const generatedText = result.choices[0]?.message?.content || ''
      const generationTime = Date.now() - startTime

      return {
        text: generatedText,
        metadata: {
          model: this.config.model,
          generationTime,
          inputLength,
          outputLength: generatedText.length,
          tokenCount: result.usage?.total_tokens,
          promptTokens: result.usage?.prompt_tokens,
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
      downloadProgress: this.downloadProgress,
    }
  }

  /**
   * Update configuration (requires reinitialization if model changes)
   */
  updateConfig(newConfig: Partial<AIClientConfig>): void {
    const oldModel = this.config.model
    this.config = { 
      ...this.config, 
      ...newConfig,
      progressCallback: newConfig.progressCallback || this.config.progressCallback
    }
    
    // If model changed, reset initialization
    if (newConfig.model && newConfig.model !== oldModel) {
      this.isInitialized = false
      this.engine = null
      this.initializationPromise = null
      this.downloadProgress = 0
    }
  }

  /**
   * Build optimized prompts for different content types
   */
  private buildPromptForContentType(contentType: ContentType, userBrief: string): string {
    const templates = {
      blog: `Write an engaging blog post about ${userBrief}. Make it informative and well-structured with a clear introduction, body, and conclusion.`,
      email: `Write a professional email about ${userBrief}. Keep it clear, concise, and appropriate for business communication.`,
      social: `Write a social media post about ${userBrief}. Make it engaging, shareable, and suitable for social platforms.`,
    }

    return templates[contentType] || `Write about ${userBrief}.`
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
   * Get available models
   */
  getAvailableModels() {
    return WEBLLM_MODELS
  }

  /**
   * Switch to a different model
   */
  async switchModel(modelId: WebLLMModelId): Promise<void> {
    if (this.engine && this.isInitialized) {
      await this.engine.reload(modelId)
      this.config.model = modelId
    } else {
      this.updateConfig({ model: modelId })
    }
  }

  /**
   * Get runtime statistics
   */
  getRuntimeStats() {
    if (this.engine && this.isInitialized) {
      return this.engine.getRuntimeStats()
    }
    return {
      prefillThroughput: 0,
      decodingThroughput: 0
    }
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.engine) {
      await this.engine.unload()
    }
    this.engine = null
    this.isInitialized = false
    this.isLoading = false
    this.initializationPromise = null
    this.downloadProgress = 0
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