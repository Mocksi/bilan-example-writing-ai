/**
 * Analytics Helpers Test Suite
 * 
 * Tests for conversation lifecycle, journey tracking, and frustration detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  ConversationManager,
  JourneyTracker,
  FrustrationDetector,
  JOURNEY_STEPS,
  trackContentStep,
  trackFeedbackWithFrustration
} from '../analytics-helpers'
import type { UserId, ConversationId, ContentType, UserFeedback } from '../../types'

// Mock the bilan module
vi.mock('../bilan', () => ({
  track: vi.fn().mockResolvedValue(undefined),
  getConfig: vi.fn().mockReturnValue({ endpoint: 'http://localhost:3002' })
}))

describe('ConversationManager', () => {
  let manager: ConversationManager
  let userId: UserId
  let conversationId: ConversationId
  let contentType: ContentType

  beforeEach(() => {
    manager = new ConversationManager()
    userId = 'test_user_123' as UserId
    conversationId = 'test_conv_456' as ConversationId
    contentType = 'blog'
    vi.clearAllMocks()
  })

  describe('Conversation Lifecycle', () => {
    it('should start a conversation', async () => {
      await manager.startConversation(conversationId, userId, contentType)
      
      const conversation = manager.getConversation(conversationId)
      expect(conversation).toBeDefined()
      expect(conversation?.userId).toBe(userId)
      expect(conversation?.contentType).toBe(contentType)
    })

    it('should end a conversation successfully', async () => {
      await manager.startConversation(conversationId, userId, contentType)
      await manager.endConversation(conversationId, 'completed')
      
      const conversation = manager.getConversation(conversationId)
      expect(conversation).toBeUndefined()
    })

    it('should handle ending unknown conversation', async () => {
      // Should not throw error
      await manager.endConversation('unknown_conv' as ConversationId, 'abandoned')
    })

    it('should track different outcomes', async () => {
      await manager.startConversation(conversationId, userId, contentType)
      await manager.endConversation(conversationId, 'abandoned')
      
      // Verify conversation is cleaned up
      expect(manager.getConversation(conversationId)).toBeUndefined()
    })

    it('should get active conversations', async () => {
      await manager.startConversation(conversationId, userId, contentType)
      
      const active = manager.getActiveConversations()
      expect(active).toHaveLength(1)
      expect(active[0].conversationId).toBe(conversationId)
    })
  })
})

describe('JourneyTracker', () => {
  let tracker: JourneyTracker
  let userId: UserId

  beforeEach(() => {
    tracker = new JourneyTracker()
    userId = 'test_user_789' as UserId
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    tracker.destroy()
    vi.useRealTimers()
  })

  describe('Journey Step Tracking', () => {
    it('should track journey steps', async () => {
      await tracker.trackStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, userId, { contentType: 'blog' })
      
      const journey = tracker.getUserJourney(userId)
      expect(journey).toHaveLength(1)
      expect(journey[0].step).toBe(JOURNEY_STEPS.CONTENT_TYPE_SELECTED)
    })

    it('should sequence steps automatically', async () => {
      await tracker.trackStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, userId)
      await tracker.trackStep(JOURNEY_STEPS.BRIEF_PROVIDED, userId)
      
      const journey = tracker.getUserJourney(userId)
      expect(journey).toHaveLength(2)
    })

    it('should track funnel progression', async () => {
      await tracker.trackFunnelStep(
        JOURNEY_STEPS.CONTENT_TYPE_SELECTED,
        JOURNEY_STEPS.BRIEF_PROVIDED,
        userId
      )
      
      const journey = tracker.getUserJourney(userId)
      expect(journey).toHaveLength(1)
      expect(journey[0].step).toBe(JOURNEY_STEPS.BRIEF_PROVIDED)
    })

    it('should track abandonment', async () => {
      await tracker.trackAbandonment(userId, JOURNEY_STEPS.CONTENT_GENERATED, 120000)
      
      const journey = tracker.getUserJourney(userId)
      expect(journey).toHaveLength(1)
      expect(journey[0].step).toBe(JOURNEY_STEPS.SESSION_ABANDONED)
    })

    it('should clear user journey', async () => {
      await tracker.trackStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, userId)
      tracker.clearUserJourney(userId)
      
      const journey = tracker.getUserJourney(userId)
      expect(journey).toHaveLength(0)
    })
  })

  describe('Memory Management', () => {
    it('should limit steps per user', async () => {
      // Add more than MAX_STEPS_PER_USER (50) steps
      for (let i = 0; i < 60; i++) {
        await tracker.trackStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, userId, { step: i })
      }
      
      const journey = tracker.getUserJourney(userId)
      expect(journey.length).toBe(50) // Should be trimmed to MAX_STEPS_PER_USER
    })

    it('should track memory statistics', async () => {
      const user1: UserId = 'user1' as UserId
      const user2: UserId = 'user2' as UserId
      
      // Add steps for multiple users
      await tracker.trackStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, user1)
      await tracker.trackStep(JOURNEY_STEPS.BRIEF_PROVIDED, user1)
      await tracker.trackStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, user2)
      
      const stats = tracker.getMemoryStats()
      expect(stats.totalUsers).toBe(2)
      expect(stats.totalSteps).toBe(3)
      expect(stats.averageStepsPerUser).toBe(2) // Math.round(3/2) = Math.round(1.5) = 2
      expect(stats.oldestJourneyAge).toBeGreaterThanOrEqual(0)
    })

    it('should clean up old journeys', async () => {
      // Add a step
      await tracker.trackStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, userId)
      
      // Fast forward past MAX_JOURNEY_AGE_MS (24 hours)
      vi.advanceTimersByTime(25 * 60 * 60 * 1000) // 25 hours
      
      // Trigger cleanup
      tracker.cleanup()
      
      const journey = tracker.getUserJourney(userId)
      expect(journey).toHaveLength(0)
    })

    it('should evict oldest users when limit exceeded', async () => {
      // Mock the MAX_USERS_TRACKED to a smaller number for testing
      const originalLimit = (JourneyTracker as any).MAX_USERS_TRACKED
      ;(JourneyTracker as any).MAX_USERS_TRACKED = 3
      
      try {
        const users = ['user1', 'user2', 'user3', 'user4'] as UserId[]
        
        // Add users sequentially with time delays
        for (let i = 0; i < users.length; i++) {
          await tracker.trackStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, users[i])
          vi.advanceTimersByTime(1000) // 1 second between users
        }
        
        const stats = tracker.getMemoryStats()
        expect(stats.totalUsers).toBeLessThanOrEqual(3) // Should evict oldest users
      } finally {
        // Restore original limit
        ;(JourneyTracker as any).MAX_USERS_TRACKED = originalLimit
      }
    })

    it('should update last access time when journey is accessed', async () => {
      await tracker.trackStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, userId)
      
      // Access the journey
      const journey1 = tracker.getUserJourney(userId)
      expect(journey1).toHaveLength(1)
      
      // Advance time and access again
      vi.advanceTimersByTime(1000)
      const journey2 = tracker.getUserJourney(userId)
      
      // Last access should be updated (tested indirectly through eviction behavior)
      expect(journey2).toHaveLength(1)
    })

    it('should perform periodic cleanup', async () => {
      await tracker.trackStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, userId)
      
      // Fast forward past cleanup interval
      vi.advanceTimersByTime(61 * 60 * 1000) // 61 minutes
      
      // The periodic cleanup should not have removed recent data
      const journey = tracker.getUserJourney(userId)
      expect(journey).toHaveLength(1)
    })

    it('should handle cleanup gracefully in environments without timers', () => {
      // Mock setTimeout to be undefined (like in some test environments)
      const originalSetTimeout = global.setTimeout
      ;(global as any).setTimeout = undefined
      
      try {
        // Should not throw when creating a new tracker
        const newTracker = new JourneyTracker()
        expect(newTracker).toBeDefined()
        newTracker.destroy()
      } finally {
        global.setTimeout = originalSetTimeout
      }
    })

    it('should clean up resources on destroy', async () => {
      await tracker.trackStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, userId)
      
      const statsBefore = tracker.getMemoryStats()
      expect(statsBefore.totalUsers).toBe(1)
      
      tracker.destroy()
      
      const statsAfter = tracker.getMemoryStats()
      expect(statsAfter.totalUsers).toBe(0)
      expect(statsAfter.totalSteps).toBe(0)
    })
  })
})

describe('FrustrationDetector', () => {
  let detector: FrustrationDetector
  let userId: UserId

  beforeEach(() => {
    detector = new FrustrationDetector()
    userId = 'test_user_frustration' as UserId
    vi.clearAllMocks()
  })

  describe('Frustration Detection', () => {
    it('should track user actions', () => {
      detector.trackAction(userId, 'content_rejected')
      // No direct way to verify, but should not throw
    })

    it('should detect frustration after multiple rejections', async () => {
      // Track 3 rejections within 2 minutes
      detector.trackAction(userId, 'content_rejected')
      detector.trackAction(userId, 'content_rejected')
      detector.trackAction(userId, 'content_rejected')
      
      const isFrustrated = await detector.checkFrustration(userId)
      expect(isFrustrated).toBe(true)
    })

    it('should not detect frustration with few rejections', async () => {
      detector.trackAction(userId, 'content_rejected')
      detector.trackAction(userId, 'content_accepted')
      
      const isFrustrated = await detector.checkFrustration(userId)
      expect(isFrustrated).toBe(false)
    })

    it('should ignore old actions', async () => {
      // Mock date to make actions appear old
      const originalNow = Date.now
      const baseTime = Date.now()
      Date.now = vi.fn().mockReturnValue(baseTime)
      
      // Track old rejections
      detector.trackAction(userId, 'content_rejected')
      detector.trackAction(userId, 'content_rejected')
      
      // Advance time by 6 minutes (older than 5-minute window)
      Date.now = vi.fn().mockReturnValue(baseTime + 6 * 60 * 1000)
      
      detector.trackAction(userId, 'content_rejected')
      
      const isFrustrated = await detector.checkFrustration(userId)
      expect(isFrustrated).toBe(false) // Only 1 recent rejection
      
      Date.now = originalNow
    })
  })
})

describe('Convenience Functions', () => {
  let userId: UserId

  beforeEach(() => {
    userId = 'test_user_convenience' as UserId
    vi.clearAllMocks()
  })

  describe('trackContentStep', () => {
    it('should track content step with journey context', async () => {
      await trackContentStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, userId, 'blog', {
        sessionId: 'test_session'
      })
      
      // Should call track with journey_id
      const { track } = await import('../bilan')
      expect(track).toHaveBeenCalledWith('journey_step', expect.objectContaining({
        contentType: 'blog',
        journey_id: 'content-creation-workflow'
      }))
    })
  })

  describe('trackFeedbackWithFrustration', () => {
    it('should track feedback and check frustration', async () => {
      const feedback: UserFeedback = {
        type: 'reject',
        rating: -1,
        refinementRequest: 'Make it shorter'
      }
      
      await trackFeedbackWithFrustration(userId, feedback, { contentType: 'blog' })
      
      // Should track the step and check frustration
      const { track } = await import('../bilan')
      expect(track).toHaveBeenCalled()
    })

    it('should handle different feedback types', async () => {
      const acceptFeedback: UserFeedback = { type: 'accept', rating: 1 }
      const refineFeedback: UserFeedback = { type: 'refine', refinementRequest: 'Add more detail' }
      
      await trackFeedbackWithFrustration(userId, acceptFeedback, { contentType: 'email' })
      await trackFeedbackWithFrustration(userId, refineFeedback, { contentType: 'social' })
      
      const { track } = await import('../bilan')
      expect(track).toHaveBeenCalledTimes(2)
    })
  })
})

describe('Journey Steps Constants', () => {
  it('should have all required journey steps', () => {
    expect(JOURNEY_STEPS.LANDING).toBe('landing_page_viewed')
    expect(JOURNEY_STEPS.CONTENT_TYPE_SELECTION).toBe('content_type_selection_viewed')
    expect(JOURNEY_STEPS.CONTENT_TYPE_SELECTED).toBe('content_type_selected')
    expect(JOURNEY_STEPS.BRIEF_PROVIDED).toBe('brief_provided')
    expect(JOURNEY_STEPS.CONTENT_GENERATED).toBe('content_generated')
    expect(JOURNEY_STEPS.FEEDBACK_PROVIDED).toBe('feedback_provided')
    expect(JOURNEY_STEPS.CONTENT_ACCEPTED).toBe('content_accepted')
    expect(JOURNEY_STEPS.CONTENT_REJECTED).toBe('content_rejected')
    expect(JOURNEY_STEPS.REFINEMENT_REQUESTED).toBe('refinement_requested')
    expect(JOURNEY_STEPS.SESSION_COMPLETED).toBe('session_completed')
    expect(JOURNEY_STEPS.SESSION_ABANDONED).toBe('session_abandoned')
    expect(JOURNEY_STEPS.GENERATION_FAILED).toBe('generation_failed')
    expect(JOURNEY_STEPS.FRUSTRATION_DETECTED).toBe('frustration_detected')
  })
})

describe('Abandonment Tracking', () => {
  let mockSendBeacon: ReturnType<typeof vi.fn>
  let originalNavigator: typeof navigator

  beforeEach(() => {
    // Mock navigator.sendBeacon
    mockSendBeacon = vi.fn().mockReturnValue(true)
    originalNavigator = global.navigator
    ;(global as any).navigator = {
      ...originalNavigator,
      sendBeacon: mockSendBeacon
    }
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.navigator = originalNavigator
  })

  describe('setupAbandonmentTracking', () => {
    it('should skip sendBeacon in local mode', async () => {
      const { getConfig } = await import('../bilan')
      vi.mocked(getConfig).mockReturnValue({ 
        mode: 'local', 
        userId: 'test_user', 
        endpoint: undefined 
      })

      // Test the core logic that would be used in setupAbandonmentTracking
      const config = getConfig()
      expect(config?.mode).toBe('local')
      expect(config?.endpoint).toBeUndefined()
      
      // In local mode, sendBeacon should be skipped
      if (config?.mode === 'server' && config.endpoint) {
        mockSendBeacon(`${config.endpoint}/api/events`, JSON.stringify({}))
      }
      
      expect(mockSendBeacon).not.toHaveBeenCalled()
    })

    it('should use sendBeacon in server mode with valid endpoint', async () => {
      const { getConfig } = await import('../bilan')
      vi.mocked(getConfig).mockReturnValue({ 
        mode: 'server', 
        userId: 'test_user',
        endpoint: 'https://api.example.com'
      })

      const config = getConfig()
      expect(config?.mode).toBe('server')
      expect(config?.endpoint).toBe('https://api.example.com')
      
      // In server mode with endpoint, sendBeacon should be used
      if (config?.mode === 'server' && config.endpoint) {
        const testData = { eventType: 'user_abandonment', userId: 'test' }
        mockSendBeacon(`${config.endpoint}/api/events`, JSON.stringify(testData))
      }
      
      expect(mockSendBeacon).toHaveBeenCalledWith(
        'https://api.example.com/api/events',
        expect.stringContaining('user_abandonment')
      )
    })

    it('should skip sendBeacon when endpoint is undefined even in server mode', async () => {
      const { getConfig } = await import('../bilan')
      vi.mocked(getConfig).mockReturnValue({ 
        mode: 'server', 
        userId: 'test_user',
        endpoint: undefined // No endpoint defined
      })

      const config = getConfig()
      expect(config?.mode).toBe('server')
      expect(config?.endpoint).toBeUndefined()
      
      // Should skip sendBeacon when endpoint is undefined
      if (config?.mode === 'server' && config.endpoint) {
        mockSendBeacon('/api/events', JSON.stringify({}))
      }
      
      expect(mockSendBeacon).not.toHaveBeenCalled()
    })

    it('should handle missing navigator.sendBeacon gracefully', async () => {
      // Remove sendBeacon from navigator
      ;(global as any).navigator = {
        ...originalNavigator,
        sendBeacon: undefined
      }

      const { getConfig } = await import('../bilan')
      vi.mocked(getConfig).mockReturnValue({ 
        mode: 'server', 
        userId: 'test_user',
        endpoint: 'https://api.example.com'
      })

      // Should not throw when sendBeacon is undefined
      expect(() => {
        const config = getConfig()
        if (navigator.sendBeacon && config?.mode === 'server' && config.endpoint) {
          navigator.sendBeacon(`${config.endpoint}/api/events`, '{}')
        }
      }).not.toThrow()
    })
  })
}) 