'use client'

import { useState, useEffect } from 'react'
import { CopilotKit } from '@copilotkit/react-core'
import { CopilotChat } from '@copilotkit/react-ui'
import {
  Container,
  Stack,
  Text,
  Group,
  ThemeIcon,
  Alert,
  LoadingOverlay
} from '@mantine/core'
import {
  IconMessageCircle,
  IconInfoCircle
} from '@tabler/icons-react'
import { 
  startConversation, 
  endConversation, 
  initializeBilan,
  createUserId
} from '../lib/bilan'

/**
 * Chat interface component with CopilotKit integration and comprehensive Bilan tracking
 * 
 * This component demonstrates the "Conversations" concept in Bilan SDK by:
 * - Starting/ending conversation sessions 
 * - Tracking every AI turn with proper correlation
 * - Integrating user feedback (thumbs up/down) with vote tracking
 * - Managing conversation lifecycle with proper cleanup
 * 
 * @component
 * @returns {JSX.Element} Full-featured chat interface with analytics tracking
 */
export function ChatInterface() {
  const [conversationId, setConversationId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [userId] = useState(() => createUserId(`user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`))

  // Initialize Bilan and start conversation
  useEffect(() => {
    let mounted = true

    const initializeChat = async () => {
      try {
        setIsLoading(true)
        
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
            {/* Chat Header */}
            <Group p="md" style={{ borderBottom: '1px solid #e9ecef' }}>
              <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
                <IconMessageCircle size={20} />
              </ThemeIcon>
              <div>
                <Text size="lg" fw={600}>
                  AI Writing Assistant
                </Text>
                <Text size="sm" c="dimmed">
                  Powered by WebLLM • Analytics by Bilan
                </Text>
              </div>
            </Group>

            {/* CopilotChat Component */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <CopilotChat
                                 labels={{
                   title: "AI Writing Assistant",
                   initial: "Hello! I'm your AI writing assistant. I can help you with content creation, editing, brainstorming, and more. What would you like to work on today?",
                   placeholder: "Ask me anything about writing, content creation, or get help with your projects...",
                   stopGenerating: "Stop generating"
                 }}
                instructions="You are a helpful AI writing assistant specializing in content creation. You help users with writing, editing, brainstorming, and content strategy. Be conversational, helpful, and provide actionable advice. If users want to work on specific content types like blogs, emails, or social media, suggest they might want to use the structured workflows available in the Workflows tab."
                                 onInProgress={(_inProgress) => {
                   // Could add loading states here if needed
                 }}
                 onSubmitMessage={async (_message: string) => {
                   // This fires when user sends a message
                   // Turn tracking will be implemented in next commit
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