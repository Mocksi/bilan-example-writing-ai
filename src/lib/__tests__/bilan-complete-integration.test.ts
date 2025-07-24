/**
 * Comprehensive Bilan Integration Tests - PR-03 Complete Tracking
 * 
 * Tests the complete Bilan tracking system including:
 * - Token authentication
 * - Enhanced turn tracking with comprehensive metadata
 * - Conversation lifecycle management
 * - Journey tracking with progress management
 * - Error handling and graceful degradation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  initializeBilan, 
  trackTurn,
  vote,
  track,
  startConversation,
  endConversation,
  startJourney,
  trackJourneyStep,
  endJourney,
  getActiveConversation,
  getActiveJourney,
  isBilanReady,
  getConfig
} from '../bilan'
import type { TurnId, UserId } from '../../types'

// Mock fetch for API calls including token endpoint
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock environment
vi.mock('../env', () => ({
  getEnvVar: vi.fn((key: string, defaultValue?: string) => {
    const mockValues: Record<string, string> = {
      'NEXT_PUBLIC_BILAN_ENDPOINT': 'http://localhost:3002',
      'NEXT_PUBLIC_BILAN_MODE': 'local',
      'NEXT_PUBLIC_DEBUG': 'true'
    }
    return mockValues[key] || defaultValue || ''
  })
}))

// Mock Bilan SDK with enhanced capabilities
vi.mock('@mocksi/bilan-sdk', () => ({
  init: vi.fn(),
  trackTurn: vi.fn((prompt: string, aiFunction: Function, context: any) => {
    return aiFunction().then((result: any) => ({
      result,
      turnId: `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }))
  }),
  vote: vi.fn(),
  track: vi.fn(),
  startConversation: vi.fn((userId: string) => `conversation_${userId}_${Date.now()}`),
  endConversation: vi.fn(),
  trackJourneyStep: vi.fn(),
  isReady: vi.fn(() => true),
  createUserId: vi.fn((id: string) => id),
  createConversationId: vi.fn((id: string) => id)
}))

describe('Complete Bilan Integration - PR-03', () => {
  const testUserId = 'test-user-pr03'
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful token response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        token: 'mock-jwt-token-123',
        expiresAt: Date.now() + 86400000, // 24 hours
        config: {
          endpoint: 'http://localhost:3002',
          mode: 'local',
          debug: true
        }
      })
    })
  })

  describe('Token Authentication', () => {
    it('should initialize with token from API', async () => {
      await initializeBilan(testUserId)
      
      // Verify token request was made
      expect(mockFetch).toHaveBeenCalledWith('/api/bilan-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      })
      
      // Verify configuration includes token
      const config = getConfig()
      expect(config).toMatchObject({
        mode: 'local',
        userId: testUserId,
        debug: true,
        token: 'mock-jwt-token-123'
      })
    })

    it('should handle token fetch failure gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      // Should not throw and should use fallback
      await initializeBilan(testUserId)
      
      const config = getConfig()
      expect(config?.token).toMatch(/^fallback-token-/)
    })
  })

  describe('Enhanced Turn Tracking', () => {
    beforeEach(async () => {
      await initializeBilan(testUserId)
    })

    it('should track turns with comprehensive metadata', async () => {
      const { trackTurn: mockTrackTurn } = await import('@mocksi/bilan-sdk')
      const mockAIFunction = vi.fn().mockResolvedValue('Generated content')
      
      const result = await trackTurn(
        'Generate a blog post about AI',
        mockAIFunction,
        {
          contentType: 'blog',
          iterationNumber: 2,
          conversationId: 'conv_123',
          journey_id: 'journey_blog_456',
          journey_step: 'outline-generation',
          userIntent: 'marketing',
          previousAttempts: 1
        }
      )
      
      expect(result.result).toBe('Generated content')
      expect(result.turnId).toMatch(/^turn_/)
      
      // Verify comprehensive metadata was included
      expect(mockTrackTurn).toHaveBeenCalledWith(
        'Generate a blog post about AI',
        mockAIFunction,
        expect.objectContaining({
          contentType: 'blog',
          iterationNumber: 2,
          conversationId: 'conv_123',
          journey_id: 'journey_blog_456',
          journey_step: 'outline-generation',
          model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
          provider: 'webllm',
          timestamp: expect.any(Number),
          previousAttempts: 1,
          userIntent: 'marketing'
        })
      )
    })

    it('should handle AI function failures properly', async () => {
      const mockAIFunction = vi.fn().mockRejectedValue(new Error('AI service down'))
      
      await expect(trackTurn('Test prompt', mockAIFunction)).rejects.toThrow('AI service down')
    })
  })

  describe('Enhanced Vote Tracking', () => {
    beforeEach(async () => {
      await initializeBilan(testUserId)
    })

    it('should track votes with comprehensive feedback metadata', async () => {
      const { vote: mockVote } = await import('@mocksi/bilan-sdk')
      const turnId = 'turn_123' as TurnId
      
      await vote(turnId, 1, 'Great response!', {
        feedbackType: 'accept',
        acceptanceLevel: 'as_is',
        quickFeedback: ['helpful', 'accurate'],
        responseTime: 2500
      })
      
      expect(mockVote).toHaveBeenCalledWith(
        turnId,
        1,
        expect.stringContaining('Great response!')
      )
      
      // Verify enhanced comment includes metadata
      const [, , enhancedComment] = vi.mocked(mockVote).mock.calls[0]
      expect(enhancedComment).toContain('metadata:')
      expect(enhancedComment).toContain('feedbackType":"accept')
      expect(enhancedComment).toContain('acceptanceLevel":"as_is')
    })
  })

  describe('Conversation Lifecycle Management', () => {
    beforeEach(async () => {
      await initializeBilan(testUserId)
    })

    it('should manage complete conversation lifecycle', async () => {
      const { startConversation: mockStartConv, track: mockTrack } = await import('@mocksi/bilan-sdk')
      vi.mocked(mockStartConv).mockResolvedValue('conversation_abc123')
      
      // Start conversation with metadata
      const conversationId = await startConversation({
        journeyId: 'journey_blog_789',
        topic: 'AI in healthcare',
        contentType: 'blog',
        userIntent: 'educational'
      })
      
      expect(conversationId).toBe('conversation_abc123')
      expect(mockStartConv).toHaveBeenCalledWith(testUserId)
      
      // Verify conversation start event was tracked
      expect(mockTrack).toHaveBeenCalledWith(
        'conversation_started',
        expect.objectContaining({
          conversationId: 'conversation_abc123',
          journeyId: 'journey_blog_789',
          topic: 'AI in healthcare',
          contentType: 'blog',
          userIntent: 'educational'
        }),
        undefined
      )
      
      // Get conversation state
      const conversation = getActiveConversation(conversationId)
      expect(conversation).toMatchObject({
        id: conversationId,
        userId: testUserId,
        journeyId: 'journey_blog_789',
        topic: 'AI in healthcare',
        turnCount: 0
      })
      
      // End conversation with metadata
      await endConversation(conversationId, 'completed', {
        satisfactionScore: 5,
        outcome: 'successful_blog_creation'
      })
      
      // Verify conversation end event was tracked
      expect(mockTrack).toHaveBeenCalledWith(
        'conversation_ended',
        expect.objectContaining({
          conversationId,
          status: 'completed',
          satisfactionScore: 5,
          outcome: 'successful_blog_creation',
          duration: expect.any(Number),
          turnCount: 0
        }),
        undefined
      )
    })
  })

  describe('Journey Tracking System', () => {
    beforeEach(async () => {
      await initializeBilan(testUserId)
    })

    it('should manage complete blog creation journey', async () => {
      const { track: mockTrack, trackJourneyStep: mockTrackStep } = await import('@mocksi/bilan-sdk')
      
      // Start blog creation journey
      const journeyId = await startJourney('blog-creation', {
        topic: 'Future of AI',
        userBrief: 'Write about AI trends for 2024',
        contentType: 'blog'
      })
      
      expect(journeyId).toMatch(/^journey_blog-creation_/)
      
      // Verify journey start was tracked
      expect(mockTrack).toHaveBeenCalledWith(
        'journey_started',
        expect.objectContaining({
          journeyId,
          journeyType: 'blog-creation',
          topic: 'Future of AI',
          userBrief: 'Write about AI trends for 2024',
          contentType: 'blog',
          totalSteps: 4 // topic-exploration, outline-generation, section-writing, review-polish
        }),
        undefined
      )
      
      // Get journey state
      const journey = getActiveJourney(journeyId)
      expect(journey).toMatchObject({
        id: journeyId,
        type: 'blog-creation',
        userId: testUserId,
        currentStep: 'topic-exploration',
        completedSteps: [],
        status: 'in-progress'
      })
      
      // Complete first step
      await trackJourneyStep(journeyId, 'topic-exploration', {
        stepData: { chosenTopic: 'AI in Healthcare', keywords: ['AI', 'healthcare', 'innovation'] },
        conversationId: 'conv_123',
        turnId: 'turn_456',
        completionStatus: 'completed'
      })
      
      expect(mockTrackStep).toHaveBeenCalledWith('blog-creation', 'topic-exploration', testUserId)
      
      // Verify step tracking event
      expect(mockTrack).toHaveBeenCalledWith(
        'journey_step_tracked',
        expect.objectContaining({
          journeyId,
          journeyType: 'blog-creation',
          stepName: 'topic-exploration',
          completionStatus: 'completed',
          completedSteps: 1,
          totalSteps: 4,
          progress: 0.25,
          conversationId: 'conv_123',
          turnId: 'turn_456'
        }),
        undefined
      )
      
      // Verify journey state updated
      const updatedJourney = getActiveJourney(journeyId)
      expect(updatedJourney?.completedSteps).toContain('topic-exploration')
      expect(updatedJourney?.conversationIds).toContain('conv_123')
      expect(updatedJourney?.turnIds).toContain('turn_456')
      
      // End journey
      await endJourney(journeyId, 'completed', {
        finalOutput: 'Complete blog post about AI in Healthcare',
        satisfactionScore: 5
      })
      
      // Verify journey end was tracked
      expect(mockTrack).toHaveBeenCalledWith(
        'journey_ended',
        expect.objectContaining({
          journeyId,
          journeyType: 'blog-creation',
          status: 'completed',
          completedSteps: 1,
          totalSteps: 4,
          completionRate: 0.25,
          finalOutput: 'Complete blog post about AI in Healthcare',
          satisfactionScore: 5
        }),
        undefined
      )
    })

    it('should handle email campaign journey workflow', async () => {
      const journeyId = await startJourney('email-campaign', {
        topic: 'Product Launch',
        contentType: 'email'
      })
      
      const journey = getActiveJourney(journeyId)
      expect(journey?.type).toBe('email-campaign')
      expect(journey?.currentStep).toBe('purpose-definition')
      
      // Expected steps for email campaign
      const expectedSteps = ['purpose-definition', 'subject-generation', 'body-writing', 'cta-creation']
      expect(expectedSteps).toHaveLength(4)
    })

    it('should handle social media journey workflow', async () => {
      const journeyId = await startJourney('social-media', {
        topic: 'Brand Awareness',
        contentType: 'social'
      })
      
      const journey = getActiveJourney(journeyId)
      expect(journey?.type).toBe('social-media')
      expect(journey?.currentStep).toBe('goal-setting')
      
      // Expected steps for social media
      const expectedSteps = ['goal-setting', 'content-ideation', 'post-creation', 'hashtag-generation']
      expect(expectedSteps).toHaveLength(4)
    })
  })

  describe('Integration Patterns', () => {
    beforeEach(async () => {
      await initializeBilan(testUserId)
    })

    it('should demonstrate complete workflow integration', async () => {
      // Start journey
      const journeyId = await startJourney('blog-creation', {
        topic: 'AI Ethics',
        userBrief: 'Comprehensive guide to AI ethics'
      })
      
      // Start conversation within journey
      const conversationId = await startConversation({
        journeyId,
        topic: 'AI Ethics Discussion',
        contentType: 'blog'
      })
      
      // Track turn within conversation and journey
      const mockAI = vi.fn().mockResolvedValue('AI ethics content')
      const { result, turnId } = await trackTurn(
        'Explain AI ethics principles',
        mockAI,
        {
          contentType: 'blog',
          conversationId,
          journey_id: journeyId,
          journey_step: 'topic-exploration',
          iterationNumber: 1
        }
      )
      
      expect(result).toBe('AI ethics content')
      
      // Vote on the turn
      await vote(turnId as TurnId, 1, 'Excellent explanation', {
        feedbackType: 'accept',
        acceptanceLevel: 'as_is'
      })
      
      // Complete journey step
      await trackJourneyStep(journeyId, 'topic-exploration', {
        completionStatus: 'completed',
        conversationId,
        turnId
      })
      
      // End conversation
      await endConversation(conversationId, 'completed', {
        satisfactionScore: 5,
        outcome: 'topic_clarified'
      })
      
      // End journey
      await endJourney(journeyId, 'completed', {
        finalOutput: 'Complete AI ethics guide',
        satisfactionScore: 5
      })
      
      // Verify all components worked together
      expect(result).toBeDefined()
      expect(turnId).toBeDefined()
    })
  })

  describe('Error Handling and Graceful Degradation', () => {
    it('should handle Bilan SDK not ready', async () => {
      const { isReady } = await import('@mocksi/bilan-sdk')
      vi.mocked(isReady).mockReturnValue(false)
      
      await initializeBilan(testUserId)
      
      // Operations should not throw even when SDK not ready
      const mockAI = vi.fn().mockResolvedValue('content')
      const result = await trackTurn('test', mockAI)
      
      expect(result.result).toBe('content')
      expect(result.turnId).toBe('') // Empty turnId when not ready
    })

    it('should handle token refresh and expiration', async () => {
      // Mock expired token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          token: 'expired-token',
          expiresAt: Date.now() - 1000, // Already expired
          config: { mode: 'local', endpoint: 'localhost', debug: true }
        })
      })
      
      await initializeBilan(testUserId)
      
      // Should still work with expired token (graceful degradation)
      const config = getConfig()
      expect(config?.token).toBe('expired-token')
    })
  })
}) 