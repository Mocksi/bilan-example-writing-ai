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
import type { TurnId, UserId } from '../../types'

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
    AI_MODEL: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
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
  init: vi.fn(),
  trackTurn: vi.fn(),
  vote: vi.fn(),
  track: vi.fn(),
  startConversation: vi.fn(),
  endConversation: vi.fn(),
  trackJourneyStep: vi.fn(),
  isReady: vi.fn(() => true),
  createUserId: vi.fn((id: string) => id),
  createConversationId: vi.fn((id: string) => id),
}))

describe('Bilan SDK Integration', () => {
  const testUserId = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up any global state
  })

  describe('Initialization', () => {
    it('should initialize with local mode by default', async () => {
      await initializeBilan(testUserId)
      
      const config = getConfig()
      expect(config).toMatchObject({
        mode: 'local',
        userId: testUserId,
        debug: true
      })
    })

    it('should handle initialization failures gracefully', async () => {
      const { init } = await import('@mocksi/bilan-sdk')
      vi.mocked(init).mockRejectedValueOnce(new Error('Network error'))

      // Should not throw
      await expect(initializeBilan(testUserId)).resolves.toBeUndefined()
    })
  })

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await initializeBilan(testUserId)
    })

    it('should track custom events', async () => {
      const { track: bilanTrack } = await import('@mocksi/bilan-sdk')
      
      await track('content_generated', { 
        contentType: 'blog',
        model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC'
      })

      expect(bilanTrack).toHaveBeenCalledWith(
        'content_generated',
        { contentType: 'blog', model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC' },
        undefined
      )
    })

    it('should handle tracking failures gracefully', async () => {
      const { track: bilanTrack } = await import('@mocksi/bilan-sdk')
      vi.mocked(bilanTrack).mockRejectedValueOnce(new Error('Tracking failed'))

      // Should not throw
      await expect(track('test_event')).resolves.toBeUndefined()
    })
  })

  describe('Vote Tracking', () => {
    beforeEach(async () => {
      await initializeBilan(testUserId)
    })

    it('should record user votes with turn correlation', async () => {
      const { vote: bilanVote } = await import('@mocksi/bilan-sdk')
      const turnId = 'turn_123' as TurnId
      
      await vote(turnId, 1, 'Great response!')

      expect(bilanVote).toHaveBeenCalledWith(turnId, 1, 'Great response!')
    })

    it('should handle empty turn ID gracefully', async () => {
      const { vote: bilanVote } = await import('@mocksi/bilan-sdk')
      
      await vote('', 1)

      expect(bilanVote).not.toHaveBeenCalled()
    })
  })

  describe('Conversation Management', () => {
    beforeEach(async () => {
      await initializeBilan(testUserId)
    })

    it('should start conversations', async () => {
      const { startConversation: bilanStartConversation } = await import('@mocksi/bilan-sdk')
      vi.mocked(bilanStartConversation).mockResolvedValueOnce('conversation_123')
      
      const conversationId = await startConversation()

      expect(conversationId).toBe('conversation_123')
      expect(bilanStartConversation).toHaveBeenCalledWith(testUserId)
    })

    it('should handle conversation start failures', async () => {
      const { startConversation: bilanStartConversation } = await import('@mocksi/bilan-sdk')
      vi.mocked(bilanStartConversation).mockRejectedValueOnce(new Error('Start failed'))
      
      const conversationId = await startConversation()

      expect(conversationId).toBe('')
    })
  })

  describe('Error Handling', () => {
    it('should provide graceful degradation when SDK is not ready', async () => {
      const { isReady } = await import('@mocksi/bilan-sdk')
      // Set the mock to return false for this test
      vi.mocked(isReady).mockReturnValue(false)

      await initializeBilan(testUserId)
      
      // Operations should still work without throwing
      await track('test_event')
      await vote('turn_123' as TurnId, 1)
      
      // Verify the SDK is not ready
      expect(isBilanReady()).toBe(false)
    })
  })
}) 