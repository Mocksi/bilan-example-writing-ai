'use client'

import { useCallback } from 'react'
import type { ContentType } from '../types'

export interface NavigationState {
  currentPage: 'home' | 'creator'
  contentType?: ContentType
  sessionId?: string
}

export function useNavigation() {
  // For now, we'll use simple state management
  // Later this can be upgraded to Next.js routing or more sophisticated state management
  
  const navigateToHome = useCallback(() => {
    // TODO: Implement actual navigation
    console.log('Navigating to home')
  }, [])

  const navigateToCreator = useCallback((contentType: ContentType) => {
    // TODO: Implement actual navigation to content creator
    console.log('Navigating to creator for:', contentType)
  }, [])

  const navigateToAnalytics = useCallback(() => {
    // TODO: Open external Bilan dashboard
    console.log('Opening analytics dashboard')
    // window.open(BILAN_DASHBOARD_URL, '_blank')
  }, [])

  return {
    navigateToHome,
    navigateToCreator,
    navigateToAnalytics
  }
} 