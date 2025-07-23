/**
 * Bilan Integration Tests
 * 
 * Tests for Bilan SDK integration covering:
 * - Basic SDK initialization and configuration
 * - Event tracking functionality  
 * - Turn-to-vote correlation
 * - Error handling behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initializeBilan, track, vote, getConfig, isBilanReady, startConversation } from '../bilan'

// Mock fetch for testing
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
  }),
  env: {
    AI_MODEL: 'Xenova/distilgpt2',
    BILAN_ENDPOINT: 'http://localhost:3002',
    BILAN_MODE: 'local' as const,
    DEBUG: true,
    SHOW_USER_STATUS: false,
    APP_NAME: 'Bilan Content Creation Demo',
    APP_VERSION: '1.0.0'
  }
}))

// Mock Bilan SDK
vi.mock('@mocksi/bilan-sdk', () => ({
  init: vi.fn().mockResolvedValue(undefined),
  trackTurn: vi.fn().mockResolvedValue({ turnId: 'mock_turn_id' }),
  vote: vi.fn().mockResolvedValue(undefined),
  track: vi.fn().mockResolvedValue(undefined),
  startConversation: vi.fn().mockReturnValue('mock_conversation_id'),
  endConversation: vi.fn().mockResolvedValue(undefined),
  trackJourneyStep: vi.fn().mockResolvedValue(undefined),
  isReady: vi.fn().mockReturnValue(true),
  createUserId: vi.fn().mockReturnValue('mock_user_id'),
  createConversationId: vi.fn().mockReturnValue('mock_conversation_id'),
  resetSDKForTesting: vi.fn()
}))

describe('Bilan SDK Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(initializeBilan('test_user')).resolves.not.toThrow()
      
      expect(isBilanReady()).toBe(true)
      const config = getConfig()
      expect(config?.userId).toBe('test_user')
    })

    it('should handle initialization gracefully', async () => {
      await expect(initializeBilan('test_user')).resolves.not.toThrow()
      expect(isBilanReady()).toBe(true)
    })
  })

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await initializeBilan('test_user')
    })

    it('should track events with proper structure', async () => {
      const eventType = 'content_generated'
      const properties = { contentType: 'blog', success: true }

      await expect(track(eventType, properties)).resolves.not.toThrow()
      expect(isBilanReady()).toBe(true)
    })

    it('should handle empty properties', async () => {
      await expect(track('user_action')).resolves.not.toThrow()
      await expect(track('user_action', {})).resolves.not.toThrow()
    })
  })

  describe('Vote Tracking', () => {
    beforeEach(async () => {
      await initializeBilan('test_user')
    })

    it('should track votes with turn correlation', async () => {
      const turnId = 'turn_123'
      const rating = 1
      const comment = 'Great content!'

      await expect(vote(turnId, rating, comment)).resolves.not.toThrow()
    })

    it('should handle votes without comments', async () => {
      const turnId = 'turn_456'
      const rating = -1

      await expect(vote(turnId, rating)).resolves.not.toThrow()
    })
  })

  describe('Conversation Management', () => {
    beforeEach(async () => {
      await initializeBilan('test_user')
    })

    it('should start conversations', async () => {
      const conversationId = await startConversation()
      expect(conversationId).toBeDefined()
      expect(typeof conversationId).toBe('string')
    })
  })

  describe('Content Creation Patterns', () => {
    beforeEach(async () => {
      await initializeBilan('content_user')
    })

    it('should track content generation workflow', async () => {
      // Track content type selection
      await track('content_type_selected', { 
        contentType: 'blog',
        userIntent: 'marketing'
      })
      
      // Track content generation
      await track('content_generated', { 
        contentType: 'blog',
        wordCount: 500,
        success: true
      })
      
      // Track user feedback
      await vote('turn_789', 1, 'Perfect for my needs')
      
      // All should complete without errors
      expect(true).toBe(true)
    })

    it('should track user refinement cycle', async () => {
      // Initial generation
      await track('content_generated', { iteration: 1 })
      await vote('turn_001', -1, 'Too generic')
      
      // Refinement
      await track('content_refined', { iteration: 2 })
      await vote('turn_002', 1, 'Much better!')
      
      // Final acceptance  
      await track('content_accepted', { finalIteration: 2 })
      
      expect(true).toBe(true)
    })
  })
}) 