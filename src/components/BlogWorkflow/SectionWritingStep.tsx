'use client'

import { useState, useEffect } from 'react'
import { 
  Stack, 
  Button, 
  Text, 
  Title, 
  Card, 
  Group,
  Textarea,
  Alert,
  Badge,
  Paper,
  Tabs,
  ScrollArea,
  Select,
  Divider,
  Progress,
  ActionIcon,
  Modal
} from '@mantine/core'
import { generateContentForType } from '../../lib/ai-client'
import { startConversation, endConversation, trackTurn } from '../../lib/bilan'
import type { TopicExplorationData } from './TopicExplorationStep'
import type { OutlineGenerationData } from './OutlineGenerationStep'

export interface SectionWritingData {
  sections: Array<{ 
    title: string
    content: string
    status: 'draft' | 'complete'
    wordCount: number
    method: 'ai-generated' | 'conversation' | 'manual'
    conversationId?: string
  }>
  totalWordCount: number
  completedAt: number
}

export interface SectionWritingStepProps {
  journeyId: string
  topicData?: TopicExplorationData
  outlineData?: OutlineGenerationData
  onComplete: (data: SectionWritingData) => void
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  turnId?: string
}

interface SectionState {
  title: string
  content: string
  status: 'draft' | 'complete'
  method: 'ai-generated' | 'conversation' | 'manual'
  conversationId?: string
  conversationMessages?: ConversationMessage[]
  isGenerating: boolean
  wordCount: number
}

export function SectionWritingStep({ journeyId, topicData, outlineData, onComplete }: SectionWritingStepProps) {
  const [sections, setSections] = useState<SectionState[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [currentInput, setCurrentInput] = useState('')
  const [showConversationModal, setShowConversationModal] = useState(false)
  const [conversationalSectionIndex, setConversationalSectionIndex] = useState<number | null>(null)

  // Initialize sections from outline data
  useEffect(() => {
    if (outlineData && sections.length === 0) {
      const initialSections: SectionState[] = outlineData.sections.map(section => ({
        title: section.title,
        content: '',
        status: 'draft' as const,
        method: 'ai-generated' as const,
        isGenerating: false,
        wordCount: 0
      }))
      
      setSections(initialSections)
      setActiveSection(initialSections[0]?.title || null)
    }
  }, [outlineData, sections.length])

  const buildSectionPrompt = (sectionTitle: string, sectionIndex: number) => {
    const section = outlineData?.sections[sectionIndex]
    
    return `Write a detailed section for a blog post with the following context:

Blog Topic: ${topicData?.topic || 'Blog topic'}
Target Audience: ${topicData?.audience || 'General audience'}
Tone: ${topicData?.tone || 'professional'}
Overall Outline: ${outlineData?.outline || 'No outline provided'}

Section to Write: ${sectionTitle}
Section Description: ${section?.description || 'No description provided'}

${topicData?.keyPoints && topicData.keyPoints.length > 0 ? `
Key Points to Consider: ${topicData.keyPoints.join(', ')}
` : ''}

${outlineData && sectionIndex > 0 ? `
Previous Sections Written:
${sections.slice(0, sectionIndex).map((s, i) => `${i + 1}. ${s.title}: ${s.content.substring(0, 200)}...`).join('\n')}
` : ''}

Please write a comprehensive section that:
1. Flows naturally from the previous content
2. Addresses the section topic thoroughly
3. Maintains the specified tone and style
4. Includes practical examples where appropriate
5. Is approximately 200-400 words
6. Connects smoothly to the next section

Write only the section content without section headers or numbering.`
  }

  const handleGenerateSection = async (sectionIndex: number) => {
    const section = sections[sectionIndex]
    if (!section) return

    setSections(prev => prev.map((s, i) => 
      i === sectionIndex 
        ? { ...s, isGenerating: true, method: 'ai-generated' }
        : s
    ))

    try {
      const prompt = buildSectionPrompt(section.title, sectionIndex)
      
      const { result, turnId } = await trackTurn(
        `Generate section: ${section.title}`,
        () => generateContentForType('blog', prompt),
        {
          contentType: 'blog',
          iterationNumber: 1,
          journey_id: journeyId,
          journey_step: 'section-writing',
          userIntent: 'section-generation',
          sectionTitle: section.title,
          sectionIndex
        }
      )

      const content = result.text.trim()
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length

      setSections(prev => prev.map((s, i) => 
        i === sectionIndex 
          ? { 
              ...s, 
              content,
              wordCount,
              status: 'complete',
              isGenerating: false,
              method: 'ai-generated'
            }
          : s
      ))

    } catch (error) {
      console.error('Failed to generate section:', error)
      
      setSections(prev => prev.map((s, i) => 
        i === sectionIndex 
          ? { ...s, isGenerating: false }
          : s
      ))
    }
  }

  const handleStartConversation = async (sectionIndex: number) => {
    const section = sections[sectionIndex]
    if (!section) return

    try {
      const conversationId = await startConversation({
        journeyId,
        topic: `section-writing-${section.title}`,
        contentType: 'blog'
      })

      if (conversationId) {
        // Add initial AI message
        const initialMessage: ConversationMessage = {
          role: 'assistant',
          content: `Let's work on the "${section.title}" section together. I'll help you develop this part of your blog post through our conversation.

Based on your topic and outline, this section should cover: ${outlineData?.sections[sectionIndex]?.description || 'the main points for this section'}.

What specific aspect of "${section.title}" would you like to explore first? Or would you like me to suggest some approaches?`,
          timestamp: Date.now()
        }

        setSections(prev => prev.map((s, i) => 
          i === sectionIndex 
            ? { 
                ...s, 
                method: 'conversation',
                conversationId,
                conversationMessages: [initialMessage]
              }
            : s
        ))

        setConversationalSectionIndex(sectionIndex)
        setShowConversationModal(true)
      }
    } catch (error) {
      console.error('Failed to start section conversation:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!currentInput.trim() || conversationalSectionIndex === null) return

    const sectionIndex = conversationalSectionIndex
    const section = sections[sectionIndex]
    if (!section || !section.conversationId) return

    const userMessage: ConversationMessage = {
      role: 'user',
      content: currentInput,
      timestamp: Date.now()
    }

    // Add user message
    setSections(prev => prev.map((s, i) => 
      i === sectionIndex 
        ? { 
            ...s, 
            conversationMessages: [...(s.conversationMessages || []), userMessage],
            isGenerating: true
          }
        : s
    ))

    setCurrentInput('')

    try {
      // Build conversation context
      const conversationHistory = [...(section.conversationMessages || []), userMessage]
      const conversationContext = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n')

      const prompt = `You are helping a user write the "${section.title}" section of their blog post through conversation. 

Blog Context:
- Topic: ${topicData?.topic || 'Blog topic'}
- Audience: ${topicData?.audience || 'General audience'}
- Tone: ${topicData?.tone || 'professional'}
- Section Description: ${outlineData?.sections[sectionIndex]?.description || 'No description'}

Conversation so far:
${conversationContext}

Please respond as a helpful writing coach by:
1. Addressing the user's question or input
2. Asking follow-up questions to develop ideas
3. Suggesting specific content or examples
4. Helping refine the section content
5. When the user seems ready, offering to generate draft content based on the discussion

Keep responses focused on developing this specific section of the blog post.`

      const { result, turnId } = await trackTurn(
        currentInput,
        () => generateContentForType('blog', prompt),
        {
          contentType: 'blog',
          iterationNumber: conversationHistory.length / 2,
          conversationId: section.conversationId,
          journey_id: journeyId,
          journey_step: 'section-writing',
          userIntent: 'section-conversation',
          sectionTitle: section.title
        }
      )

      const aiMessage: ConversationMessage = {
        role: 'assistant',
        content: result.text,
        timestamp: Date.now(),
        turnId
      }

      setSections(prev => prev.map((s, i) => 
        i === sectionIndex 
          ? { 
              ...s, 
              conversationMessages: [...(s.conversationMessages || []), userMessage, aiMessage],
              isGenerating: false
            }
          : s
      ))

    } catch (error) {
      console.error('Failed to send message:', error)
      
      setSections(prev => prev.map((s, i) => 
        i === sectionIndex 
          ? { ...s, isGenerating: false }
          : s
      ))
    }
  }

  const handleGenerateFromConversation = async (sectionIndex: number) => {
    const section = sections[sectionIndex]
    if (!section || !section.conversationMessages) return

    setSections(prev => prev.map((s, i) => 
      i === sectionIndex 
        ? { ...s, isGenerating: true }
        : s
    ))

    try {
      const conversationSummary = section.conversationMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n')

      const prompt = `Based on our conversation, generate the final content for the "${section.title}" section of the blog post.

Blog Context:
- Topic: ${topicData?.topic}
- Audience: ${topicData?.audience}
- Tone: ${topicData?.tone}

Our Conversation Summary:
${conversationSummary}

Please generate a polished section (200-400 words) that incorporates the ideas we discussed. Write only the section content without headers.`

      const { result, turnId } = await trackTurn(
        `Generate section from conversation: ${section.title}`,
        () => generateContentForType('blog', prompt),
        {
          contentType: 'blog',
          conversationId: section.conversationId,
          journey_id: journeyId,
          journey_step: 'section-writing',
          userIntent: 'section-from-conversation',
          sectionTitle: section.title
        }
      )

      const content = result.text.trim()
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length

      setSections(prev => prev.map((s, i) => 
        i === sectionIndex 
          ? { 
              ...s, 
              content,
              wordCount,
              status: 'complete',
              isGenerating: false
            }
          : s
      ))

      // End the conversation
      if (section.conversationId) {
        await endConversation(section.conversationId, 'completed', {
          satisfactionScore: 1,
          outcome: 'section-generated'
        })
      }

      setShowConversationModal(false)
      setConversationalSectionIndex(null)

    } catch (error) {
      console.error('Failed to generate section from conversation:', error)
      
      setSections(prev => prev.map((s, i) => 
        i === sectionIndex 
          ? { ...s, isGenerating: false }
          : s
      ))
    }
  }

  const handleManualEdit = (sectionIndex: number, content: string) => {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
    
    setSections(prev => prev.map((s, i) => 
      i === sectionIndex 
        ? { 
            ...s, 
            content,
            wordCount,
            status: content.trim() ? 'complete' : 'draft',
            method: 'manual'
          }
        : s
    ))
  }

  const getTotalWordCount = () => {
    return sections.reduce((total, section) => total + section.wordCount, 0)
  }

  const getCompletedSections = () => {
    return sections.filter(section => section.status === 'complete').length
  }

  const handleComplete = () => {
    const completedSections = sections.filter(s => s.status === 'complete')
    
    if (completedSections.length === 0) return

    const sectionData: SectionWritingData = {
      sections: sections.map(section => ({
        title: section.title,
        content: section.content,
        status: section.status,
        wordCount: section.wordCount,
        method: section.method,
        conversationId: section.conversationId
      })),
      totalWordCount: getTotalWordCount(),
      completedAt: Date.now()
    }

    onComplete(sectionData)
  }

  const renderSectionCard = (section: SectionState, index: number) => (
    <Card key={section.title} withBorder p="md" mb="md">
      <Group justify="space-between" mb="sm">
        <div>
          <Text fw={500} size="sm">
            {index + 1}. {section.title}
          </Text>
          <Text size="xs" c="dimmed">
            {outlineData?.sections[index]?.description}
          </Text>
        </div>
        <Group gap="xs">
          <Badge 
            size="xs" 
            color={section.status === 'complete' ? 'green' : 'gray'}
          >
            {section.status === 'complete' ? `${section.wordCount} words` : 'Draft'}
          </Badge>
          <Badge size="xs" variant="light">
            {section.method === 'ai-generated' ? 'AI' : 
             section.method === 'conversation' ? 'Chat' : 'Manual'}
          </Badge>
        </Group>
      </Group>

      {section.content ? (
        <Textarea
          value={section.content}
          onChange={(e) => handleManualEdit(index, e.target.value)}
          minRows={4}
          maxRows={12}
          mb="sm"
          styles={{
            input: { fontSize: '14px', lineHeight: 1.5 }
          }}
        />
      ) : (
        <Text size="sm" c="dimmed" mb="sm" style={{ minHeight: '60px' }}>
          Section content will appear here...
        </Text>
      )}

      <Group gap="sm">
        <Button
          size="xs"
          variant="light"
          onClick={() => handleGenerateSection(index)}
          loading={section.isGenerating}
          disabled={section.isGenerating}
        >
          Generate with AI
        </Button>
        <Button
          size="xs"
          variant="light"
          color="blue"
          onClick={() => handleStartConversation(index)}
          disabled={section.isGenerating}
        >
          Start Conversation
        </Button>
        {section.method === 'conversation' && section.conversationMessages && (
          <Button
            size="xs"
            variant="light"
            color="green"
            onClick={() => handleGenerateFromConversation(index)}
            loading={section.isGenerating}
          >
            Generate from Chat
          </Button>
        )}
      </Group>
    </Card>
  )

  const completedCount = getCompletedSections()
  const totalCount = sections.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <Stack gap="lg">
      <div>
        <Title order={3} mb="xs">Section Writing</Title>
        <Text c="dimmed" size="sm">
          Write each section of your blog post. Choose between AI generation, conversational development, or manual writing.
        </Text>
      </div>

      {/* Progress Overview */}
      <Card withBorder p="md" bg="gray.0">
        <Group justify="space-between" mb="sm">
          <Text fw={500}>Writing Progress</Text>
          <Text size="sm" c="dimmed">
            {completedCount} of {totalCount} sections • {getTotalWordCount()} words total
          </Text>
        </Group>
        <Progress value={progress} size="lg" />
      </Card>

      {/* Sections */}
      <ScrollArea h={600}>
        <Stack gap="md">
          {sections.map((section, index) => renderSectionCard(section, index))}
        </Stack>
      </ScrollArea>

      {/* Conversation Modal */}
      <Modal
        opened={showConversationModal}
        onClose={() => setShowConversationModal(false)}
        title={`Writing: ${conversationalSectionIndex !== null ? sections[conversationalSectionIndex]?.title : ''}`}
        size="lg"
      >
        {conversationalSectionIndex !== null && (
          <Stack gap="md">
            <ScrollArea h={300}>
              <Stack gap="sm">
                {sections[conversationalSectionIndex]?.conversationMessages?.map((message, index) => (
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
                
                {sections[conversationalSectionIndex]?.isGenerating && (
                  <Card p="sm" bg="gray.0">
                    <Text size="sm" fw={500} mb="xs" c="dark">AI Assistant</Text>
                    <Text size="sm" c="dimmed">Thinking...</Text>
                  </Card>
                )}
              </Stack>
            </ScrollArea>

            <Group gap="sm">
              <Textarea
                flex={1}
                placeholder="Continue the conversation about this section..."
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                disabled={sections[conversationalSectionIndex]?.isGenerating}
                minRows={2}
                maxRows={4}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || sections[conversationalSectionIndex]?.isGenerating}
                loading={sections[conversationalSectionIndex]?.isGenerating}
              >
                Send
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Action Buttons */}
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Complete at least some sections to continue
        </Text>
        
        <Button 
          onClick={handleComplete}
          disabled={completedCount === 0}
          size="md"
        >
          Complete Section Writing ({completedCount}/{totalCount})
        </Button>
      </Group>

      {completedCount === 0 && (
        <Alert color="yellow" title="Sections Required">
          Please write at least one section to continue to the next step.
        </Alert>
      )}
    </Stack>
  )
} 