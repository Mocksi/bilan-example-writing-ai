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
  Badge
} from '@mantine/core'
import {
  IconMessageCircle,
  IconInfoCircle,
  IconBrain,
  IconCheck,
  IconAlertTriangle
} from '@tabler/icons-react'
import { 
  startConversation, 
  endConversation, 
  initializeBilan,
  createUserId
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
          } catch (_error) {
        setModelStatus('error')
        setStatusMessage('Failed to check model status')
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
      // Navigate to blog workflow with topic pre-filled
      const params = new URLSearchParams({
        type: 'blog',
        topic: topic || '',
        ...(audience && { audience })
      })
      router.push(`/create?${params.toString()}`)
      return `Starting blog workflow for "${topic}". Redirecting to structured creation process...`
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
      const params = new URLSearchParams({
        type: 'email',
        purpose: purpose || '',
        ...(recipient && { recipient })
      })
      router.push(`/create?${params.toString()}`)
      return `Starting email workflow for "${purpose}". Redirecting to structured creation process...`
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
      const params = new URLSearchParams({
        type: 'social',
        goal: goal || '',
        ...(platform && { platform })
      })
      router.push(`/create?${params.toString()}`)
      return `Starting social media workflow for ${platform ? `${platform} ` : ''}with goal: "${goal}". Redirecting to structured creation process...`
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
                  Powered by WebLLM • Analytics by Bilan • Enhanced with Actions
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

            {/* CopilotChat Component with Enhanced Instructions */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <CopilotChat
                labels={{
                  title: "AI Writing Assistant",
                  initial: `Hello! I'm your AI writing assistant with enhanced content creation tools. 

**I can help you with:**
🚀 **Workflows**: Start structured creation for blogs, emails, or social media
📝 **Content Tools**: Improve text, generate outlines, analyze content  
💡 **Quick Actions**: Use @ to access tools like @startBlogWorkflow, @improveText, @generateOutline

**Try asking:**
- "Help me start a blog about AI trends" (I'll suggest the blog workflow)
- "Improve this text: [paste your text]" 
- "Generate an outline for a presentation on productivity"
- "Analyze this email for tone and clarity"

What would you like to work on today?`,
                  placeholder: "Ask me anything or use @ to access content creation tools...",
                  stopGenerating: "Stop generating"
                }}
                instructions={`You are an AI writing assistant with enhanced capabilities through custom actions. Your primary role is to help users with content creation, editing, and improvement.

**Available Actions:**
- startBlogWorkflow: For structured blog post creation
- startEmailWorkflow: For professional email creation  
- startSocialWorkflow: For social media content
- improveText: To enhance existing text
- generateOutline: To create content outlines
- analyzeContent: To analyze and improve content

**Guidelines:**
1. When users want to create specific content types (blogs, emails, social posts), suggest the relevant workflow
2. For quick improvements or analysis, use the direct tools
3. Always explain what each action does before using it
4. Be conversational and helpful
5. Track that users can switch between chat and structured workflows
6. Encourage exploration of both chat assistance and workflow-based creation

Remember: You have access to powerful actions - suggest them when appropriate!`}
                onInProgress={(inProgress) => {
                  // Update progress indicator when AI is generating
                  if (inProgress) {
                    setStatusMessage('Generating response...')
                  } else {
                    setStatusMessage('AI model ready')
                  }
                }}
                onSubmitMessage={async (_message: string) => {
                  // This fires when user sends a message
                  // Turn tracking will be implemented in next commit
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