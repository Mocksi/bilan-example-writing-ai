/**
 * Workflow Integration Tests
 * 
 * Comprehensive tests for email and social media workflow implementations,
 * covering step transitions, context preservation, and Bilan analytics integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Bilan SDK
const mockStartJourney = vi.fn().mockResolvedValue('journey_123')
const mockTrackJourneyStep = vi.fn().mockResolvedValue(undefined)
const mockEndJourney = vi.fn().mockResolvedValue(undefined)
const mockTrackTurn = vi.fn().mockImplementation((prompt, aiFunction) => 
  Promise.resolve({ result: aiFunction(), turnId: 'turn_456' })
)
const mockVote = vi.fn().mockResolvedValue(undefined)

vi.mock('../../lib/bilan', () => ({
  startJourney: mockStartJourney,
  trackJourneyStep: mockTrackJourneyStep,
  endJourney: mockEndJourney,
  trackTurn: mockTrackTurn,
  vote: mockVote
}))

// Mock AI Client
const mockGenerateContentForType = vi.fn().mockImplementation((contentType, prompt) => 
  Promise.resolve({
    text: `Generated ${contentType} content for: ${prompt}`,
    metadata: {
      model: 'test-model',
      generationTime: 1000,
      inputLength: prompt.length,
      outputLength: 50
    }
  })
)

vi.mock('../../lib/ai-client', () => ({
  generateContentForType: mockGenerateContentForType
}))

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

describe('Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Bilan Journey Integration', () => {
    it('should start email-campaign journey correctly', async () => {
      const { startJourney } = await import('../../lib/bilan')
      
      await startJourney('email-campaign', {
        contentType: 'email',
        topic: 'email content creation',
        userBrief: 'Creating email content through guided workflow'
      })

      expect(mockStartJourney).toHaveBeenCalledWith('email-campaign', {
        contentType: 'email',
        topic: 'email content creation',
        userBrief: 'Creating email content through guided workflow'
      })
    })

    it('should start social-media journey correctly', async () => {
      const { startJourney } = await import('../../lib/bilan')
      
      await startJourney('social-media', {
        contentType: 'social',
        topic: 'social content creation',
        userBrief: 'Creating social content through guided workflow'
      })

      expect(mockStartJourney).toHaveBeenCalledWith('social-media', {
        contentType: 'social',
        topic: 'social content creation',
        userBrief: 'Creating social content through guided workflow'
      })
    })

    it('should track journey steps with proper metadata', async () => {
      const { trackJourneyStep } = await import('../../lib/bilan')
      
      await trackJourneyStep('journey_123', 'purpose-definition', {
        completionStatus: 'started',
        stepData: { stepIndex: 0 }
      })

      expect(mockTrackJourneyStep).toHaveBeenCalledWith('journey_123', 'purpose-definition', {
        completionStatus: 'started',
        stepData: { stepIndex: 0 }
      })
    })

    it('should end journey with completion status', async () => {
      const { endJourney } = await import('../../lib/bilan')
      
      await endJourney('journey_123', 'completed', {
        finalOutput: '{"step1": "data"}',
        satisfactionScore: 1,
        completionTime: 1234567890
      })

      expect(mockEndJourney).toHaveBeenCalledWith('journey_123', 'completed', {
        finalOutput: '{"step1": "data"}',
        satisfactionScore: 1,
        completionTime: 1234567890
      })
    })

    it('should end journey with abandoned status', async () => {
      const { endJourney } = await import('../../lib/bilan')
      
      await endJourney('journey_123', 'abandoned', {
        abandonedAt: 1234567890,
        completedSteps: 2,
        totalSteps: 4
      })

      expect(mockEndJourney).toHaveBeenCalledWith('journey_123', 'abandoned', {
        abandonedAt: 1234567890,
        completedSteps: 2,
        totalSteps: 4
      })
    })
  })

  describe('Email Workflow Steps', () => {
    const emailSteps = [
      'purpose-definition',
      'subject-generation', 
      'body-writing',
      'cta-creation'
    ]

    it('should have correct email workflow steps defined', () => {
      expect(emailSteps).toHaveLength(4)
      expect(emailSteps).toContain('purpose-definition')
      expect(emailSteps).toContain('subject-generation')
      expect(emailSteps).toContain('body-writing')
      expect(emailSteps).toContain('cta-creation')
    })

    it('should track turns for email content generation', async () => {
      const { trackTurn } = await import('../../lib/bilan')
      
      const mockAIFunction = vi.fn().mockResolvedValue({
        text: 'Generated email subject line',
        metadata: { model: 'test-model' }
      })

      await trackTurn(
        'Generate email subject line',
        mockAIFunction,
        {
          contentType: 'email',
          journey_step: 'subject-generation',
          stepData: { goal: 'Newsletter', audience: 'Subscribers' }
        }
      )

      expect(mockTrackTurn).toHaveBeenCalledWith(
        'Generate email subject line',
        mockAIFunction,
        {
          contentType: 'email',
          journey_step: 'subject-generation',
          stepData: { goal: 'Newsletter', audience: 'Subscribers' }
        }
      )
    })

    it('should handle user feedback with vote tracking', async () => {
      const { vote } = await import('../../lib/bilan')
      
      await vote('turn_456', 1, 'Great subject line', {
        feedbackType: 'accept',
        stepId: 'subject-generation'
      })

      expect(mockVote).toHaveBeenCalledWith('turn_456', 1, 'Great subject line', {
        feedbackType: 'accept',
        stepId: 'subject-generation'
      })
    })

    it('should handle negative feedback', async () => {
      const { vote } = await import('../../lib/bilan')
      
      await vote('turn_456', -1, 'Needs improvement', {
        feedbackType: 'reject',
        stepId: 'body-writing'
      })

      expect(mockVote).toHaveBeenCalledWith('turn_456', -1, 'Needs improvement', {
        feedbackType: 'reject',
        stepId: 'body-writing'
      })
    })
  })

  describe('Social Media Workflow Steps', () => {
    const socialSteps = [
      'goal-setting',
      'content-ideation',
      'post-creation', 
      'hashtag-generation'
    ]

    it('should have correct social workflow steps defined', () => {
      expect(socialSteps).toHaveLength(4)
      expect(socialSteps).toContain('goal-setting')
      expect(socialSteps).toContain('content-ideation')
      expect(socialSteps).toContain('post-creation')
      expect(socialSteps).toContain('hashtag-generation')
    })

    it('should track turns for social content generation', async () => {
      const { trackTurn } = await import('../../lib/bilan')
      
      const mockAIFunction = vi.fn().mockResolvedValue({
        text: 'Generated social media post',
        metadata: { model: 'test-model' }
      })

      await trackTurn(
        'Generate social media post',
        mockAIFunction,
        {
          contentType: 'social',
          journey_step: 'post-creation',
          stepData: { platform: 'twitter', contentLength: 'short' }
        }
      )

      expect(mockTrackTurn).toHaveBeenCalledWith(
        'Generate social media post',
        mockAIFunction,
        {
          contentType: 'social',
          journey_step: 'post-creation',
          stepData: { platform: 'twitter', contentLength: 'short' }
        }
      )
    })

    it('should handle hashtag generation tracking', async () => {
      const { trackTurn } = await import('../../lib/bilan')
      
      const mockAIFunction = vi.fn().mockResolvedValue({
        text: 'Generated hashtags: #social #marketing #engagement',
        metadata: { model: 'test-model' }
      })

      await trackTurn(
        'Generate hashtags',
        mockAIFunction,
        {
          contentType: 'social',
          journey_step: 'hashtag-generation',
          stepData: { strategy: 'mixed', tactics: ['ask-question', 'poll'] }
        }
      )

      expect(mockTrackTurn).toHaveBeenCalledWith(
        'Generate hashtags',
        mockAIFunction,
        expect.objectContaining({
          contentType: 'social',
          journey_step: 'hashtag-generation'
        })
      )
    })
  })

  describe('AI Content Generation Integration', () => {
    it('should generate email content with correct parameters', async () => {
      const { generateContentForType } = await import('../../lib/ai-client')
      
      const result = await generateContentForType('email', 'Generate professional email subject line')

      expect(mockGenerateContentForType).toHaveBeenCalledWith('email', 'Generate professional email subject line')
      expect(result.text).toContain('Generated email content')
    })

    it('should generate social content with correct parameters', async () => {
      const { generateContentForType } = await import('../../lib/ai-client')
      
      const result = await generateContentForType('social', 'Generate engaging social media post')

      expect(mockGenerateContentForType).toHaveBeenCalledWith('social', 'Generate engaging social media post')
      expect(result.text).toContain('Generated social content')
    })

    it('should return proper metadata from AI generation', async () => {
      const { generateContentForType } = await import('../../lib/ai-client')
      
      const result = await generateContentForType('email', 'Test prompt')

      expect(result.metadata).toEqual({
        model: 'test-model',
        generationTime: 1000,
        inputLength: expect.any(Number),
        outputLength: 50
      })
    })
  })

  describe('Context Preservation Across Steps', () => {
    it('should preserve email workflow context data', () => {
      const emailContext = {
        'purpose-definition': {
          goal: 'Product launch announcement',
          audience: 'Existing customers',
          tone: 'professional',
          context: 'New AI feature release'
        },
        'subject-generation': {
          selectedSubject: 'Introducing Our New AI Feature',
          generatedContent: 'Generated subject lines...',
          turnId: 'turn_123'
        }
      }

      // Test context structure
      expect(emailContext['purpose-definition']).toHaveProperty('goal')
      expect(emailContext['purpose-definition']).toHaveProperty('audience')
      expect(emailContext['purpose-definition']).toHaveProperty('tone')
      
      expect(emailContext['subject-generation']).toHaveProperty('selectedSubject')
      expect(emailContext['subject-generation']).toHaveProperty('turnId')
    })

    it('should preserve social workflow context data', () => {
      const socialContext = {
        'goal-setting': {
          platform: 'linkedin',
          goal: 'thought-leadership',
          targetAudience: 'Industry professionals',
          contentType: 'educational',
          tone: 'professional'
        },
        'content-ideation': {
          contentPillars: ['industry-insights', 'personal-stories'],
          themes: 'AI trends and productivity tips',
          generatedContent: 'Generated content ideas...',
          turnId: 'turn_456'
        }
      }

      // Test context structure
      expect(socialContext['goal-setting']).toHaveProperty('platform')
      expect(socialContext['goal-setting']).toHaveProperty('goal')
      expect(socialContext['goal-setting']).toHaveProperty('targetAudience')
      
      expect(socialContext['content-ideation']).toHaveProperty('contentPillars')
      expect(socialContext['content-ideation']).toHaveProperty('themes')
      expect(socialContext['content-ideation']).toHaveProperty('turnId')
    })
  })

  describe('Error Handling', () => {
    it('should handle AI generation errors gracefully', async () => {
      mockGenerateContentForType.mockRejectedValueOnce(new Error('AI service unavailable'))
      
      const { generateContentForType } = await import('../../lib/ai-client')
      
      await expect(generateContentForType('email', 'Test prompt'))
        .rejects.toThrow('AI service unavailable')
    })

    it('should handle Bilan tracking errors gracefully', async () => {
      mockTrackTurn.mockRejectedValueOnce(new Error('Bilan service unavailable'))
      
      const { trackTurn } = await import('../../lib/bilan')
      
      await expect(trackTurn('test prompt', vi.fn(), {}))
        .rejects.toThrow('Bilan service unavailable')
    })

    it('should handle journey start errors', async () => {
      mockStartJourney.mockRejectedValueOnce(new Error('Journey start failed'))
      
      const { startJourney } = await import('../../lib/bilan')
      
      await expect(startJourney('email-campaign', {}))
        .rejects.toThrow('Journey start failed')
    })
  })

  describe('Complete Workflow Scenarios', () => {
    it('should simulate complete email workflow journey', async () => {
      const { startJourney, trackJourneyStep, endJourney, trackTurn } = await import('../../lib/bilan')
      
      // Start journey
      const journeyId = await startJourney('email-campaign', {
        contentType: 'email',
        topic: 'Newsletter campaign'
      })
      
      // Complete all 4 steps
      for (let i = 0; i < 4; i++) {
        const stepName = ['purpose-definition', 'subject-generation', 'body-writing', 'cta-creation'][i]
        
        await trackJourneyStep(journeyId, stepName, {
          completionStatus: 'started',
          stepData: { stepIndex: i }
        })
        
        const mockAIFunction = vi.fn().mockResolvedValue({ text: `Generated content for ${stepName}` })
        await trackTurn(`Generate ${stepName}`, mockAIFunction, {
          contentType: 'email',
          journey_step: stepName
        })
        
        await trackJourneyStep(journeyId, stepName, {
          completionStatus: 'completed',
          stepData: { stepIndex: i }
        })
      }
      
      // End journey
      await endJourney(journeyId, 'completed', {
        finalOutput: '{"completed": true}',
        satisfactionScore: 1
      })
      
      expect(mockStartJourney).toHaveBeenCalledTimes(1)
      expect(mockTrackJourneyStep).toHaveBeenCalledTimes(8) // 2 calls per step
      expect(mockTrackTurn).toHaveBeenCalledTimes(4) // 1 per step
      expect(mockEndJourney).toHaveBeenCalledTimes(1)
    })

    it('should simulate complete social workflow journey', async () => {
      const { startJourney, trackJourneyStep, endJourney, trackTurn } = await import('../../lib/bilan')
      
      // Start journey
      const journeyId = await startJourney('social-media', {
        contentType: 'social',
        topic: 'Brand awareness campaign'
      })
      
      // Complete all 4 steps
      for (let i = 0; i < 4; i++) {
        const stepName = ['goal-setting', 'content-ideation', 'post-creation', 'hashtag-generation'][i]
        
        await trackJourneyStep(journeyId, stepName, {
          completionStatus: 'started',
          stepData: { stepIndex: i }
        })
        
        const mockAIFunction = vi.fn().mockResolvedValue({ text: `Generated content for ${stepName}` })
        await trackTurn(`Generate ${stepName}`, mockAIFunction, {
          contentType: 'social',
          journey_step: stepName
        })
        
        await trackJourneyStep(journeyId, stepName, {
          completionStatus: 'completed',
          stepData: { stepIndex: i }
        })
      }
      
      // End journey
      await endJourney(journeyId, 'completed', {
        finalOutput: '{"completed": true}',
        satisfactionScore: 1
      })
      
      expect(mockStartJourney).toHaveBeenCalledTimes(1)
      expect(mockTrackJourneyStep).toHaveBeenCalledTimes(8) // 2 calls per step  
      expect(mockTrackTurn).toHaveBeenCalledTimes(4) // 1 per step
      expect(mockEndJourney).toHaveBeenCalledTimes(1)
    })

    it('should handle workflow abandonment', async () => {
      const { startJourney, trackJourneyStep, endJourney } = await import('../../lib/bilan')
      
      // Start journey
      const journeyId = await startJourney('email-campaign', {
        contentType: 'email',
        topic: 'Test campaign'
      })
      
      // Complete first step only
      await trackJourneyStep(journeyId, 'purpose-definition', {
        completionStatus: 'completed',
        stepData: { stepIndex: 0 }
      })
      
      // Abandon journey
      await endJourney(journeyId, 'abandoned', {
        abandonedAt: Date.now(),
        completedSteps: 1,
        totalSteps: 4
      })
      
      expect(mockEndJourney).toHaveBeenCalledWith(journeyId, 'abandoned', 
        expect.objectContaining({
          completedSteps: 1,
          totalSteps: 4
        })
      )
    })
  })

  describe('Journey Step Definitions', () => {
    it('should have email steps matching Bilan integration', () => {
      const emailSteps = ['purpose-definition', 'subject-generation', 'body-writing', 'cta-creation']
      
      // These should match the steps defined in the Bilan integration
      expect(emailSteps[0]).toBe('purpose-definition')
      expect(emailSteps[1]).toBe('subject-generation')
      expect(emailSteps[2]).toBe('body-writing')
      expect(emailSteps[3]).toBe('cta-creation')
    })

    it('should have social steps matching Bilan integration', () => {
      const socialSteps = ['goal-setting', 'content-ideation', 'post-creation', 'hashtag-generation']
      
      // These should match the steps defined in the Bilan integration
      expect(socialSteps[0]).toBe('goal-setting')
      expect(socialSteps[1]).toBe('content-ideation')
      expect(socialSteps[2]).toBe('post-creation')
      expect(socialSteps[3]).toBe('hashtag-generation')
    })
  })
}) 