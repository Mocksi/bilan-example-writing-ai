/**
 * Transformers.js Integration Tests
 * 
 * Basic tests for AI client, content generation service, and prompt engineering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIClient } from '../ai-client'
import { ContentGenerationService } from '../content-generation'
import { PromptEngineer } from '../prompts'
import { AIErrorHandler, AIErrorType } from '../ai-error-handling'

// Mock transformers module
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue({
    __call: vi.fn().mockResolvedValue([{
      generated_text: 'Test prompt\n\nThis is a generated blog post about AI development best practices.'
    }])
  })
}))

describe('AIClient', () => {
  let aiClient: AIClient

  beforeEach(() => {
    aiClient = new AIClient()
  })

  it('should initialize with default configuration', () => {
    const status = aiClient.getStatus()
    expect(status.model).toBe('Xenova/distilgpt2')
    expect(status.isInitialized).toBe(false)
    expect(status.isLoading).toBe(false)
  })

  it('should update configuration correctly', () => {
    aiClient.updateConfig({ model: 'test-model', temperature: 0.5 })
    const status = aiClient.getStatus()
    expect(status.model).toBe('test-model')
  })

  it('should generate content with proper structure', async () => {
    // Mock the generator method
    const mockGenerator = vi.fn().mockResolvedValue([{
      generated_text: 'Test input\n\nGenerated content here'
    }])
    
    // Mock the pipeline creation
    vi.doMock('@xenova/transformers', () => ({
      pipeline: vi.fn().mockResolvedValue(mockGenerator)
    }))

    const result = await aiClient.generateContent('Test input')
    
    expect(result).toHaveProperty('text')
    expect(result).toHaveProperty('metadata')
    expect(result.metadata).toHaveProperty('model')
    expect(result.metadata).toHaveProperty('generationTime')
  })

  it('should handle content type specific generation', async () => {
    // Mock the pipeline function that will be called during generation
    // The mock should return a function that returns the expected format
    const mockPipeline = vi.fn().mockImplementation((prompt: string) => {
      return [{
        generated_text: prompt + '\n\nThis is a comprehensive blog post about AI development best practices.'
      }]
    })
    
    // Mock the transformers module
    const mockTransformers = {
      pipeline: vi.fn().mockResolvedValue(mockPipeline)
    }
    
    // Create AIClient with injected mock transformers module
    const testClient = new AIClient({}, mockTransformers)

    // Initialize the client properly through its public API
    await testClient.initialize()
    
    const result = await testClient.generateContentForType('blog', 'AI development')
    
    expect(result.text).toBeTruthy()
    expect(result.text).toContain('comprehensive blog post')
    expect(result.metadata.model).toBe('Xenova/distilgpt2')
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
      sessionId: 'session_123' as any,
      iterationId: 'iter_456' as any
    }

    // Configure mock behavior
    mockAIClient.generateContentForType.mockResolvedValue({
      text: 'Generated blog content',
      metadata: {
        model: 'test-model',
        generationTime: 1000,
        inputLength: 20,
        outputLength: 100
      }
    })

    const result = await service.generateContent(request)

    expect(result.content).toBe('Generated blog content')
    expect(result.metadata.sessionId).toBe('session_123')
    expect(result.metadata.contentType).toBe('blog')
  })

  it('should handle service health checks', async () => {
    // Configure mock behavior
    mockAIClient.getStatus.mockReturnValue({
      isInitialized: true,
      isLoading: false,
      model: 'test-model'
    })

    const health = await service.checkServiceHealth()

    expect(health.isHealthy).toBe(true)
    expect(health.isInitialized).toBe(true)
    expect(health.model).toBe('test-model')
  })

  it('should generate multiple variations', async () => {
    const request = {
      contentType: 'email' as const,
      userBrief: 'Follow-up email',
      sessionId: 'session_789' as any,
      iterationId: 'iter_101' as any
    }

    // Configure mock behavior for multiple calls
    mockAIClient.generateContentForType
      .mockResolvedValueOnce({
        text: 'Email variation 1',
        metadata: { model: 'test', generationTime: 500, inputLength: 10, outputLength: 50 }
      })
      .mockResolvedValueOnce({
        text: 'Email variation 2',
        metadata: { model: 'test', generationTime: 600, inputLength: 10, outputLength: 55 }
      })

    const variations = await service.generateVariations(request, 2)

    expect(variations).toHaveLength(2)
    expect(variations[0].content).toBe('Email variation 1')
    expect(variations[1].content).toBe('Email variation 2')
  })
})

describe('PromptEngineer', () => {
  let promptEngineer: PromptEngineer

  beforeEach(() => {
    promptEngineer = new PromptEngineer()
  })

  it('should build prompts with context', () => {
    const context = {
      contentType: 'blog' as const,
      userBrief: 'Machine learning basics',
      tone: 'casual' as const,
      length: 'medium' as const
    }

    const result = promptEngineer.buildPrompt(context)

    expect(result.fullPrompt).toContain('Machine learning basics')
    expect(result.metadata.template).toBe('blog')
    expect(result.metadata.contextUsed).toContain('tone')
    expect(result.metadata.contextUsed).toContain('length')
  })

  it('should validate prompt context', () => {
    const validContext = {
      contentType: 'email' as const,
      userBrief: 'Project update'
    }

    const invalidContext = {
      contentType: 'invalid' as any,
      userBrief: ''
    }

    const validResult = promptEngineer.validateContext(validContext)
    const invalidResult = promptEngineer.validateContext(invalidContext)

    expect(validResult.isValid).toBe(true)
    expect(validResult.errors).toHaveLength(0)

    expect(invalidResult.isValid).toBe(false)
    expect(invalidResult.errors.length).toBeGreaterThan(0)
  })

  it('should build refinement prompts', () => {
    const result = promptEngineer.buildRefinementPrompt(
      'Original content here',
      'Make it more casual',
      'blog'
    )

    expect(result.fullPrompt).toContain('Original content here')
    expect(result.fullPrompt).toContain('Make it more casual')
    expect(result.metadata.template).toBe('blog-refinement')
  })

  it('should get available templates', () => {
    const templates = promptEngineer.getAvailableTemplates()
    expect(templates).toContain('blog')
    expect(templates).toContain('email')
    expect(templates).toContain('social')
  })
})

describe('AIErrorHandler', () => {
  let errorHandler: AIErrorHandler

  beforeEach(() => {
    errorHandler = new AIErrorHandler()
  })

  it('should classify model loading errors', () => {
    const error = new Error('Failed to load model')
    const aiError = errorHandler.handleError(error)

    expect(aiError.type).toBe(AIErrorType.MODEL_LOADING_FAILED)
    expect(aiError.recoverable).toBe(true)
    expect(aiError.suggestedActions.length).toBeGreaterThan(0)
  })

  it('should classify network errors', () => {
    const error = new Error('Network connection failed')
    const aiError = errorHandler.handleError(error)

    expect(aiError.type).toBe(AIErrorType.NETWORK_ERROR)
    expect(aiError.recoverable).toBe(true)
  })

  it('should determine retry strategy', () => {
    const error = new Error('Generation failed')
    const aiError = errorHandler.handleError(error)
    const strategy = errorHandler.getRecoveryStrategy(aiError)

    expect(strategy.retryable).toBe(true)
    expect(strategy.maxRetries).toBeGreaterThan(0)
  })

  it('should track retry attempts', () => {
    const error = new Error('Timeout error')
    const aiError = errorHandler.handleError(error)
    const operationId = 'test-operation'

    expect(errorHandler.shouldRetry(aiError, operationId)).toBe(true)
    
    errorHandler.recordRetryAttempt(operationId)
    expect(errorHandler.shouldRetry(aiError, operationId)).toBe(true)
    
    errorHandler.recordRetryAttempt(operationId)
    errorHandler.recordRetryAttempt(operationId)
    expect(errorHandler.shouldRetry(aiError, operationId)).toBe(false)
  })

  it('should check browser support', () => {
    const support = errorHandler.checkBrowserSupport()
    expect(support).toHaveProperty('supported')
    expect(support).toHaveProperty('missing')
    expect(Array.isArray(support.missing)).toBe(true)
  })

  it('should format user-friendly error messages', () => {
    const error = new Error('Model initialization failed')
    const aiError = errorHandler.handleError(error)
    const formatted = errorHandler.formatUserError(aiError)

    expect(formatted).toContain(aiError.userMessage)
    expect(formatted).toContain('•') // Should contain bullet points for actions
  })
}) 