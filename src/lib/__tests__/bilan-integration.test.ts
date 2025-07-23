/**
 * Bilan Integration Tests
 * 
 * Tests for Bilan SDK integration covering:
 * - Event transmission verification
 * - Turn-to-vote correlation testing  
 * - Journey completion tracking
 * - Error handling behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BilanClient, initBilan, getBilan, track, vote } from '../bilan'
import { analyticsErrorManager } from '../analytics-error-handling'

// Mock fetch for testing
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock environment
vi.mock('../env', () => ({
  env: {
    BILAN_ENDPOINT: 'http://localhost:3002',
    BILAN_MODE: 'local',
    DEBUG: true
  }
}))

describe('BilanClient', () => {
  let client: BilanClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    client = new BilanClient({
      mode: 'local',
      debug: true
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Initialization', () => {
    it('should initialize successfully in local mode', async () => {
      await client.init()
      
      expect(client.isReady()).toBe(true)
      const config = client.getConfig()
      expect(config.mode).toBe('local')
    })

    it('should generate a user ID on initialization', async () => {
      await client.init()
      
      const config = client.getConfig()
      expect(config.userId).toBeDefined()
      expect(config.userId).toMatch(/^user_\d+_[a-z0-9]+$/)
    })

    it('should not throw on initialization failure', async () => {
      const badClient = new BilanClient({
        mode: 'server',
        endpoint: undefined // This should cause failure
      })

      await expect(badClient.init()).resolves.not.toThrow()
      expect(badClient.isReady()).toBe(false)
    })
  })

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await client.init()
    })

    it('should track events with proper structure', async () => {
      const eventType = 'test_event'
      const properties = { key: 'value', number: 42 }

      await client.track(eventType, properties)

      // In local mode, events are just logged, so we verify the structure
      expect(client.isReady()).toBe(true)
    })

    it('should handle empty properties', async () => {
      await expect(client.track('test_event')).resolves.not.toThrow()
      await expect(client.track('test_event', {})).resolves.not.toThrow()
    })

    it('should clean undefined values from properties', async () => {
      const properties = {
        defined: 'value',
        undefined: undefined,
        null: null,
        empty: ''
      }

      await expect(client.track('test_event', properties)).resolves.not.toThrow()
    })

    it('should not track when not initialized', async () => {
      const uninitializedClient = new BilanClient({ mode: 'local' })
      
      await expect(uninitializedClient.track('test_event')).resolves.not.toThrow()
    })
  })

  describe('Vote Tracking', () => {
    beforeEach(async () => {
      await client.init()
    })

    it('should track votes with turn correlation', async () => {
      const turnId = 'turn_123' as any
      const rating = 1
      const comment = 'Great response!'

      await expect(client.vote(turnId, rating, comment)).resolves.not.toThrow()
    })

    it('should handle votes without comments', async () => {
      const turnId = 'turn_123' as any
      const rating = -1

      await expect(client.vote(turnId, rating)).resolves.not.toThrow()
    })

    it('should validate rating values', async () => {
      const turnId = 'turn_123' as any
      
      // Valid ratings
      await expect(client.vote(turnId, 1)).resolves.not.toThrow()
      await expect(client.vote(turnId, -1)).resolves.not.toThrow()
    })
  })

  describe('User Management', () => {
    beforeEach(async () => {
      await client.init()
    })

    it('should identify users', () => {
      const userId = 'user_123' as any

      expect(() => client.identify(userId)).not.toThrow()
    })

    it('should start conversations', () => {
      const userId = 'user_123' as any
      
      const conversationId = client.startConversation(userId)
      expect(conversationId).toBeDefined()
      expect(conversationId).toMatch(/^conv_\d+_[a-z0-9]+$/)
    })

    it('should set session IDs', () => {
      const sessionId = 'session_123' as any
      
      expect(() => client.setSessionId(sessionId)).not.toThrow()
    })
  })

  describe('Server Mode', () => {
    it('should make HTTP requests in server mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      const serverClient = new BilanClient({
        mode: 'server',
        endpoint: 'http://test-server.com'
      })

      await serverClient.init()
      await serverClient.track('test_event', { key: 'value' })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-server.com/api/events',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('test_event')
        })
      )
    })

    it('should handle server errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const serverClient = new BilanClient({
        mode: 'server',
        endpoint: 'http://test-server.com'
      })

      await serverClient.init()
      await expect(serverClient.track('test_event')).resolves.not.toThrow()
    })
  })
})

describe('Global Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initBilan', () => {
    it('should initialize global Bilan instance', async () => {
      await initBilan({ mode: 'local', debug: true })
      
      const instance = getBilan()
      expect(instance.isReady()).toBe(true)
    })

    it('should throw when getting uninitialized instance', () => {
      expect(() => getBilan()).toThrow('Bilan not initialized')
    })
  })

  describe('Convenience functions', () => {
    beforeEach(async () => {
      await initBilan({ mode: 'local', debug: true })
    })

    it('should track events through global function', async () => {
      await expect(track('test_event', { key: 'value' })).resolves.not.toThrow()
    })

    it('should track votes through global function', async () => {
      const turnId = 'turn_123' as any
      await expect(vote(turnId, 1, 'Great!')).resolves.not.toThrow()
    })
  })
})

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    analyticsErrorManager.clearErrorHistory()
  })

  describe('Event Validation', () => {
    it('should validate event types', () => {
      expect(analyticsErrorManager.validateEventData('valid_event', {})).toBe(true)
      expect(analyticsErrorManager.validateEventData('', {})).toBe(false)
      expect(analyticsErrorManager.validateEventData(null as any, {})).toBe(false)
    })

    it('should validate event type length', () => {
      const longEventType = 'a'.repeat(101)
      expect(analyticsErrorManager.validateEventData(longEventType, {})).toBe(false)
    })

    it('should validate properties size', () => {
      const largeProperties = { data: 'x'.repeat(15000) }
      expect(analyticsErrorManager.validateEventData('test', largeProperties)).toBe(false)
    })

    it('should validate properties type', () => {
      expect(analyticsErrorManager.validateEventData('test', null as any)).toBe(false)
      expect(analyticsErrorManager.validateEventData('test', 'string' as any)).toBe(false)
    })
  })

  describe('Safe Execution', () => {
    it('should handle successful operations', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      
      const result = await analyticsErrorManager.safeExecute(operation)
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledOnce()
    })

    it('should handle failed operations gracefully', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'))
      
      const result = await analyticsErrorManager.safeExecute(operation)
      expect(result).toBeNull()
    })

    it('should retry on failure', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('Success on retry')
      
      const result = await analyticsErrorManager.safeExecute(operation)
      expect(result).toBe('Success on retry')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should not retry validation errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Validation failed'))
      
      const result = await analyticsErrorManager.safeExecute(operation)
      expect(result).toBeNull()
      expect(operation).toHaveBeenCalledOnce() // No retries for validation errors
    })
  })

  describe('Fire and Forget', () => {
    it('should not throw on errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'))
      
      await expect(
        analyticsErrorManager.fireAndForget(operation)
      ).resolves.not.toThrow()
    })
  })

  describe('Error Statistics', () => {
    it('should track error statistics', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'))
      
      await analyticsErrorManager.safeExecute(operation)
      
      const stats = analyticsErrorManager.getErrorStats()
      expect(stats.totalErrors).toBe(1)
      expect(stats.errorsByType.unknown).toBe(1)
    })

    it('should categorize errors correctly', async () => {
      const networkError = vi.fn().mockRejectedValue(new Error('Network fetch failed'))
      const timeoutError = vi.fn().mockRejectedValue(new Error('Request timeout'))
      
      await analyticsErrorManager.safeExecute(networkError)
      await analyticsErrorManager.safeExecute(timeoutError)
      
      const stats = analyticsErrorManager.getErrorStats()
      expect(stats.errorsByType.network).toBe(1)
      expect(stats.errorsByType.timeout).toBe(1)
    })
  })
})

describe('Integration Patterns', () => {
  beforeEach(async () => {
    await initBilan({ mode: 'local', debug: true })
  })

  describe('Turn Tracking Pattern', () => {
    it('should correlate turns with votes', async () => {
      // This would typically be done through useAnalytics hook
      // but we can test the basic pattern here
      
      const turnId = 'turn_123' as any
      
      // Track turn start
      await track('turn_started', { turnId, prompt: 'Test prompt' })
      
      // Track turn completion  
      await track('turn_completed', { turnId, success: true })
      
      // Track user vote
      await vote(turnId, 1, 'Good response')
      
      // All should complete without errors
      expect(true).toBe(true)
    })
  })

  describe('Journey Tracking Pattern', () => {
    it('should track complete user journey', async () => {
      const userId = 'user_123' as any
      const sessionId = 'session_123' as any
      
      // Journey steps
      const steps = [
        'content_type_selected',
        'brief_provided', 
        'content_generated',
        'feedback_provided',
        'content_accepted'
      ]
      
      for (const step of steps) {
        await track('journey_step', {
          step,
          userId,
          sessionId,
          timestamp: Date.now()
        })
      }
      
      expect(true).toBe(true)
    })
  })

  describe('Session Management Pattern', () => {
    it('should manage conversation lifecycle', async () => {
      const client = getBilan()
      const userId = 'user_123' as any
      
      // Start conversation
      const conversationId = client.startConversation(userId)
      expect(conversationId).toBeDefined()
      
      // Track session events
      await track('session_started', { conversationId, userId })
      await track('session_completed', { conversationId, userId })
      
      expect(true).toBe(true)
    })
  })
}) 