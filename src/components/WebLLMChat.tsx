'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Container,
  Paper,
  Stack,
  TextInput,
  Text,
  Group,
  ThemeIcon,
  Badge,
  ScrollArea,
  Button,
  LoadingOverlay,
  ActionIcon,
  Divider
} from '@mantine/core'
import { IconMessageCircle, IconSend, IconThumbUp, IconThumbDown, IconUser, IconRobot } from '@tabler/icons-react'
import { aiClient } from '../lib/ai-client'
import { trackTurn, vote, startConversation, endConversation, initializeBilan } from '../lib/bilan'
import { createUserId, type UserId } from '../types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  turnId?: string
}

interface WebLLMChatProps {
  onClose?: () => void
}

export function WebLLMChat({ onClose }: WebLLMChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [conversationId, setConversationId] = useState<string>('')
  const [userId, setUserId] = useState<UserId | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize everything
  useEffect(() => {
    const initialize = async () => {
      try {
        // Generate user ID
        const newUserId = createUserId(`user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`)
        setUserId(newUserId)

        // Initialize Bilan
        await initializeBilan(newUserId)
        console.log('🧠 Bilan initialized for WebLLM chat')

        // Start conversation
        const convId = await startConversation({
          topic: 'webllm_chat',
          userIntent: 'direct_chat',
          source: 'webllm_chat_component'
        })
        setConversationId(convId)
        console.log('🧠 Started conversation:', convId)

        // Initialize WebLLM
        const status = aiClient.getStatus()
        if (!status.isInitialized && !status.isLoading) {
          console.log('🤖 Initializing WebLLM...')
          await aiClient.initialize()
        }
        
        setModelStatus('ready')
        console.log('🤖 WebLLM chat ready!')
        
        // Focus input
        setTimeout(() => inputRef.current?.focus(), 100)
      } catch (error) {
        console.error('🤖 Failed to initialize WebLLM chat:', error)
        setModelStatus('error')
      }
    }

    initialize()
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || modelStatus !== 'ready') return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      console.log('🤖 Generating response with WebLLM...')
      const startTime = Date.now()

      // Use Bilan trackTurn to wrap the AI generation
      const { result, turnId } = await trackTurn(
        userMessage.content,
        async () => {
          const response = await aiClient.generateContent(userMessage.content, {
            maxLength: 300,
            temperature: 0.8,
            topP: 0.9
          })
          return response.text
        },
        {
          // Core SDK fields
          model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
          modelUsed: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
          provider: 'webllm',
          context: 'webllm_chat',
          
          // Conversation metadata
          conversation_id: conversationId || undefined,
          session_type: 'conversation',
          feature: 'webllm_direct_chat',
          
          // User interaction context
          user_intent: 'chat_conversation',
          content_type: 'general',
          
          // Timing for dashboard
          request_timestamp: startTime,
          
          // Additional metadata
          model_version: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
          message_count: messages.length + 1,
          is_continuation: messages.length > 0
        }
      )

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result,
        timestamp: new Date(),
        turnId
      }

      setMessages(prev => [...prev, assistantMessage])
      console.log('🤖 Response generated:', { turnId, responseTime: Date.now() - startTime })

    } catch (error) {
      console.error('🤖 Failed to generate response:', error)
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error while generating a response. Please try again.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      // Refocus input
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleVote = async (message: ChatMessage, rating: 1 | -1) => {
    if (!message.turnId) return

    try {
      console.log('🗳️ Voting on message:', message.turnId, rating === 1 ? '👍' : '👎')
      await vote(message.turnId, rating, undefined, {
        feedbackType: rating === 1 ? 'accept' : 'reject',
        action_context: 'webllm_chat_vote',
        message_content_length: message.content.length
      })
      console.log('🗳️ Vote submitted successfully')
    } catch (error) {
      console.error('🗳️ Failed to submit vote:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const renderMessage = (message: ChatMessage) => (
    <Paper key={message.id} p="md" withBorder mb="sm">
      <Group gap="sm" align="flex-start">
        <ThemeIcon 
          size="md" 
          radius="xl" 
          variant="light" 
          color={message.role === 'user' ? 'blue' : 'green'}
        >
          {message.role === 'user' ? <IconUser size={16} /> : <IconRobot size={16} />}
        </ThemeIcon>
        
        <div style={{ flex: 1 }}>
          <Group gap="xs" mb={4}>
            <Text size="sm" fw={600} c={message.role === 'user' ? 'blue' : 'green'}>
              {message.role === 'user' ? 'You' : 'Assistant'}
            </Text>
            <Text size="xs" c="dimmed">
              {message.timestamp.toLocaleTimeString()}
            </Text>
          </Group>
          
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Text>
          
          {/* Vote buttons for assistant messages */}
          {message.role === 'assistant' && message.turnId && (
            <Group gap="xs" mt="xs">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="green"
                onClick={() => handleVote(message, 1)}
              >
                <IconThumbUp size={14} />
              </ActionIcon>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                onClick={() => handleVote(message, -1)}
              >
                <IconThumbDown size={14} />
              </ActionIcon>
            </Group>
          )}
        </div>
      </Group>
    </Paper>
  )

  return (
    <Container size="md" h="100%" p={0} pos="relative">
      <LoadingOverlay visible={modelStatus === 'loading'} overlayProps={{ blur: 2 }} />
      
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Group p="md" style={{ borderBottom: '1px solid #e9ecef' }} wrap="nowrap">
          <ThemeIcon size="lg" radius="xl" variant="light" color="green">
            <IconRobot size={20} />
          </ThemeIcon>
          <div style={{ flex: 1 }}>
            <Group gap="sm" align="center">
              <Text size="lg" fw={600}>WebLLM Chat</Text>
              <Badge 
                color={modelStatus === 'ready' ? 'green' : modelStatus === 'loading' ? 'yellow' : 'red'}
                variant="light"
                size="sm"
              >
                {modelStatus === 'ready' ? 'Ready' : modelStatus === 'loading' ? 'Loading...' : 'Error'}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">Direct browser-based AI powered by WebLLM</Text>
          </div>
          {onClose && (
            <Button variant="subtle" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </Group>

        {/* Messages */}
        <ScrollArea 
          flex={1}
          p="md"
          viewportRef={scrollAreaRef}
          scrollbars="y"
        >
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--mantine-color-dimmed)' }}>
              <IconMessageCircle size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <Text size="sm">Start a conversation with your local AI assistant!</Text>
              <Text size="xs" mt="xs">Powered by WebLLM running entirely in your browser</Text>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          
          {isLoading && (
            <Paper p="md" withBorder mb="sm">
              <Group gap="sm" align="flex-start">
                <ThemeIcon size="md" radius="xl" variant="light" color="green">
                  <IconRobot size={16} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Group gap="xs" mb={4}>
                    <Text size="sm" fw={600} c="green">Assistant</Text>
                    <Text size="xs" c="dimmed">thinking...</Text>
                  </Group>
                  <Text size="sm" c="dimmed">Generating response...</Text>
                </div>
              </Group>
            </Paper>
          )}
        </ScrollArea>

        <Divider />

        {/* Input */}
        <Group p="md" gap="sm" wrap="nowrap">
          <TextInput
            ref={inputRef}
            flex={1}
            placeholder={
              modelStatus === 'ready' 
                ? "Type your message..." 
                : modelStatus === 'loading'
                ? "Loading AI model..."
                : "AI model failed to load"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={modelStatus !== 'ready' || isLoading}
            rightSection={
              <ActionIcon
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading || modelStatus !== 'ready'}
                variant="subtle"
                color="blue"
              >
                <IconSend size={16} />
              </ActionIcon>
            }
          />
        </Group>
      </div>
    </Container>
  )
} 