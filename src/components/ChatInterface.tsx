'use client'

import { useState, useEffect, useRef } from 'react'
import { CopilotKit } from '@copilotkit/react-core'
import { CopilotChat } from '@copilotkit/react-ui'
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
  type UserId
} from '../lib/bilan'
import { useRouter } from 'next/navigation'
import { useWorkflowDetection, useModelStatus } from '../hooks'
import { useCopilotActions, transitionToWorkflow } from '../lib/copilotActions'
import { ChatErrorBoundary } from './ChatInterface/ChatErrorBoundary'

/**
 * Base chat interface component with CopilotKit integration and comprehensive Bilan tracking
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
 * @internal - Use ChatInterface instead, which includes error boundary protection
 */
export function ChatInterfaceBase() {
  const [conversationId, setConversationId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [userId, setUserId] = useState<UserId | null>(null)
  const [workflowSuggestion, setWorkflowSuggestion] = useState<{
    type: 'blog' | 'email' | 'social'
    reason: string
    context: string
    confidence: number
  } | null>(null)
  const router = useRouter()

  // Use ref to track current conversation ID for cleanup without dependency issues
  const conversationIdRef = useRef<string>('')

  // Extract model status management to custom hook
  const { modelProgress, modelStatus, statusMessage, checkModelStatus } = useModelStatus()
  
  // Extract workflow detection logic to custom hook
  const { detectWorkflowOpportunity } = useWorkflowDetection()

  // Initialize CopilotKit actions
  useCopilotActions({
    conversationId,
    workflowSuggestion,
    router,
    setWorkflowSuggestion
  })

  // Generate userId on client side only (fixes hydration)
  useEffect(() => {
    setUserId(createUserId(`user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`))
  }, [])

  // Initialize Bilan and start conversation
  useEffect(() => {
    if (!userId) return // Wait for userId to be set
    
    let mounted = true

    const initializeChat = async () => {
      try {
        setIsLoading(true)
        
        // Start model status checking
        checkModelStatus()
        
        await initializeBilan(userId)
        
        if (!mounted) return
        
        const convId = await startConversation({
          topic: 'general-chat',
          userIntent: 'open-conversation',
          contentType: 'social'
        })
        
        if (mounted) {
          setConversationId(convId)
          conversationIdRef.current = convId // Update ref for cleanup
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Failed to initialize chat:', err)
        if (mounted) {
          setError('Failed to initialize chat. Please refresh the page.')
          setIsLoading(false)
        }
      }
    }

    initializeChat()

    return () => {
      mounted = false
      // Use ref to get latest conversation ID for cleanup
      if (conversationIdRef.current) {
        endConversation(conversationIdRef.current, 'completed', {
          satisfactionScore: 5,
          outcome: 'natural-completion'
        }).catch(() => {
          // Ignore cleanup errors
        })
      }
    }
  }, [userId, checkModelStatus])

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
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Chat Header with Model Status */}
            <Group p="md" style={{ borderBottom: '1px solid #e9ecef' }} wrap="nowrap">
              <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
                <IconMessageCircle size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Group gap="sm" align="center">
                  <Text size="lg" fw={600}>AI Writing Assistant</Text>
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
                <Text size="sm" c="dimmed">Powered by WebLLM • Analytics by Bilan • Smart Workflow Detection</Text>
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
                      <Text size="sm" fw={500}>Workflow Suggestion</Text>
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
                      onClick={() => transitionToWorkflow(
                        workflowSuggestion.type, 
                        workflowSuggestion.context,
                        conversationId,
                        workflowSuggestion,
                        router,
                        setWorkflowSuggestion
                      )}
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

            {/* CopilotChat Interface */}
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
                onInProgress={(_inProgress) => {
                  // Optional: Could update status message here
                }}
                onSubmitMessage={async (message: string) => {
                  const workflowOpp = detectWorkflowOpportunity(message)
                  if (workflowOpp && workflowOpp.confidence > 0.7) {
                    setWorkflowSuggestion(workflowOpp)
                  }
                }}
                className="h-full"
              />
            </div>
          </div>
      )}
    </Container>
  )
}

/**
 * Chat interface component with error boundary protection
 * 
 * This is the main ChatInterface component that should be used throughout the application.
 * It wraps the ChatInterfaceBase with a ChatErrorBoundary to ensure any runtime errors
 * are caught and handled gracefully without crashing the entire application.
 * 
 * Features:
 * - Complete chat interface functionality from ChatInterfaceBase
 * - Error boundary protection for AI integration robustness
 * - User-friendly error recovery options
 * - Sanitized error logging for security
 * - Automatic error reporting with unique IDs
 * 
 * @component
 */
export function ChatInterface() {
  return (
    <ChatErrorBoundary>
      <CopilotKit runtimeUrl="/api/copilot-kit">
        <ChatInterfaceBase />
      </CopilotKit>
    </ChatErrorBoundary>
  )
} 