/**
 * WebLLM Integration Tests
 * 
 * Basic tests for AI client, content generation service, and WebLLM integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIClient } from '../ai-client'
import { ContentGenerationService } from '../content-generation'
import { AIErrorHandler, AIErrorType } from '../ai-error-handling'
import { createSessionId, createIterationId } from '../../types'

// Mock WebLLM module
vi.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: vi.fn().mockResolvedValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              role: 'assistant',
              content: 'This is a generated blog post about AI development best practices.'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 30,
            total_tokens: 50
          }
        })
      }
    },
    unload: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    getRuntimeStats: vi.fn().mockReturnValue({
      prefillThroughput: 100,
      decodingThroughput: 50
    })
  }),
  prebuiltAppConfig: {
    model_list: []
  }
}))

describe('AIClient', () => {
  let aiClient: AIClient

  beforeEach(() => {
    aiClient = new AIClient()
    // Reset any global WebLLM state
    vi.clearAllMocks()
  })

  it('should initialize with default configuration', () => {
    const status = aiClient.getStatus()
    expect(status.model).toBe('Llama-3.2-1B-Instruct-q4f32_1-MLC')
    expect(status.isInitialized).toBe(false)
    expect(status.isLoading).toBe(false)
  })

  it('should update configuration correctly', () => {
    aiClient.updateConfig({ model: 'test-model', temperature: 0.5 })
    const status = aiClient.getStatus()
    expect(status.model).toBe('test-model')
  })

  it('should support WebLLM model configurations', () => {
    // Test Llama 1B model
    const llama1BClient = new AIClient({ model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC' })
    const llama1BStatus = llama1BClient.getStatus()
    expect(llama1BStatus.config.model).toBe('Llama-3.2-1B-Instruct-q4f32_1-MLC')

    // Test Llama 3B model
    const llama3BClient = new AIClient({ model: 'Llama-3.2-3B-Instruct-q4f32_1-MLC' })
    const llama3BStatus = llama3BClient.getStatus()
    expect(llama3BStatus.config.model).toBe('Llama-3.2-3B-Instruct-q4f32_1-MLC')

    // Test Gemma model
    const gemmaClient = new AIClient({ model: 'gemma-2-2b-it-q4f32_1-MLC' })
    const gemmaStatus = gemmaClient.getStatus()
    expect(gemmaStatus.config.model).toBe('gemma-2-2b-it-q4f32_1-MLC')
  })

  it('should generate content with proper structure', async () => {
    // Mock the WebLLM engine
    const mockEngine = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                role: 'assistant',
                content: 'Generated content here'
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 15,
              total_tokens: 25
            }
          })
        }
      },
      unload: vi.fn(),
      reload: vi.fn(),
      getRuntimeStats: vi.fn().mockReturnValue({ prefillThroughput: 100, decodingThroughput: 50 })
    }
    
    // Mock the WebLLM module
    const mockWebLLM = {
      CreateMLCEngine: vi.fn().mockResolvedValue(mockEngine),
      prebuiltAppConfig: {
        model_list: []
      }
    }
    
    // Create isolated client for this test
    const testClient = new AIClient({}, mockWebLLM)
    await testClient.initialize()

    const result = await testClient.generateContent('Test input')
    
    expect(result).toHaveProperty('text')
    expect(result).toHaveProperty('metadata')
    expect(result.metadata).toHaveProperty('model')
    expect(result.metadata).toHaveProperty('generationTime')
    expect(result.metadata).toHaveProperty('tokenCount')
    expect(result.metadata).toHaveProperty('promptTokens')
  })

  it('should handle content type specific generation', async () => {
    // Mock the WebLLM engine that will be called during generation
    const mockEngine = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                role: 'assistant',
                content: 'This is a comprehensive blog post about AI development best practices.'
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 25,
              completion_tokens: 35,
              total_tokens: 60
            }
          })
        }
      },
      unload: vi.fn(),
      reload: vi.fn(),
      getRuntimeStats: vi.fn().mockReturnValue({ prefillThroughput: 100, decodingThroughput: 50 })
    }
    
    // Mock the WebLLM module
    const mockWebLLM = {
      CreateMLCEngine: vi.fn().mockResolvedValue(mockEngine),
      prebuiltAppConfig: {
        model_list: []
      }
    }
    
    // Create AIClient with injected mock WebLLM module
    const testClient = new AIClient({}, mockWebLLM)

    // Initialize the client properly through its public API
    await testClient.initialize()
    
    const result = await testClient.generateContentForType('blog', 'AI development')
    
    expect(result.text).toBeTruthy()
    expect(result.metadata.model).toBe('Llama-3.2-1B-Instruct-q4f32_1-MLC')
    // Checking that tokenCount is populated (exact value depends on mock setup)
    expect(result.metadata.tokenCount).toBeGreaterThan(0)
  })

  it('should provide available models', () => {
    const models = aiClient.getAvailableModels()
    expect(models).toHaveProperty('Llama-3.2-1B-Instruct-q4f32_1-MLC')
    expect(models).toHaveProperty('Llama-3.2-3B-Instruct-q4f32_1-MLC')
    expect(models).toHaveProperty('gemma-2-2b-it-q4f32_1-MLC')
  })

  it('should track download progress', async () => {
    let progressUpdates: number[] = []
    
    const progressCallback = (progress: any) => {
      progressUpdates.push(progress.progress || 0)
    }
    
    const clientWithProgress = new AIClient({ progressCallback })
    const status = clientWithProgress.getStatus()
    
    expect(status.downloadProgress).toBe(0)
  })
})

describe('ContentGenerationService', () => {
  let service: ContentGenerationService
  let mockAIClient: any

  beforeEach(() => {
    // Create mock AI client
    mockAIClient = {
      generateContentForType: vi.fn(),
      getStatus: vi.fn(),
      initialize: vi.fn()
    }
    
    // Inject mock client through constructor
    service = new ContentGenerationService(mockAIClient)
  })

  it('should process content generation requests', async () => {
    const request = {
      contentType: 'blog' as const,
      userBrief: 'AI development best practices',
      sessionId: createSessionId('session_123'),
      iterationId: createIterationId('iter_456')
    }

    // Configure mock behavior
    mockAIClient.generateContentForType.mockResolvedValue({
      text: 'Generated blog content',
      metadata: {
        model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
        generationTime: 1000,
        inputLength: 20,
        outputLength: 100,
        tokenCount: 50,
        promptTokens: 15
      }
    })

    const result = await service.generateContent(request)

    expect(result.content).toBe('Generated blog content')
    expect(result.metadata.sessionId).toBe('session_123')
    expect(result.metadata.contentType).toBe('blog')
    expect(result.metadata.model).toBe('Llama-3.2-1B-Instruct-q4f32_1-MLC')
  })

  it('should handle service health checks', async () => {
    // Configure mock behavior
    mockAIClient.getStatus.mockReturnValue({
      isInitialized: true,
      isLoading: false,
      model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
      downloadProgress: 100
    })

    const health = await service.checkServiceHealth()

    expect(health.isHealthy).toBe(true)
    expect(health.isInitialized).toBe(true)
    expect(health.model).toBe('Llama-3.2-1B-Instruct-q4f32_1-MLC')
  })
})

describe('Error Handling', () => {
  it('should handle WebLLM initialization errors', async () => {
    const errorHandler = new AIErrorHandler()
    const mockError = new Error('Failed to load WebLLM model')
    
    const aiError = errorHandler.handleError(mockError, { operation: 'initialization' })
    
    expect(aiError.type).toBe(AIErrorType.MODEL_LOADING_FAILED)
    expect(aiError.recoverable).toBe(true)
    expect(aiError.userMessage).toContain('AI model')
  })

  it('should provide model-specific error recovery', async () => {
    const errorHandler = new AIErrorHandler()
    const mockError = new Error('Model not found: invalid-model-id')
    
    const aiError = errorHandler.handleError(mockError, { operation: 'initialization' })
    const recovery = errorHandler.getRecoveryStrategy(aiError)
    
    expect(recovery.canRecover).toBe(false)
    expect(recovery.fallbackAvailable).toBe(true)
  })
}) 