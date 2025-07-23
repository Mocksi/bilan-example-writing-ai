/**
 * Bilan SDK Integration
 * 
 * Simple analytics client for sending events to Bilan server
 * Follows standard analytics patterns like Amplitude/Mixpanel
 * 
 * NOTE: This is a mock implementation. Replace with actual @bilan/sdk when available.
 */

import { env } from './env'
import type { 
  UserId, 
  SessionId, 
  TurnId, 
  ConversationId,
  BilanEventMetadata 
} from '../types'

export interface BilanConfig {
  endpoint?: string
  mode: 'local' | 'server'
  debug?: boolean
  userId?: UserId
}

export interface BilanEvent {
  eventType: string
  timestamp: number
  userId?: UserId
  sessionId?: SessionId
  turnId?: TurnId
  conversationId?: ConversationId
  properties: Record<string, any>
}

/**
 * Mock Bilan client that mimics standard analytics SDKs
 */
class BilanClient {
  private config: Required<BilanConfig>
  private currentUserId?: UserId
  private currentSessionId?: SessionId
  private currentConversationId?: ConversationId
  private isInitialized = false

  constructor(config: BilanConfig) {
    this.config = {
      endpoint: config.endpoint || env.BILAN_ENDPOINT || 'http://localhost:3002',
      mode: config.mode,
      debug: config.debug ?? env.DEBUG,
      userId: config.userId || this.generateUserId()
    }
  }

  /**
   * Initialize the Bilan client (like amplitude.init())
   */
  async init(): Promise<void> {
    try {
      this.currentUserId = this.config.userId
      
      if (this.config.mode === 'server' && !this.config.endpoint) {
        throw new Error('Bilan endpoint required for server mode')
      }

      this.isInitialized = true
      
      if (this.config.debug) {
        console.log('Bilan SDK initialized:', {
          mode: this.config.mode,
          endpoint: this.config.endpoint,
          userId: this.currentUserId
        })
      }

      // Send initialization event
      await this.track('sdk_initialized', {
        mode: this.config.mode,
        version: '1.0.0'
      })

    } catch (error) {
      console.error('Bilan initialization failed:', error)
      // Don't throw - analytics should never break the app
    }
  }

  /**
   * Identify user (like mixpanel.identify())
   */
  identify(userId: UserId): void {
    this.currentUserId = userId
    
    if (this.config.debug) {
      console.log('Bilan user identified:', userId)
    }

    // Fire-and-forget identify event
    this.track('user_identified', { userId }).catch(() => {
      // Silently handle errors - analytics should never break the app
    })
  }

  /**
   * Start a conversation session
   */
  startConversation(userId?: UserId): ConversationId {
    if (userId) {
      this.identify(userId)
    }

    this.currentConversationId = this.generateConversationId()
    
    if (this.config.debug) {
      console.log('Conversation started:', this.currentConversationId)
    }

    // Fire-and-forget conversation start event
    this.track('conversation_started', {
      conversationId: this.currentConversationId
    }).catch(() => {
      // Silently handle errors
    })

    return this.currentConversationId
  }

  /**
   * Track an event (like amplitude.track())
   */
  async track(
    eventType: string, 
    properties: Record<string, any> = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      if (this.config.debug) {
        console.warn('Bilan not initialized, skipping event:', eventType)
      }
      return
    }

    const event: BilanEvent = {
      eventType,
      timestamp: Date.now(),
      userId: this.currentUserId,
      sessionId: this.currentSessionId,
      turnId: properties.turnId,
      conversationId: this.currentConversationId,
      properties: {
        ...properties,
        // Remove IDs from properties to avoid duplication
        turnId: undefined,
        userId: undefined,
        sessionId: undefined,
        conversationId: undefined
      }
    }

    // Clean undefined values
    Object.keys(event.properties).forEach(key => {
      if (event.properties[key] === undefined) {
        delete event.properties[key]
      }
    })

    try {
      await this.sendEvent(event)
      
      if (this.config.debug) {
        console.log('Bilan event sent:', event)
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to send Bilan event:', error)
      }
      // Don't throw - analytics should never break the app
    }
  }

  /**
   * Track a vote/feedback event with turn correlation
   */
  async vote(
    turnId: TurnId, 
    rating: 1 | -1, 
    comment?: string
  ): Promise<void> {
    await this.track('user_vote', {
      turnId,
      rating,
      comment,
      timestamp: Date.now()
    })
  }

  /**
   * Set current session ID
   */
  setSessionId(sessionId: SessionId): void {
    this.currentSessionId = sessionId
    
    if (this.config.debug) {
      console.log('Bilan session set:', sessionId)
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): BilanConfig {
    return { ...this.config }
  }

  /**
   * Check if client is initialized
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Send event to Bilan server (fire-and-forget)
   */
  private async sendEvent(event: BilanEvent): Promise<void> {
    if (this.config.mode === 'local') {
      // In local mode, just log the event
      if (this.config.debug) {
        console.log('Bilan (local mode):', event)
      }
      return
    }

    // Send to server
    const response = await fetch(`${this.config.endpoint}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })

    if (!response.ok) {
      throw new Error(`Bilan server error: ${response.status}`)
    }
  }

  /**
   * Generate a unique user ID
   */
  private generateUserId(): UserId {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}` as UserId
  }

  /**
   * Generate a unique conversation ID
   */
  private generateConversationId(): ConversationId {
    return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}` as ConversationId
  }
}

// Global instance (like window.amplitude)
let bilanInstance: BilanClient | null = null

/**
 * Initialize Bilan SDK (like amplitude.init())
 */
export const initBilan = async (config: BilanConfig): Promise<BilanClient> => {
  bilanInstance = new BilanClient(config)
  await bilanInstance.init()
  return bilanInstance
}

/**
 * Get the current Bilan instance
 */
export const getBilan = (): BilanClient => {
  if (!bilanInstance) {
    throw new Error('Bilan not initialized. Call initBilan() first.')
  }
  return bilanInstance
}

/**
 * Convenience functions (like amplitude.track(), mixpanel.track())
 */
export const track = (eventType: string, properties?: Record<string, any>) => {
  return getBilan().track(eventType, properties)
}

export const vote = (turnId: TurnId, rating: 1 | -1, comment?: string) => {
  return getBilan().vote(turnId, rating, comment)
}

export const identify = (userId: UserId) => {
  return getBilan().identify(userId)
}

export const startConversation = (userId?: UserId) => {
  return getBilan().startConversation(userId)
}

export const setSessionId = (sessionId: SessionId) => {
  return getBilan().setSessionId(sessionId)
}

// Export the client class for direct usage
export { BilanClient }
export default BilanClient 