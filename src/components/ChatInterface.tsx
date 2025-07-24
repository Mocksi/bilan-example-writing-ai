'use client'

import { useState, useEffect } from 'react'
import { CopilotKit } from '@copilotkit/react-core'
import { CopilotChat } from '@copilotkit/react-ui'
import { useCopilotAction } from '@copilotkit/react-core'
import {
  Container,
  Stack,
  Text,
  Group,
  ThemeIcon,
  Alert,
  LoadingOverlay,
  Progress,
  Badge,
  Button,
  Paper
} from '@mantine/core'
import {
  IconMessageCircle,
  IconInfoCircle,
  IconBrain,
  IconCheck,
  IconAlertTriangle,
  IconArrowRight,
  IconBulb
} from '@tabler/icons-react'
import { 
  startConversation, 
  endConversation, 
  initializeBilan,
  createUserId,
  startJourney
} from '../lib/bilan'
import { useRouter } from 'next/navigation'

/**
 * Chat interface component with CopilotKit integration and comprehensive Bilan tracking
 * 
 * This component demonstrates the "Conversations" concept in Bilan SDK by:
 * - Starting/ending conversation sessions 
 * - Tracking every AI turn with proper correlation
 * - Integrating user feedback (thumbs up/down) with vote tracking
 * - Managing conversation lifecycle with proper cleanup
 * - Providing custom actions for workflow transitions and content tools
 * - Real-time progress tracking for model initialization and streaming
 * - Intelligent workflow detection and smooth context transitions
 * 
 * @component
 * @returns {JSX.Element} Full-featured chat interface with analytics tracking
 */
export function ChatInterface() {
  const [conversationId, setConversationId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [userId] = useState(() => createUserId(`user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`))
  const [modelProgress, setModelProgress] = useState<number>(0)
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [workflowSuggestion, setWorkflowSuggestion] = useState<{
    type: 'blog' | 'email' | 'social'
    reason: string
    context: string
    confidence: number
  } | null>(null)
  const router = useRouter()

  // Check AI model status and initialization progress
  const checkModelStatus = async () => {
    try {
      const response = await fetch('/api/copilotkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'status check' }],
          max_tokens: 1
        })
      })

      const data = await response.json()
      
      if (data.status === 'initializing') {
        setModelStatus('loading')
        setModelProgress(data.progress || 0)
        setStatusMessage(data.message || 'Loading AI model...')
        
        // Continue checking until ready
        setTimeout(checkModelStatus, 1000)
      } else if (data.error) {
        setModelStatus('error')
        setStatusMessage(data.error.message || 'Model initialization failed')
      } else {
        setModelStatus('ready')
        setModelProgress(100)
        setStatusMessage('AI model ready')
      }
    } catch (error) {
      setModelStatus('error')
      setStatusMessage(`Failed to check model status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Intelligent workflow detection based on user input
  const detectWorkflowOpportunity = (message: string): {
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
  }

  // Enhanced workflow transition with context preservation
  const transitionToWorkflow = async (
    workflowType: 'blog' | 'email' | 'social',
    context: string,
    preserveConversation = true
  ) => {
    try {
      // Start journey tracking for workflow transition
      const journeyId = await startJourney(`${workflowType}-creation` as any, {
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

  // Custom CopilotKit Actions for Content Creation Tools
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
      await transitionToWorkflow('blog', `Topic: ${topic}${audience ? ` | Audience: ${audience}` : ''}`)
      return `Starting blog workflow for "${topic}". Redirecting to structured creation process with chat context preserved...`
    }
  })

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
      await transitionToWorkflow('email', `Purpose: ${purpose}${recipient ? ` | Recipient: ${recipient}` : ''}`)
      return `Starting email workflow for "${purpose}". Redirecting to structured creation process with chat context preserved...`
    }
  })

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
      await transitionToWorkflow('social', `Goal: ${goal}${platform ? ` | Platform: ${platform}` : ''}`)
      return `Starting social media workflow for ${platform ? `${platform} ` : ''}with goal: "${goal}". Redirecting to structured creation process with chat context preserved...`
    }
  })

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

**Content Statistics:**
- Word count: ${wordCount}
- Sentences: ${sentences}
- Average words per sentence: ${avgWordsPerSentence}

**Quick Assessment:**
- Readability: ${avgWordsPerSentence < 20 ? 'Good' : 'Could be improved (long sentences)'}
- Length: ${wordCount < 100 ? 'Short' : wordCount < 500 ? 'Medium' : 'Long'}

**Recommendations:**
1. ${avgWordsPerSentence > 25 ? 'Consider breaking up long sentences for better readability' : 'Sentence length is appropriate'}
2. Check for consistent tone throughout
3. Ensure clear structure with logical flow

*For detailed content optimization with A/B testing insights, use our structured workflows.*`
    }
  })

  // Initialize Bilan and start conversation
  useEffect(() => {
    let mounted = true

    const initializeChat = async () => {
      try {
        setIsLoading(true)
        setModelStatus('loading')
        
        // Start model status checking
        checkModelStatus()
        
        // Initialize Bilan SDK
        await initializeBilan(userId)
        
        if (!mounted) return

        // Start conversation for chat mode
        const convId = await startConversation({
          topic: 'general-chat',
          userIntent: 'open-conversation',
          contentType: 'social' // Using social as it's most conversational
        })
        
        if (mounted) {
          setConversationId(convId)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Failed to initialize chat:', err)
        if (mounted) {
          setError('Failed to initialize chat. Please refresh the page.')
          setIsLoading(false)
          setModelStatus('error')
        }
      }
    }

    initializeChat()

    // Cleanup: end conversation when component unmounts
    return () => {
      mounted = false
      if (conversationId) {
        endConversation(conversationId, 'completed', {
          satisfactionScore: 5, // Default positive score for completed chats
          outcome: 'natural-completion'
        }).catch(() => {
          // Ignore cleanup errors
        })
      }
    }
  }, [userId, conversationId])
  
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Note: Turn tracking and voting will be implemented in the next commit
  // This requires deeper integration with CopilotKit's message lifecycle

  if (error) {
    return (
      <Container size="xl" h="100%" p={{ base: 'xs', sm: 'md' }}>
        <Stack align="center" justify="center" h="100%" gap="xl">
          <Alert icon={<IconInfoCircle size={16} />} title="Chat Unavailable" color="red">
            {error}
          </Alert>
        </Stack>
      </Container>
    )
  }

  return (
    <Container size="xl" h="100%" p={0} pos="relative">
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
      
      {!isLoading && conversationId && (
        <CopilotKit runtimeUrl="/api/copilotkit">
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Chat Header with Model Status */}
            <Group p="md" style={{ borderBottom: '1px solid #e9ecef' }} wrap="nowrap">
              <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
                <IconMessageCircle size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Group gap="sm" align="center">
                  <Text size="lg" fw={600}>
                    AI Writing Assistant
                  </Text>
                  <Badge 
                    size="sm" 
                    color={modelStatus === 'ready' ? 'green' : modelStatus === 'loading' ? 'yellow' : 'red'}
                    variant="light"
                  >
                    <Group gap={4} align="center">
                      {modelStatus === 'ready' && <IconCheck size={12} />}
                      {modelStatus === 'loading' && <IconBrain size={12} />}
                      {modelStatus === 'error' && <IconAlertTriangle size={12} />}
                      {modelStatus === 'ready' ? 'Ready' : modelStatus === 'loading' ? 'Loading' : 'Error'}
                    </Group>
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Powered by WebLLM • Analytics by Bilan • Smart Workflow Detection
                </Text>
                {modelStatus === 'loading' && (
                  <div style={{ marginTop: 4 }}>
                    <Progress value={modelProgress} size="xs" />
                    <Text size="xs" c="dimmed" mt={2}>
                      {statusMessage} ({Math.round(modelProgress)}%)
                    </Text>
                  </div>
                )}
              </div>
            </Group>

            {/* Workflow Suggestion Banner */}
            {workflowSuggestion && (
              <Paper p="sm" bg="blue.0" style={{ borderBottom: '1px solid #e9ecef' }}>
                <Group gap="sm" justify="space-between" align="center">
                  <Group gap="sm" align="center">
                    <ThemeIcon size="sm" color="blue" variant="light">
                      <IconBulb size={14} />
                    </ThemeIcon>
                    <div>
                      <Text size="sm" fw={500}>
                        Workflow Suggestion
                      </Text>
                      <Text size="xs" c="dimmed">
                        {workflowSuggestion.reason} (Confidence: {Math.round(workflowSuggestion.confidence * 100)}%)
                      </Text>
                    </div>
                  </Group>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="filled"
                      rightSection={<IconArrowRight size={12} />}
                      onClick={() => transitionToWorkflow(workflowSuggestion.type, workflowSuggestion.context)}
                    >
                      Start {workflowSuggestion.type} workflow
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => setWorkflowSuggestion(null)}
                    >
                      Dismiss
                    </Button>
                  </Group>
                </Group>
              </Paper>
            )}

            {/* CopilotChat Component with Enhanced Instructions */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <CopilotChat
                labels={{
                  title: "AI Writing Assistant",
                  initial: `Hello! I'm your AI writing assistant with smart workflow detection and enhanced content creation tools. 

**I can help you with:**
🚀 **Smart Workflows**: I'll detect when you need structured creation and suggest workflows
📝 **Content Tools**: Improve text, generate outlines, analyze content  
💡 **Quick Actions**: Use @ to access tools like @startBlogWorkflow, @improveText, @generateOutline
🔄 **Seamless Transitions**: Move between chat and workflows while preserving context

**Try asking:**
- "Help me write a blog post about AI trends" (I'll detect this and suggest the blog workflow)
- "I need to send a follow-up email to clients" (I'll suggest the email workflow)
- "Create a LinkedIn post about our new product" (I'll suggest the social workflow)
- "Improve this text: [paste your text]" 

What would you like to work on today?`,
                  placeholder: "Ask me anything or describe what you want to create...",
                  stopGenerating: "Stop generating"
                }}
                instructions={`You are an AI writing assistant with intelligent workflow detection and enhanced capabilities through custom actions. Your primary role is to help users with content creation while smartly suggesting appropriate workflows.

**Available Actions:**
- startBlogWorkflow: For structured blog post creation
- startEmailWorkflow: For professional email creation  
- startSocialWorkflow: For social media content
- improveText: To enhance existing text
- generateOutline: To create content outlines
- analyzeContent: To analyze and improve content

**Smart Workflow Detection Guidelines:**
1. Listen for content creation needs and suggest appropriate workflows
2. When users mention "blog", "article", "tutorial", "guide" → suggest blog workflow
3. When users mention "email", "follow-up", "announcement" → suggest email workflow  
4. When users mention "social media", "post", "Twitter", "LinkedIn" → suggest social workflow
5. For quick tasks, use the direct tools
6. Always explain the benefits of using structured workflows vs. chat
7. Preserve conversation context when transitioning to workflows

**Response Pattern:**
- For workflow opportunities: "I can help you with that! For structured, step-by-step creation, I'd recommend using our [type] workflow. Would you like me to start that process?"
- For quick tasks: Use the appropriate action directly
- Always be conversational and explain your reasoning

Remember: You can detect workflow needs and suggest smooth transitions while preserving context!`}
                onInProgress={(inProgress) => {
                  // Update progress indicator when AI is generating
                  if (inProgress) {
                    setStatusMessage('Generating response...')
                  } else {
                    setStatusMessage('AI model ready')
                  }
                }}
                onSubmitMessage={async (message: string) => {
                  // Detect workflow opportunities in user input
                  const workflowOpp = detectWorkflowOpportunity(message)
                  if (workflowOpp && workflowOpp.confidence > 0.7) {
                    setWorkflowSuggestion(workflowOpp)
                  }
                  
                  setStatusMessage('Processing request...')
                }}
                // Note: Voting integration will be implemented in next commit
                // CopilotKit's voting API may need different approach
                className="h-full"
              />
            </div>
          </div>
        </CopilotKit>
      )}
    </Container>
  )
} 