/**
 * Ollama API client for local AI content generation
 * 
 * Provides a TypeScript interface to the Ollama API running on localhost:11434
 * Includes health checks, model verification, and error handling.
 */

// Environment variables - using process.env directly to avoid import issues
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'tinyllama'

export interface OllamaHealthStatus {
  isAvailable: boolean
  models: string[]
  error?: string
}

export interface OllamaGenerateRequest {
  model: string
  prompt: string
  stream?: boolean
  options?: {
    temperature?: number
    top_p?: number
    top_k?: number
    max_tokens?: number
  }
}

export interface OllamaGenerateResponse {
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

export interface OllamaModel {
  name: string
  modified_at: string
  size: number
  digest: string
}

export interface OllamaModelsResponse {
  models: OllamaModel[]
}

/**
 * Ollama API client class
 */
export class OllamaClient {
  private baseUrl: string
  private defaultModel: string

  constructor(baseUrl?: string, defaultModel?: string) {
    this.baseUrl = baseUrl || OLLAMA_HOST
    this.defaultModel = defaultModel || OLLAMA_MODEL
  }

  /**
   * Check if Ollama service is available and get available models
   */
  async checkHealth(): Promise<OllamaHealthStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return {
          isAvailable: false,
          models: [],
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data: OllamaModelsResponse = await response.json()
      const modelNames = data.models.map(model => model.name)

      return {
        isAvailable: true,
        models: modelNames,
      }
    } catch (error) {
      return {
        isAvailable: false,
        models: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Verify that the specified model is available
   */
  async verifyModel(modelName?: string): Promise<boolean> {
    const model = modelName || this.defaultModel
    const health = await this.checkHealth()
    
    if (!health.isAvailable) {
      return false
    }

    return health.models.some(availableModel => 
      availableModel.includes(model) || model.includes(availableModel)
    )
  }

  /**
   * Generate content using Ollama
   */
  async generate(request: Partial<OllamaGenerateRequest>): Promise<OllamaGenerateResponse> {
    if (!request.prompt) {
      throw new Error('Prompt is required for content generation')
    }

    const fullRequest: OllamaGenerateRequest = {
      model: this.defaultModel,
      prompt: request.prompt,
      stream: false,
      ...request,
    }

    // Verify model is available before making request
    const modelAvailable = await this.verifyModel(fullRequest.model)
    if (!modelAvailable) {
      throw new Error(`Model '${fullRequest.model}' is not available. Please ensure it's installed in Ollama.`)
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullRequest),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data: OllamaGenerateResponse = await response.json()
      return data
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Failed to generate content: ${String(error)}`)
    }
  }

  /**
   * Generate content with streaming support
   * Returns an async generator that yields partial responses
   */
  async* generateStream(request: Partial<OllamaGenerateRequest>): AsyncGenerator<OllamaGenerateResponse, void, unknown> {
    if (!request.prompt) {
      throw new Error('Prompt is required for content generation')
    }

    const fullRequest: OllamaGenerateRequest = {
      model: this.defaultModel,
      prompt: request.prompt,
      stream: true,
      ...request,
    }

    // Verify model is available before making request
    const modelAvailable = await this.verifyModel(fullRequest.model)
    if (!modelAvailable) {
      throw new Error(`Model '${fullRequest.model}' is not available. Please ensure it's installed in Ollama.`)
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullRequest),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body received from Ollama')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())

          for (const line of lines) {
            try {
              const data: OllamaGenerateResponse = JSON.parse(line)
              yield data
              
              if (data.done) {
                return
              }
            } catch (parseError) {
              // Skip malformed JSON lines
              continue
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Failed to generate streaming content: ${String(error)}`)
    }
  }

  /**
   * Get the default model name
   */
  getDefaultModel(): string {
    return this.defaultModel
  }

  /**
   * Set the default model name
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl
  }
}

// Export a default instance
export const ollamaClient = new OllamaClient()

/**
 * Convenience function to check Ollama health
 */
export const checkOllamaHealth = () => ollamaClient.checkHealth()

/**
 * Convenience function to verify model availability
 */
export const verifyOllamaModel = (model?: string) => ollamaClient.verifyModel(model)

/**
 * Convenience function to generate content
 */
export const generateContent = (request: Partial<OllamaGenerateRequest>) => 
  ollamaClient.generate(request)

/**
 * Convenience function to generate streaming content
 */
export const generateContentStream = (request: Partial<OllamaGenerateRequest>) => 
  ollamaClient.generateStream(request) 