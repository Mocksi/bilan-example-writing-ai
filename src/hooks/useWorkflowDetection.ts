import { useCallback } from 'react'

/**
 * Custom hook for intelligent workflow detection based on user input
 * 
 * Analyzes user messages to detect opportunities for structured content creation workflows
 * and provides contextual suggestions with confidence scores.
 * 
 * @returns Object containing the detectWorkflowOpportunity function
 */
export function useWorkflowDetection() {
  const detectWorkflowOpportunity = useCallback((message: string): {
    type: 'blog' | 'email' | 'social'
    reason: string
    context: string
    confidence: number
  } | null => {
    const lowerMessage = message.toLowerCase()
    
    // Blog detection patterns
    const blogPatterns = [
      'write a blog', 'blog post', 'article about', 'tutorial on', 
      'guide to', 'how to', 'step by step', 'comprehensive overview',
      'deep dive', 'analysis of', 'case study', 'review of'
    ]
    
    // Email detection patterns  
    const emailPatterns = [
      'write an email', 'email to', 'professional email', 'send email',
      'follow up email', 'announcement email', 'newsletter', 'outreach',
      'client email', 'team update', 'business email'
    ]
    
    // Social media detection patterns
    const socialPatterns = [
      'social media post', 'tweet', 'linkedin post', 'instagram caption',
      'facebook post', 'social content', 'viral post', 'engagement post',
      'announcement post', 'behind the scenes'
    ]

    // Check for blog opportunities
    for (const pattern of blogPatterns) {
      if (lowerMessage.includes(pattern)) {
        return {
          type: 'blog',
          reason: `Detected request for long-form content: "${pattern}"`,
          context: message,
          confidence: 0.85
        }
      }
    }

    // Check for email opportunities
    for (const pattern of emailPatterns) {
      if (lowerMessage.includes(pattern)) {
        return {
          type: 'email',
          reason: `Detected email communication need: "${pattern}"`,
          context: message,
          confidence: 0.9
        }
      }
    }

    // Check for social media opportunities
    for (const pattern of socialPatterns) {
      if (lowerMessage.includes(pattern)) {
        return {
          type: 'social',
          reason: `Detected social media content request: "${pattern}"`,
          context: message,
          confidence: 0.8
        }
      }
    }

    return null
  }, [])

  return {
    detectWorkflowOpportunity
  }
} 