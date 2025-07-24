'use client'

import { useState, useEffect } from 'react'
import { 
  Stack, 
  TextInput, 
  Textarea, 
  Button, 
  Text, 
  Title, 
  Card, 
  Group,
  Select,
  Chip,
  Alert,
  ScrollArea,
  Divider
} from '@mantine/core'
import { generateContentForType } from '../../lib/ai-client'
import { startConversation, endConversation, trackTurn } from '../../lib/bilan'

export interface TopicExplorationData {
  topic: string
  audience: string
  keyPoints: string[]
  tone: string
  initialBrief?: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface TopicExplorationStepProps {
  journeyId: string
  onComplete: (data: TopicExplorationData) => void
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  turnId?: string
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal', label: 'Formal' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'authoritative', label: 'Authoritative' }
]

const AUDIENCE_SUGGESTIONS = [
  'Developers', 'Entrepreneurs', 'Students', 'Professionals', 
  'Beginners', 'Experts', 'General Public', 'Industry Specialists'
]

export function TopicExplorationStep({ journeyId, onComplete }: TopicExplorationStepProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [conversationId, setConversationId] = useState<string>('')
  const [hasStartedConversation, setHasStartedConversation] = useState(false)

  // Form state for topic refinement
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [selectedKeyPoints, setSelectedKeyPoints] = useState<string[]>([])
  const [suggestedKeyPoints, setSuggestedKeyPoints] = useState<string[]>([])
  const [tone, setTone] = useState<string>('professional')
  const [showRefinementForm, setShowRefinementForm] = useState(false)

  // Start conversation when component mounts
  useEffect(() => {
    const initConversation = async () => {
      try {
        const convId = await startConversation({
          journeyId,
          topic: 'blog-topic-exploration',
          contentType: 'blog'
        })
        
        if (convId) {
          setConversationId(convId)
          
          // Add initial AI message
          const initialMessage: ConversationMessage = {
            role: 'assistant',
            content: `Hi! I'm here to help you explore and refine your blog topic. Let's start by understanding what you'd like to write about.

What's your initial idea for the blog post? It could be:
• A problem you want to solve
• A topic you're passionate about  
• Something you've learned recently
• An industry trend or insight

Don't worry if it's not fully formed yet - we'll develop it together!`,
            timestamp: Date.now()
          }
          
          setMessages([initialMessage])
          setHasStartedConversation(true)
        }
      } catch (error) {
        console.error('Failed to start conversation:', error)
      }
    }

    initConversation()
  }, [journeyId])

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isGenerating || !conversationId) return

    const userMessage: ConversationMessage = {
      role: 'user',
      content: currentInput,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentInput('')
    setIsGenerating(true)

    try {
      // Build conversation context for AI
      const conversationContext = [...messages, userMessage]
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n')

      const prompt = `You are an expert content strategist helping a user explore and refine their blog topic. Based on our conversation so far, provide helpful guidance.

Conversation so far:
${conversationContext}

Please respond as a helpful content strategist by:
1. Acknowledging what the user shared
2. Asking thoughtful follow-up questions to help clarify the topic
3. Suggesting specific angles or focuses
4. If the topic seems well-defined, start identifying key points and target audience

Keep your response conversational, encouraging, and focused on helping them develop a compelling blog topic.`

      // Track the turn with Bilan
      const { result, turnId } = await trackTurn(
        currentInput,
        () => generateContentForType('blog', prompt),
        {
          contentType: 'blog',
          iterationNumber: messages.length / 2 + 1,
          conversationId,
          journey_id: journeyId,
          journey_step: 'topic-exploration',
          userIntent: 'topic-exploration'
        }
      )

      const aiMessage: ConversationMessage = {
        role: 'assistant',
        content: result.text,
        timestamp: Date.now(),
        turnId
      }

      setMessages(prev => [...prev, aiMessage])

      // Auto-extract potential topic and key points from conversation
      await extractTopicInsights([...messages, userMessage, aiMessage])

    } catch (error) {
      console.error('Failed to generate response:', error)
      
      const errorMessage: ConversationMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error generating my response. Please try again or continue with the topic refinement form below.',
        timestamp: Date.now()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
    }
  }

  const extractTopicInsights = async (conversationMessages: ConversationMessage[]) => {
    try {
      // Extract insights from the conversation to pre-populate the form
      const conversationText = conversationMessages
        .map(msg => msg.content)
        .join(' ')

      const extractionPrompt = `Based on this conversation about a blog topic, extract the following information and respond with ONLY a valid JSON object:

Conversation: ${conversationText}

Analyze the conversation and extract:
- topic: The main blog topic or title (string, or null if unclear)
- audience: The target audience (string, or null if not mentioned)
- keyPoints: Array of 3-5 key points or subtopics (array of strings, or empty array if none identified)

Respond with ONLY a JSON object in this exact format:
{
  "topic": "extracted topic or null",
  "audience": "target audience or null", 
  "keyPoints": ["point 1", "point 2", "point 3"]
}

Do not include any explanation or additional text - only the JSON object.`

      const { result } = await trackTurn(
        'Extract topic insights',
        () => generateContentForType('blog', extractionPrompt),
        {
          contentType: 'blog',
          conversationId,
          journey_id: journeyId,
          journey_step: 'topic-exploration',
          userIntent: 'topic-extraction'
        }
      )

      // Parse the JSON response safely
      try {
        // Clean the response text by removing any potential markdown code blocks or extra whitespace
        const cleanedResponse = result.text
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim()

        const insights = JSON.parse(cleanedResponse)

        // Validate the JSON structure and extract insights
        if (insights && typeof insights === 'object') {
          // Extract topic if present and valid
          if (insights.topic && typeof insights.topic === 'string' && insights.topic.toLowerCase() !== 'null' && !topic) {
            setTopic(insights.topic.trim())
          }

          // Extract audience if present and valid
          if (insights.audience && typeof insights.audience === 'string' && insights.audience.toLowerCase() !== 'null' && !audience) {
            setAudience(insights.audience.trim())
          }

          // Extract key points if present and valid
          if (Array.isArray(insights.keyPoints) && insights.keyPoints.length > 0) {
            const validKeyPoints = insights.keyPoints
              .filter((point: unknown): point is string => typeof point === 'string' && point.trim().length > 0)
              .map((point: string) => point.trim())
            
            if (validKeyPoints.length > 0) {
              setSuggestedKeyPoints(validKeyPoints)
            }
          }
        }
      } catch (jsonError) {
        console.warn('Failed to parse JSON from AI response, falling back to text parsing:', jsonError instanceof Error ? jsonError.message : 'Unknown JSON error')
        
        // Fallback to original string parsing if JSON parsing fails
        const lines = result.text.split('\n')
        lines.forEach(line => {
          if (line.includes('topic') && !line.toLowerCase().includes('null') && !topic) {
            const match = line.match(/"topic":\s*"([^"]+)"/i)
            if (match && match[1]) {
              setTopic(match[1].trim())
            }
          }
          if (line.includes('audience') && !line.toLowerCase().includes('null') && !audience) {
            const match = line.match(/"audience":\s*"([^"]+)"/i)
            if (match && match[1]) {
              setAudience(match[1].trim())
            }
          }
          if (line.includes('keyPoints') && line.includes('[')) {
            const match = line.match(/"keyPoints":\s*\[([^\]]+)\]/i)
            if (match && match[1]) {
              const points = match[1]
                .split(',')
                .map(p => p.replace(/"/g, '').trim())
                .filter(p => p.length > 0)
              if (points.length > 0) {
                setSuggestedKeyPoints(points)
              }
            }
          }
        })
      }

      // Show refinement form if we have some insights
      if (conversationMessages.length >= 4) {
        setShowRefinementForm(true)
      }

    } catch (error) {
      console.error('Failed to extract topic insights:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleKeyPointToggle = (point: string) => {
    setSelectedKeyPoints(prev => 
      prev.includes(point) 
        ? prev.filter(p => p !== point)
        : [...prev, point]
    )
  }

  const handleComplete = async () => {
    if (!topic.trim()) {
      return
    }

    try {
      // End the conversation
      if (conversationId) {
        await endConversation(conversationId, 'completed', {
          satisfactionScore: 1,
          outcome: 'topic-defined',
          finalTopic: topic
        })
      }

      // Prepare the topic exploration data
      const explorationData: TopicExplorationData = {
        topic: topic.trim(),
        audience: audience.trim() || 'General audience',
        keyPoints: selectedKeyPoints.length > 0 ? selectedKeyPoints : suggestedKeyPoints.slice(0, 3),
        tone,
        initialBrief: messages.find(m => m.role === 'user')?.content || '',
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
      }

      onComplete(explorationData)
    } catch (error) {
      console.error('Failed to complete topic exploration:', error)
    }
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={3} mb="xs">Topic Exploration</Title>
        <Text c="dimmed" size="sm">
          Let's have a conversation to discover and refine your blog topic. Share your initial ideas and I'll help you develop them.
        </Text>
      </div>

      {/* Conversation Interface */}
      <Card withBorder p="md">
        <Text fw={500} mb="sm">Conversation</Text>
        
        <ScrollArea h={300} mb="md">
          <Stack gap="sm">
            {messages.map((message, index) => (
              <Card 
                key={index}
                p="sm"
                withBorder={message.role === 'user'}
                bg={message.role === 'user' ? 'blue.0' : 'gray.0'}
              >
                <Text size="sm" fw={500} mb="xs" c={message.role === 'user' ? 'blue' : 'dark'}>
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                </Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </Text>
              </Card>
            ))}
            
            {isGenerating && (
              <Card p="sm" bg="gray.0">
                <Text size="sm" fw={500} mb="xs" c="dark">AI Assistant</Text>
                <Text size="sm" c="dimmed">Thinking...</Text>
              </Card>
            )}
          </Stack>
        </ScrollArea>

        <Group gap="sm">
          <TextInput
            flex={1}
            placeholder="Share your blog topic ideas..."
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isGenerating}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!currentInput.trim() || isGenerating}
            loading={isGenerating}
          >
            Send
          </Button>
        </Group>
      </Card>

      {/* Topic Refinement Form */}
      {showRefinementForm && (
        <>
          <Divider label="Topic Refinement" labelPosition="center" />
          
          <Card withBorder p="md">
            <Text fw={500} mb="md">Refine Your Topic Details</Text>
            
            <Stack gap="md">
              <TextInput
                label="Blog Topic/Title"
                placeholder="Enter your refined blog topic..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />

              <TextInput
                label="Target Audience"
                placeholder="Who is this blog post for?"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />

              <div>
                <Text size="sm" fw={500} mb="xs">Key Points to Cover</Text>
                <Text size="xs" c="dimmed" mb="sm">
                  Select the key points you want to cover in your blog post:
                </Text>
                <Group gap="xs">
                  {suggestedKeyPoints.map((point) => (
                    <Chip
                      key={point}
                      checked={selectedKeyPoints.includes(point)}
                      onChange={() => handleKeyPointToggle(point)}
                      size="sm"
                    >
                      {point}
                    </Chip>
                  ))}
                </Group>
                {selectedKeyPoints.length === 0 && suggestedKeyPoints.length === 0 && (
                  <Text size="xs" c="dimmed">
                    Continue the conversation above to get suggested key points
                  </Text>
                )}
              </div>

              <Select
                label="Tone & Style"
                value={tone}
                onChange={(value) => setTone(value || 'professional')}
                data={TONE_OPTIONS}
              />
            </Stack>
          </Card>
        </>
      )}

      {/* Action Buttons */}
      <Group justify="space-between">
        <div>
          {!showRefinementForm && hasStartedConversation && (
            <Button 
              variant="light" 
              onClick={() => setShowRefinementForm(true)}
            >
              Skip to Topic Form
            </Button>
          )}
        </div>
        
        <Button 
          onClick={handleComplete}
          disabled={!topic.trim()}
          size="md"
        >
          Complete Topic Exploration
        </Button>
      </Group>

      {!topic.trim() && showRefinementForm && (
        <Alert color="yellow" title="Topic Required">
          Please enter a blog topic to continue to the next step.
        </Alert>
      )}
    </Stack>
  )
} 