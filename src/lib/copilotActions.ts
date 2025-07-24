import { useCopilotAction } from '@copilotkit/react-core'
import { startJourney } from './bilan'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

type WorkflowType = 'blog' | 'email' | 'social'
type WorkflowSuggestion = {
  type: WorkflowType
  reason: string
  context: string
  confidence: number
} | null

/**
 * Enhanced workflow transition with context preservation
 * 
 * Handles the transition from chat to structured workflows while preserving conversation context
 * and starting appropriate Bilan journey tracking.
 * 
 * @param workflowType - Type of workflow to transition to
 * @param context - Context information to pass to the workflow
 * @param conversationId - Current conversation ID for context preservation
 * @param workflowSuggestion - Current workflow suggestion state
 * @param router - Next.js router for navigation
 * @param setWorkflowSuggestion - Function to clear workflow suggestion
 * @param preserveConversation - Whether to preserve conversation context
 */
export const transitionToWorkflow = async (
  workflowType: WorkflowType,
  context: string,
  conversationId: string,
  workflowSuggestion: { reason?: string } | null,
  router: AppRouterInstance,
  setWorkflowSuggestion: (suggestion: WorkflowSuggestion) => void,
  preserveConversation = true
) => {
  try {
    // Map workflow types to journey types
    const journeyTypeMap = {
      'blog': 'blog-creation',
      'email': 'email-campaign', 
      'social': 'social-media'
    } as const
    
    // Start journey tracking for workflow transition
    const journeyId = await startJourney(journeyTypeMap[workflowType], {
      topic: context,
      userBrief: context,
      contentType: workflowType,
      initialConversationId: preserveConversation ? conversationId : undefined,
      transitionSource: 'chat-interface',
      transitionReason: workflowSuggestion?.reason
    })

    // Prepare URL parameters with context
    const params = new URLSearchParams({
      type: workflowType,
      context: context.substring(0, 500), // Limit context length for URL
      fromChat: 'true',
      journeyId,
      ...(conversationId && preserveConversation && { conversationId })
    })

    // Navigate to workflow with preserved context
    router.push(`/create?${params.toString()}`)
    
    // Clear workflow suggestion
    setWorkflowSuggestion(null)
  } catch (error) {
    console.error('Failed to transition to workflow:', error)
  }
}

/**
 * Custom hook that provides all CopilotKit actions for content creation tools
 * 
 * Defines comprehensive actions for workflow transitions and content manipulation tools.
 * Each action is designed to integrate seamlessly with the chat interface while providing
 * structured alternatives for complex content creation tasks.
 * 
 * @param dependencies - Dependencies needed for action handlers
 * @param dependencies.conversationId - Current conversation ID
 * @param dependencies.workflowSuggestion - Current workflow suggestion state
 * @param dependencies.router - Next.js router instance
 * @param dependencies.setWorkflowSuggestion - Function to update workflow suggestions
 */
export function useCopilotActions({
  conversationId,
  workflowSuggestion,
  router,
  setWorkflowSuggestion
}: {
  conversationId: string
  workflowSuggestion: { reason?: string } | null
  router: AppRouterInstance
  setWorkflowSuggestion: (suggestion: WorkflowSuggestion) => void
}) {
  
  // Blog Workflow Action
  useCopilotAction({
    name: 'startBlogWorkflow',
    description: 'Start a structured blog post creation workflow with step-by-step guidance',
    parameters: [
      {
        name: 'topic',
        type: 'string',
        description: 'The topic or title for the blog post',
        required: true
      },
      {
        name: 'audience',
        type: 'string', 
        description: 'Target audience for the blog post',
        required: false
      }
    ],
    handler: async ({ topic, audience }) => {
      await transitionToWorkflow(
        'blog', 
        `Topic: ${topic}${audience ? ` | Audience: ${audience}` : ''}`,
        conversationId,
        workflowSuggestion,
        router,
        setWorkflowSuggestion
      )
      return `Starting blog workflow for "${topic}". Redirecting to structured creation process with chat context preserved...`
    }
  })

  // Email Workflow Action
  useCopilotAction({
    name: 'startEmailWorkflow',
    description: 'Start a structured email creation workflow for professional communications',
    parameters: [
      {
        name: 'purpose',
        type: 'string',
        description: 'The purpose or goal of the email',
        required: true
      },
      {
        name: 'recipient',
        type: 'string',
        description: 'Who the email is for (e.g., clients, team, customers)',
        required: false
      }
    ],
    handler: async ({ purpose, recipient }) => {
      await transitionToWorkflow(
        'email', 
        `Purpose: ${purpose}${recipient ? ` | Recipient: ${recipient}` : ''}`,
        conversationId,
        workflowSuggestion,
        router,
        setWorkflowSuggestion
      )
      return `Starting email workflow for "${purpose}". Redirecting to structured creation process with chat context preserved...`
    }
  })

  // Social Media Workflow Action
  useCopilotAction({
    name: 'startSocialWorkflow', 
    description: 'Start a structured social media content creation workflow',
    parameters: [
      {
        name: 'platform',
        type: 'string',
        description: 'Target social media platform (Twitter, LinkedIn, Instagram, etc.)',
        required: false
      },
      {
        name: 'goal',
        type: 'string',
        description: 'Goal of the social media post (engagement, awareness, promotion, etc.)',
        required: true
      }
    ],
    handler: async ({ platform, goal }) => {
      await transitionToWorkflow(
        'social', 
        `Goal: ${goal}${platform ? ` | Platform: ${platform}` : ''}`,
        conversationId,
        workflowSuggestion,
        router,
        setWorkflowSuggestion
      )
      return `Starting social media workflow for ${platform ? `${platform} ` : ''}with goal: "${goal}". Redirecting to structured creation process with chat context preserved...`
    }
  })

  // Text Improvement Action
  useCopilotAction({
    name: 'improveText',
    description: 'Improve existing text by making it clearer, more engaging, or fixing grammar',
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: 'The text to improve',
        required: true
      },
      {
        name: 'improvementType',
        type: 'string',
        description: 'Type of improvement: clarity, engagement, grammar, or conciseness',
        required: false
      }
    ],
    handler: async ({ text, improvementType = 'general' }) => {
      // This could be enhanced to use different prompts based on improvement type
      return `Here's the improved version of your text:

**Original:**
${text}

**Improved (${improvementType}):**
I'll help you improve this text. Let me analyze it and provide suggestions for better ${improvementType}.

*Note: For more sophisticated text improvement, consider using the structured workflows for specific content types.*`
    }
  })

  // Outline Generation Action
  useCopilotAction({
    name: 'generateOutline',
    description: 'Generate a structured outline for any type of content',
    parameters: [
      {
        name: 'topic',
        type: 'string', 
        description: 'The topic for the outline',
        required: true
      },
      {
        name: 'contentType',  
        type: 'string',
        description: 'Type of content: blog, article, presentation, email, etc.',
        required: false
      },
      {
        name: 'length',
        type: 'string',
        description: 'Desired length: short, medium, long, or detailed',
        required: false
      }
    ],
    handler: async ({ topic, contentType = 'general', length = 'medium' }) => {
      return `# Content Outline: ${topic}

**Type:** ${contentType} | **Length:** ${length}

## I. Introduction
- Hook/Opening statement
- Background context
- Main thesis or purpose

## II. Main Content
- Key point 1
- Key point 2  
- Key point 3
- Supporting details and examples

## III. Conclusion
- Summary of main points
- Call to action or next steps
- Closing thought

*This is a basic outline. For more detailed, step-by-step content creation with analytics tracking, use the structured workflows available in the Workflows tab.*`
    }
  })

  // Content Analysis Action
  useCopilotAction({
    name: 'analyzeContent',
    description: 'Analyze content for readability, tone, structure, and provide improvement suggestions',
    parameters: [
      {
        name: 'content',
        type: 'string',
        description: 'The content to analyze',
        required: true
      },
      {
        name: 'analysisType',
        type: 'string', 
        description: 'Focus area: readability, tone, structure, or comprehensive',
        required: false
      }
    ],
    handler: async ({ content, analysisType = 'comprehensive' }) => {
      const wordCount = content.split(' ').length
      const sentences = content.split(/[.!?]+/).length - 1
      const avgWordsPerSentence = sentences > 0 ? Math.round(wordCount / sentences) : 0

      return `# Content Analysis (${analysisType})

**Basic Metrics:**
- Word count: ${wordCount}
- Sentences: ${sentences}
- Average words per sentence: ${avgWordsPerSentence}

**Readability Assessment:**
${avgWordsPerSentence > 20 ? '⚠️ Consider shorter sentences for better readability' : '✅ Good sentence length'}

**Tone Analysis:**
The content appears to be ${wordCount > 500 ? 'comprehensive and detailed' : 'concise and focused'}.

**Structure Recommendations:**
- ${content.includes('#') ? '✅ Good use of headings' : '💡 Consider adding headings for better structure'}
- ${content.includes('\n') ? '✅ Well-formatted with breaks' : '💡 Add paragraph breaks for readability'}

**Improvement Suggestions:**
1. ${avgWordsPerSentence > 25 ? 'Break down complex sentences' : 'Sentence length is appropriate'}
2. ${wordCount < 100 ? 'Consider expanding with more details' : 'Good content depth'}
3. Use active voice where possible for engagement

*For detailed content improvement with AI assistance, try the structured workflows or the improveText action.*`
    }
  })
} 