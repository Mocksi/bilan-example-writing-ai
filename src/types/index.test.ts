import { describe, it, expect } from 'vitest'
import {
  isContentType,
  isFeedbackType,
  isAcceptanceLevel,
  isSessionStatus,
  isUserFeedback,
  isContentIteration,
  isContentSession,
  createSessionId,
  createIterationId,
  createUserId,
  createTurnId,
  generateSessionId,
  generateIterationId,
  generateTurnId,
  type ContentType,
  type FeedbackType,
  type AcceptanceLevel,
  type SessionStatus,
  type UserFeedback,
  type ContentIteration,
  type ContentSession,
} from './index'

describe('Type Guards', () => {
  describe('isContentType', () => {
    it('should validate valid content types', () => {
      expect(isContentType('blog')).toBe(true)
      expect(isContentType('email')).toBe(true)
      expect(isContentType('social')).toBe(true)
    })

    it('should reject invalid content types', () => {
      expect(isContentType('invalid')).toBe(false)
      expect(isContentType('')).toBe(false)
      expect(isContentType(null)).toBe(false)
      expect(isContentType(undefined)).toBe(false)
      expect(isContentType(123)).toBe(false)
    })
  })

  describe('isFeedbackType', () => {
    it('should validate valid feedback types', () => {
      expect(isFeedbackType('accept')).toBe(true)
      expect(isFeedbackType('reject')).toBe(true)
      expect(isFeedbackType('refine')).toBe(true)
    })

    it('should reject invalid feedback types', () => {
      expect(isFeedbackType('invalid')).toBe(false)
      expect(isFeedbackType('')).toBe(false)
      expect(isFeedbackType(null)).toBe(false)
    })
  })

  describe('isAcceptanceLevel', () => {
    it('should validate valid acceptance levels', () => {
      expect(isAcceptanceLevel('as_is')).toBe(true)
      expect(isAcceptanceLevel('light_edit')).toBe(true)
      expect(isAcceptanceLevel('heavy_edit')).toBe(true)
      expect(isAcceptanceLevel('inspiration')).toBe(true)
    })

    it('should reject invalid acceptance levels', () => {
      expect(isAcceptanceLevel('invalid')).toBe(false)
      expect(isAcceptanceLevel('')).toBe(false)
      expect(isAcceptanceLevel(null)).toBe(false)
    })
  })

  describe('isSessionStatus', () => {
    it('should validate valid session statuses', () => {
      expect(isSessionStatus('active')).toBe(true)
      expect(isSessionStatus('completed')).toBe(true)
      expect(isSessionStatus('abandoned')).toBe(true)
    })

    it('should reject invalid session statuses', () => {
      expect(isSessionStatus('invalid')).toBe(false)
      expect(isSessionStatus('')).toBe(false)
      expect(isSessionStatus(null)).toBe(false)
    })
  })

  describe('isUserFeedback', () => {
    it('should validate valid user feedback', () => {
      const validFeedback: UserFeedback = {
        type: 'accept',
        rating: 1,
        refinementRequest: 'Make it shorter',
        quickFeedback: ['helpful', 'accurate'],
        acceptanceLevel: 'light_edit',
      }
      expect(isUserFeedback(validFeedback)).toBe(true)
    })

    it('should validate minimal user feedback', () => {
      const minimalFeedback: UserFeedback = {
        type: 'reject',
      }
      expect(isUserFeedback(minimalFeedback)).toBe(true)
    })

    it('should reject invalid user feedback', () => {
      expect(isUserFeedback(null)).toBe(false)
      expect(isUserFeedback({})).toBe(false)
      expect(isUserFeedback({ type: 'invalid' })).toBe(false)
      expect(isUserFeedback({ type: 'accept', rating: 2 })).toBe(false)
    })
  })

  describe('isContentIteration', () => {
    it('should validate valid content iteration', () => {
      const validIteration: ContentIteration = {
        id: createIterationId('iter_123'),
        attemptNumber: 1,
        prompt: 'Write a blog post',
        generatedContent: 'Here is your blog post...',
        bilanTurnId: createTurnId('turn_456'),
        timing: {
          requestTime: Date.now(),
          responseTime: Date.now() + 1000,
          userResponseTime: Date.now() + 2000,
        },
        userFeedback: {
          type: 'accept',
          rating: 1,
        },
      }
      expect(isContentIteration(validIteration)).toBe(true)
    })

    it('should validate minimal content iteration', () => {
      const minimalIteration: ContentIteration = {
        id: createIterationId('iter_123'),
        attemptNumber: 1,
        prompt: 'Write a blog post',
        generatedContent: 'Here is your blog post...',
        bilanTurnId: createTurnId('turn_456'),
        timing: {
          requestTime: Date.now(),
          responseTime: Date.now() + 1000,
        },
      }
      expect(isContentIteration(minimalIteration)).toBe(true)
    })

    it('should reject invalid content iteration', () => {
      expect(isContentIteration(null)).toBe(false)
      expect(isContentIteration({})).toBe(false)
      expect(isContentIteration({ id: 'test' })).toBe(false)
    })
  })

  describe('isContentSession', () => {
    it('should validate valid content session', () => {
      const validSession: ContentSession = {
        id: createSessionId('session_123'),
        contentType: 'blog',
        userBrief: 'Write about AI',
        iterations: [],
        status: 'active',
        startTime: Date.now(),
        endTime: Date.now() + 60000,
      }
      expect(isContentSession(validSession)).toBe(true)
    })

    it('should validate minimal content session', () => {
      const minimalSession: ContentSession = {
        id: createSessionId('session_123'),
        contentType: 'email',
        userBrief: 'Write a professional email',
        iterations: [],
        status: 'active',
        startTime: Date.now(),
      }
      expect(isContentSession(minimalSession)).toBe(true)
    })

    it('should reject invalid content session', () => {
      expect(isContentSession(null)).toBe(false)
      expect(isContentSession({})).toBe(false)
      expect(isContentSession({ id: 'test' })).toBe(false)
    })
  })
})

describe('Branded Type Utilities', () => {
  describe('createSessionId', () => {
    it('should create a SessionId from string', () => {
      const id = createSessionId('test-session')
      expect(typeof id).toBe('string')
      expect(id).toBe('test-session')
    })
  })

  describe('createIterationId', () => {
    it('should create an IterationId from string', () => {
      const id = createIterationId('test-iteration')
      expect(typeof id).toBe('string')
      expect(id).toBe('test-iteration')
    })
  })

  describe('createUserId', () => {
    it('should create a UserId from string', () => {
      const id = createUserId('test-user')
      expect(typeof id).toBe('string')
      expect(id).toBe('test-user')
    })
  })

  describe('createTurnId', () => {
    it('should create a TurnId from string', () => {
      const id = createTurnId('test-turn')
      expect(typeof id).toBe('string')
      expect(id).toBe('test-turn')
    })
  })
})

describe('ID Generation Utilities', () => {
  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId()
      const id2 = generateSessionId()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/)
    })
  })

  describe('generateIterationId', () => {
    it('should generate unique iteration IDs', () => {
      const id1 = generateIterationId()
      const id2 = generateIterationId()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^iter_\d+_[a-z0-9]+$/)
    })
  })

  describe('generateTurnId', () => {
    it('should generate unique turn IDs', () => {
      const id1 = generateTurnId()
      const id2 = generateTurnId()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^turn_\d+_[a-z0-9]+$/)
    })
  })
}) 