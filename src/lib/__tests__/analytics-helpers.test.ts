/**
 * Analytics Helpers Tests
 * 
 * Tests for conversation management, journey tracking, and frustration detection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ConversationManager,
  JourneyTracker, 
  FrustrationDetector,
  JOURNEY_STEPS,
  trackContentStep,
  trackFeedbackWithFrustration
} from '../analytics-helpers'
import type { ConversationId, UserId, ContentType, UserFeedback } from '../../types'

// Mock the bilan module
vi.mock('../bilan', () => ({
  track: vi.fn().mockResolvedValue(undefined),
  getBilan: vi.fn().mockReturnValue({
    getConfig: vi.fn().mockReturnValue({
      endpoint: 'http://localhost:3002'
    })
  })
}))

describe('ConversationManager', () => {
  let manager: ConversationManager

  beforeEach(() => {
    manager = new ConversationManager()
    vi.clearAllMocks()
  })

  describe('Conversation Lifecycle', () => {
    it('should start a conversation', async () => {
      const conversationId = 'conv_123' as ConversationId
      const userId = 'user_123' as UserId
      const contentType: ContentType = 'blog'

      await manager.startConversation(conversationId, userId, contentType)

      const conversation = manager.getConversation(conversationId)
      expect(conversation).toBeDefined()
      expect(conversation?.conversationId).toBe(conversationId)
      expect(conversation?.userId).toBe(userId)
      expect(conversation?.contentType).toBe(contentType)
    })

    it('should end a conversation successfully', async () => {
      const conversationId = 'conv_123' as ConversationId
      const userId = 'user_123' as UserId
      const contentType: ContentType = 'email'

      // Start conversation
      await manager.startConversation(conversationId, userId, contentType)
      expect(manager.getConversation(conversationId)).toBeDefined()

      // End conversation
      await manager.endConversation(conversationId, 'completed')
      expect(manager.getConversation(conversationId)).toBeUndefined()
    })

    it('should handle ending unknown conversation', async () => {
      const conversationId = 'unknown_conv' as ConversationId

      await expect(
        manager.endConversation(conversationId, 'abandoned')
      ).resolves.not.toThrow()
    })

    it('should track different outcomes', async () => {
      const conversationId = 'conv_123' as ConversationId
      const userId = 'user_123' as UserId
      const contentType: ContentType = 'social'

      await manager.startConversation(conversationId, userId, contentType)

      // Test different outcomes
      await expect(manager.endConversation(conversationId, 'completed')).resolves.not.toThrow()
      
      await manager.startConversation(conversationId, userId, contentType)
      await expect(manager.endConversation(conversationId, 'abandoned')).resolves.not.toThrow()
      
      await manager.startConversation(conversationId, userId, contentType)
      await expect(manager.endConversation(conversationId, 'error')).resolves.not.toThrow()
    })

    it('should get active conversations', async () => {
      const userId = 'user_123' as UserId
      const contentType: ContentType = 'blog'

      // Start multiple conversations
      await manager.startConversation('conv_1' as ConversationId, userId, contentType)
      await manager.startConversation('conv_2' as ConversationId, userId, contentType)

      const active = manager.getActiveConversations()
      expect(active).toHaveLength(2)
    })
  })
})

describe('JourneyTracker', () => {
  let tracker: JourneyTracker

  beforeEach(() => {
    tracker = new JourneyTracker()
    vi.clearAllMocks()
  })

  describe('Journey Step Tracking', () => {
    it('should track journey steps', async () => {
      const userId = 'user_123' as UserId
      const step = JOURNEY_STEPS.CONTENT_TYPE_SELECTED

      await tracker.trackStep(step, userId, { contentType: 'blog' })

      const journey = tracker.getUserJourney(userId)
      expect(journey).toHaveLength(1)
      expect(journey[0].step).toBe(step)
      expect(journey[0].userId).toBe(userId)
    })

    it('should sequence steps automatically', async () => {
      const userId = 'user_123' as UserId

      await tracker.trackStep(JOURNEY_STEPS.LANDING, userId)
      await tracker.trackStep(JOURNEY_STEPS.CONTENT_TYPE_SELECTED, userId)
      await tracker.trackStep(JOURNEY_STEPS.BRIEF_PROVIDED, userId)

      const journey = tracker.getUserJourney(userId)
      expect(journey).toHaveLength(3)
      expect(journey[0].step).toBe(JOURNEY_STEPS.LANDING)
      expect(journey[1].step).toBe(JOURNEY_STEPS.CONTENT_TYPE_SELECTED)
      expect(journey[2].step).toBe(JOURNEY_STEPS.BRIEF_PROVIDED)
    })

    it('should track funnel progression', async () => {
      const userId = 'user_123' as UserId
      const fromStep = JOURNEY_STEPS.BRIEF_PROVIDED
      const toStep = JOURNEY_STEPS.CONTENT_GENERATED

      await tracker.trackFunnelStep(fromStep, toStep, userId, { contentType: 'email' })

      const journey = tracker.getUserJourney(userId)
      expect(journey).toHaveLength(1)
      expect(journey[0].step).toBe(toStep)
    })

    it('should track abandonment', async () => {
      const userId = 'user_123' as UserId
      const lastStep = JOURNEY_STEPS.CONTENT_REJECTED
      const sessionDuration = 120000 // 2 minutes

      await tracker.trackAbandonment(userId, lastStep, sessionDuration)

      const journey = tracker.getUserJourney(userId)
      expect(journey).toHaveLength(1)
      expect(journey[0].step).toBe(JOURNEY_STEPS.SESSION_ABANDONED)
    })

    it('should clear user journey', () => {
      const userId = 'user_123' as UserId

      // Add some steps
      tracker.trackStep(JOURNEY_STEPS.LANDING, userId)
      expect(tracker.getUserJourney(userId)).toHaveLength(1)

      // Clear journey
      tracker.clearUserJourney(userId)
      expect(tracker.getUserJourney(userId)).toHaveLength(0)
    })
  })
})

describe('FrustrationDetector', () => {
  let detector: FrustrationDetector

  beforeEach(() => {
    detector = new FrustrationDetector()
    vi.clearAllMocks()
  })

  describe('Frustration Detection', () => {
    it('should track user actions', () => {
      const userId = 'user_123' as UserId

      expect(() => detector.trackAction(userId, 'content_rejected')).not.toThrow()
      expect(() => detector.trackAction(userId, 'content_accepted')).not.toThrow()
    })

    it('should detect frustration after multiple rejections', async () => {
      const userId = 'user_123' as UserId

      // Track multiple rejections
      detector.trackAction(userId, 'content_rejected')
      detector.trackAction(userId, 'content_rejected')
      detector.trackAction(userId, 'content_rejected')

      const isFrustrated = await detector.checkFrustration(userId)
      expect(isFrustrated).toBe(true)
    })

    it('should not detect frustration with few rejections', async () => {
      const userId = 'user_123' as UserId

      // Track only two rejections
      detector.trackAction(userId, 'content_rejected')
      detector.trackAction(userId, 'content_rejected')

      const isFrustrated = await detector.checkFrustration(userId)
      expect(isFrustrated).toBe(false)
    })

    it('should ignore old actions', async () => {
      const userId = 'user_123' as UserId

      // Mock old timestamps by stubbing Date.now
      const originalNow = Date.now
      Date.now = vi.fn().mockReturnValue(1000000) // Old time

      // Track old rejections
      detector.trackAction(userId, 'content_rejected')
      detector.trackAction(userId, 'content_rejected')
      detector.trackAction(userId, 'content_rejected')

      // Move time forward (6 minutes)
      Date.now = vi.fn().mockReturnValue(1000000 + 6 * 60 * 1000)

      const isFrustrated = await detector.checkFrustration(userId)
      expect(isFrustrated).toBe(false)

      // Restore Date.now
      Date.now = originalNow
    })
  })
})

describe('Convenience Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('trackContentStep', () => {
    it('should track content step with journey context', async () => {
      const userId = 'user_123' as UserId
      const contentType: ContentType = 'blog'
      const step = JOURNEY_STEPS.CONTENT_GENERATED

      await expect(
        trackContentStep(step, userId, contentType, { sessionId: 'session_123' })
      ).resolves.not.toThrow()
    })
  })

  describe('trackFeedbackWithFrustration', () => {
    it('should track feedback and check frustration', async () => {
      const userId = 'user_123' as UserId
      const feedback: UserFeedback = {
        type: 'reject',
        rating: -1,
        refinementRequest: 'Too formal'
      }

      await expect(
        trackFeedbackWithFrustration(userId, feedback, { contentType: 'email' })
      ).resolves.not.toThrow()
    })

    it('should handle different feedback types', async () => {
      const userId = 'user_123' as UserId

      const acceptFeedback: UserFeedback = { type: 'accept', rating: 1 }
      const rejectFeedback: UserFeedback = { type: 'reject', rating: -1 }
      const refineFeedback: UserFeedback = { type: 'refine', refinementRequest: 'Make it shorter' }

      await expect(trackFeedbackWithFrustration(userId, acceptFeedback)).resolves.not.toThrow()
      await expect(trackFeedbackWithFrustration(userId, rejectFeedback)).resolves.not.toThrow()
      await expect(trackFeedbackWithFrustration(userId, refineFeedback)).resolves.not.toThrow()
    })
  })
})

describe('Journey Steps Constants', () => {
  it('should have all required journey steps', () => {
    expect(JOURNEY_STEPS.LANDING).toBe('landing_page_viewed')
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