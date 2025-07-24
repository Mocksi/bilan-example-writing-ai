'use client'

import { 
  Box,
  Stack, 
  Group, 
  Text, 
  TextInput, 
  Button, 
  Paper,
  Avatar,
  Badge,
  Container,
  ScrollArea,
  ActionIcon,
  Divider
} from '@mantine/core'
import { 
  IconSend, 
  IconThumbUp, 
  IconThumbDown,
  IconUser,
  IconRobot,
  IconPlus,
  IconHistory
} from '@tabler/icons-react'
import { useState } from 'react'

/**
 * Message interface for chat conversations
 * 
 * Defines the structure of individual messages in chat conversations.
 * Each message represents a single turn in the conversation and can be
 * tracked independently in the Bilan analytics system.
 * 
 * @interface ChatMessage
 * @property {string} id - Unique identifier for the message
 * @property {'user' | 'ai'} role - Message sender (user or AI assistant)
 * @property {string} content - The actual message text content
 * @property {Date} timestamp - When the message was sent
 * @property {boolean} [isStreaming] - Whether the message is currently being generated
 * @property {string} [turnId] - Bilan turn ID for analytics correlation
 * @property {1 | -1} [vote] - User feedback vote (thumbs up/down)
 */
interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: Date
  isStreaming?: boolean
  turnId?: string
  vote?: 1 | -1
}

/**
 * Conversation metadata interface
 * 
 * Defines the structure for conversation-level information used in
 * Bilan conversation tracking and analytics.
 * 
 * @interface ConversationMeta
 * @property {string} id - Unique conversation identifier
 * @property {string} title - Display title for the conversation
 * @property {Date} startTime - When the conversation began
 * @property {Date} [lastActivity] - Most recent activity timestamp
 * @property {number} messageCount - Total messages in conversation
 * @property {string} [topic] - Detected or user-specified conversation topic
 */
interface ConversationMeta {
  id: string
  title: string
  startTime: Date
  lastActivity?: Date
  messageCount: number
  topic?: string
}

/**
 * Component props for the chat interface
 * 
 * @interface ChatInterfaceProps
 * @property {ChatMessage[]} [messages] - Array of messages to display
 * @property {ConversationMeta[]} [conversations] - Available conversation history
 * @property {function} [onSendMessage] - Callback for sending new messages
 * @property {function} [onVoteMessage] - Callback for message feedback
 * @property {function} [onStartConversation] - Callback for starting new conversations
 * @property {function} [onSelectConversation] - Callback for selecting conversations
 */
interface ChatInterfaceProps {
  messages?: ChatMessage[]
  conversations?: ConversationMeta[]
  onSendMessage?: (message: string) => void
  onVoteMessage?: (messageId: string, vote: 1 | -1) => void
  onStartConversation?: () => void
  onSelectConversation?: (conversationId: string) => void
}

/**
 * Individual message bubble component
 * 
 * Renders a single chat message with appropriate styling based on the sender
 * (user or AI). Includes feedback buttons for AI messages to collect user
 * votes for Bilan analytics.
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {ChatMessage} props.message - Message data to display
 * @param {function} [props.onVote] - Callback for user feedback votes
 */
function MessageBubble({ 
  message, 
  onVote 
}: { 
  message: ChatMessage
  onVote?: (messageId: string, vote: 1 | -1) => void 
}) {
  const isUser = message.role === 'user'
  const isAI = message.role === 'ai'

  return (
    <Group 
      align="flex-start" 
      gap="sm"
      style={{ flexDirection: isUser ? 'row-reverse' : 'row' }}
    >
      <Avatar size="sm" radius="xl">
        {isUser ? <IconUser size={16} /> : <IconRobot size={16} />}
      </Avatar>
      
      <Stack gap="xs" style={{ maxWidth: '70%' }}>
        <Paper
          p="sm"
          radius="lg"
          bg={isUser ? 'blue.6' : 'gray.1'}
          c={isUser ? 'white' : 'dark'}
          style={{
            borderBottomRightRadius: isUser ? 4 : undefined,
            borderBottomLeftRadius: isUser ? undefined : 4,
          }}
        >
          <Text size="sm">
            {message.isStreaming ? (
              <span>{message.content}<Text component="span" c="dimmed">▊</Text></span>
            ) : (
              message.content
            )}
          </Text>
        </Paper>

        <Group gap="xs" justify={isUser ? 'flex-end' : 'flex-start'}>
          <Text size="xs" c="dimmed">
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
          
          {isAI && !message.isStreaming && onVote && (
            <Group gap="xs">
                             <ActionIcon
                 size="sm"
                 variant={message.vote === 1 ? 'filled' : 'subtle'}
                 color={message.vote === 1 ? 'blue' : 'gray'}
                 onClick={() => onVote(message.id, 1)}
               >
                 <IconThumbUp size={12} />
               </ActionIcon>
               <ActionIcon
                 size="sm"
                 variant={message.vote === -1 ? 'filled' : 'subtle'}
                 color={message.vote === -1 ? 'red' : 'gray'}
                 onClick={() => onVote(message.id, -1)}
               >
                 <IconThumbDown size={12} />
               </ActionIcon>
            </Group>
          )}
        </Group>
      </Stack>
    </Group>
  )
}

/**
 * Conversation history sidebar component
 * 
 * Displays available conversations for selection and provides options
 * to start new conversations. Supports Bilan conversation tracking
 * by maintaining conversation context and metadata.
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {ConversationMeta[]} props.conversations - Available conversations
 * @param {function} props.onSelect - Callback for conversation selection
 * @param {function} props.onStartNew - Callback for starting new conversations
 */
function ConversationHistory({ 
  conversations, 
  onSelect, 
  onStartNew 
}: {
  conversations: ConversationMeta[]
  onSelect: (id: string) => void
  onStartNew: () => void
}) {
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={500} size="sm">
          Conversations
        </Text>
        <ActionIcon size="sm" variant="light" onClick={onStartNew}>
          <IconPlus size={14} />
        </ActionIcon>
      </Group>

      {conversations.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          No conversations yet
        </Text>
      ) : (
        <Stack gap="xs">
          {conversations.map((conv) => (
            <Paper
              key={conv.id}
              p="sm"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(conv.id)}
            >
              <Group justify="space-between" align="flex-start">
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={500} lineClamp={1}>
                    {conv.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {conv.messageCount} messages
                  </Text>
                  {conv.topic && (
                    <Badge size="xs" variant="light" mt="xs">
                      {conv.topic}
                    </Badge>
                  )}
                </div>
                <Text size="xs" c="dimmed">
                  {conv.lastActivity?.toLocaleDateString()}
                </Text>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

/**
 * Suggested prompts component
 * 
 * Provides quick-start prompts to help users begin conversations
 * and explore the AI assistant's capabilities. Supports smooth
 * transitions from chat to structured workflows.
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {function} props.onSelectPrompt - Callback when user selects a suggested prompt
 */
function SuggestedPrompts({ 
  onSelectPrompt 
}: { 
  onSelectPrompt: (prompt: string) => void 
}) {
  const suggestions = [
    "Help me brainstorm blog post ideas for my startup",
    "What makes a good email subject line?",
    "How can I improve my writing style?",
    "What's trending in content marketing?",
    "Give me tips for engaging social media posts"
  ]

  return (
    <Stack gap="sm">
      <Text size="sm" fw={500} c="dimmed">
        Try asking:
      </Text>
      <Stack gap="xs">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="light"
            size="compact-sm"
            justify="left"
            onClick={() => onSelectPrompt(suggestion)}
            style={{ height: 'auto', padding: '8px 12px' }}
          >
            <Text size="sm" lineClamp={2}>
              {suggestion}
            </Text>
          </Button>
        ))}
      </Stack>
    </Stack>
  )
}

/**
 * Chat interface skeleton component
 * 
 * Provides the main conversational AI interface for the Bilan Content Creation Demo.
 * This component demonstrates conversation tracking in Bilan analytics through
 * structured chat interactions with AI assistance.
 * 
 * The interface supports:
 * - Multi-turn conversations with message history
 * - User feedback collection through voting mechanisms
 * - Conversation management and context switching
 * - Smooth transitions to structured workflows
 * 
 * @component
 * @param {ChatInterfaceProps} props - Component properties
 * 
 * @example
 * ```tsx
 * <ChatInterface
 *   messages={conversationMessages}
 *   onSendMessage={handleSendMessage}
 *   onVoteMessage={handleVoteMessage}
 * />
 * ```
 * 
 * @remarks
 * This component serves as a skeleton implementation that demonstrates:
 * - Conversation-focused user experience patterns
 * - Message threading and context management
 * - Integration points for Bilan conversation tracking
 * - Smooth user experience with loading states and feedback
 * 
 * The component integrates with Bilan analytics by:
 * - Tracking conversation start/end events
 * - Correlating turns within conversation context
 * - Collecting user feedback for AI response quality
 * - Supporting conversation-to-journey transitions
 * 
 * @returns {JSX.Element} Complete chat interface with messages, input, and controls
 */
export function ChatInterface({
  messages = [],
  conversations = [],
  onSendMessage,
  onVoteMessage,
  onStartConversation,
  onSelectConversation
}: ChatInterfaceProps) {
  const [currentMessage, setCurrentMessage] = useState('')

  const handleSend = () => {
    if (currentMessage.trim() && onSendMessage) {
      onSendMessage(currentMessage.trim())
      setCurrentMessage('')
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <Container size="xl" h="100%" p={{ base: 'xs', sm: 'md' }}>
      <Group align="flex-start" gap="md" h="100%">
        {/* Conversation History Sidebar */}
        <Box 
          style={{ width: 250, flexShrink: 0 }} 
          visibleFrom="sm"
        >
          <ConversationHistory
            conversations={conversations}
            onSelect={onSelectConversation || (() => {})}
            onStartNew={onStartConversation || (() => {})}
          />
        </Box>

        <Divider 
          orientation="vertical" 
          visibleFrom="sm" 
        />

        {/* Main Chat Area */}
        <Stack style={{ flex: 1, height: '100%' }}>
          {isEmpty ? (
            /* Empty State */
            <Container size="sm" style={{ flex: 1 }}>
              <Stack align="center" justify="center" h="100%" gap="xl">
                <div style={{ textAlign: 'center' }}>
                  <IconRobot size={48} color="gray" />
                  <Text size="xl" fw={600} mt="md">
                    AI Writing Assistant
                  </Text>
                  <Text c="dimmed" mt="sm" maw={400}>
                    Start a conversation to get writing help, brainstorm ideas, 
                    or explore topics before creating structured content.
                  </Text>
                </div>

                <SuggestedPrompts 
                  onSelectPrompt={(prompt) => {
                    setCurrentMessage(prompt)
                    if (onSendMessage) {
                      onSendMessage(prompt)
                    }
                  }}
                />

                <Text size="sm" c="dimmed" ta="center">
                  This demonstrates <strong>conversation tracking</strong> in Bilan analytics,
                  with turn correlation and user engagement measurement.
                </Text>
              </Stack>
            </Container>
          ) : (
            /* Active Conversation */
            <>
              <ScrollArea style={{ flex: 1 }} type="hover">
                <Stack gap="md" p="md">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      onVote={onVoteMessage}
                    />
                  ))}
                </Stack>
              </ScrollArea>
            </>
          )}

          {/* Message Input */}
          <Group gap="sm" p={{ base: 'xs', sm: 'md' }}>
            <TextInput
              style={{ flex: 1 }}
              placeholder="Type your message..."
              value={currentMessage}
              onChange={(event) => setCurrentMessage(event.currentTarget.value)}
              onKeyPress={handleKeyPress}
              rightSection={
                <ActionIcon 
                  variant="filled" 
                  onClick={handleSend}
                  disabled={!currentMessage.trim()}
                >
                  <IconSend size={16} />
                </ActionIcon>
              }
            />
          </Group>
        </Stack>
      </Group>
    </Container>
  )
} 