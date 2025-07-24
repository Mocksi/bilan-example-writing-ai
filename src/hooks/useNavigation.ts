'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ContentType } from '../types'
import { env } from '../lib/env'

/**
 * Navigation state interface for tracking current application navigation context
 * 
 * Defines the shape of navigation state data used throughout the Bilan Content Creation Demo
 * to track user location, selected content type, and active session information.
 * This interface supports both current navigation state and routing decisions.
 * 
 * @interface NavigationState
 * @example
 * ```typescript
 * const navState: NavigationState = {
 *   currentPage: 'creator',
 *   contentType: 'blog',
 *   sessionId: 'session_123'
 * }
 * ```
 */
export interface NavigationState {
  /** 
   * Current page location within the application
   * 
   * Indicates which major section of the app the user is currently viewing.
   * Used for conditional rendering, navigation highlighting, and analytics tracking.
   * 
   * @type {'home' | 'creator'}
   */
  currentPage: 'home' | 'creator'
  
  /** 
   * Currently selected content type for generation workflow
   * 
   * When user selects a content type (blog, email, social), this tracks their choice
   * throughout the content creation process. Undefined when no type is selected.
   * 
   * @type {ContentType | undefined}
   * @optional
   */
  contentType?: ContentType
  
  /** 
   * Active content creation session identifier
   * 
   * Unique identifier for the current content generation session, used for
   * analytics correlation, session persistence, and Bilan event tracking.
   * 
   * @type {string | undefined}
   * @optional
   */
  sessionId?: string
}

/**
 * Navigation hook for managing application routing and page transitions
 * 
 * Provides a centralized interface for navigation actions throughout the Bilan Content Creation Demo.
 * Currently implements simple console-based navigation that can be upgraded to actual routing
 * (Next.js router, React Router, etc.) without changing the consuming components' interfaces.
 * 
 * @hook
 * @returns {Object} Navigation functions for different app sections
 * @returns {Function} returns.navigateToHome - Navigate to home/content selection page
 * @returns {Function} returns.navigateToCreator - Navigate to content creator with specific type
 * @returns {Function} returns.navigateToAnalytics - Open external Bilan dashboard
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { navigateToHome, navigateToCreator, navigateToAnalytics } = useNavigation()
 * 
 *   const handleSelectBlog = () => {
 *     navigateToCreator('blog') // Navigate to blog content creator
 *   }
 * 
 *   const viewAnalytics = () => {
 *     navigateToAnalytics() // Open Bilan dashboard
 *   }
 * 
 *   return (
 *     <div>
 *       <button onClick={navigateToHome}>Home</button>
 *       <button onClick={handleSelectBlog}>Create Blog</button>
 *       <button onClick={viewAnalytics}>View Analytics</button>
 *     </div>
 *   )
 * }
 * ```
 * 
 * @remarks
 * This hook serves as an abstraction layer for navigation logic, providing several benefits:
 * - **Centralized Navigation**: All routing logic in one place for easy maintenance
 * - **Future-Proof**: Can be upgraded to actual routing without changing components
 * - **Analytics Integration**: Navigation events can trigger Bilan analytics automatically
 * - **Type Safety**: ContentType parameter ensures valid content type selection
 * - **Testing**: Easy to mock navigation behavior in unit tests
 * 
 * The hook integrates with the Bilan demo architecture by:
 * - Triggering analytics events on navigation (future enhancement)
 * - Managing content type selection flow for AI generation
 * - Providing external dashboard access for analytics viewing
 * - Supporting session correlation across page transitions
 */
export function useNavigation() {
  const router = useRouter()
  
  const navigateToHome = useCallback(() => {
    router.push('/')
  }, [router])

  const navigateToCreator = useCallback((contentType: ContentType) => {
    // Navigate to content creator with content type as search parameter
    router.push(`/create?type=${contentType}`)
  }, [router])

  const navigateToAnalytics = useCallback(() => {
    // Open external Bilan dashboard in new tab
    // Requires BILAN_ENDPOINT to be configured in environment variables
    if (!env.BILAN_ENDPOINT) {
      throw new Error('BILAN_ENDPOINT must be configured to access analytics dashboard')
    }
    
    const bilanDashboardUrl = `${env.BILAN_ENDPOINT}/dashboard`
    window.open(bilanDashboardUrl, '_blank', 'noopener,noreferrer')
  }, [])

  /**
   * Navigate to chat interface for free-form conversations
   * 
   * Provides navigation to the conversational AI interface where users can engage
   * in open-ended dialogue with the AI assistant. This interface demonstrates
   * Bilan's "conversation" concept through natural back-and-forth interactions
   * that are tracked as conversation sessions containing multiple turns.
   * 
   * The chat interface serves multiple purposes in the Bilan demo:
   * - Showcases conversation lifecycle management (start/end conversation)
   * - Demonstrates turn tracking within conversational context
   * - Allows exploration before transitioning to structured workflows
   * - Provides help and guidance for content creation tasks
   * 
   * @function navigateToChat
   * @returns {void}
   * 
   * @example
   * ```tsx
   * const { navigateToChat } = useNavigation()
   * 
   * const handleOpenChat = () => {
   *   navigateToChat() // Navigate to /chat route
   * }
   * 
   * <Button onClick={handleOpenChat}>
   *   Open Chat Assistant
   * </Button>
   * ```
   * 
   * @remarks
   * This navigation function:
   * - Routes to the `/chat` page for conversational AI interface
   * - Preserves user context and can transition back to workflows
   * - Integrates with Bilan conversation tracking automatically
   * - Supports both standalone conversations and workflow-embedded chat
   */
  const navigateToChat = useCallback(() => {
    router.push('/chat')
  }, [router])

  return {
    navigateToHome,
    navigateToCreator,
    navigateToAnalytics,
    navigateToChat
  }
} 