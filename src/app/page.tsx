'use client'

import { Container, Title, Text, SimpleGrid, Stack, Card, Button, Group, Modal } from '@mantine/core'
import { useState } from 'react'
import { QuickActionModal } from '../components/QuickActionModal'
import { WebLLMChat } from '../components/WebLLMChat'
import { useNavigation, useQuickActions } from '../hooks'
import { IconLanguage } from '@tabler/icons-react'

/**
 * Core business logic configuration for AI content generation types
 * 
 * This array defines the three primary content types available in the Bilan Content Creation Demo,
 * serving as the foundation for the content type selection interface and subsequent AI generation workflows.
 * Each content type has specific characteristics that influence prompt engineering, AI model parameters,
 * and user experience patterns.
 * 
 * @remarks
 * This configuration drives the entire content creation user journey:
 * - Content type selection UI rendering
 * - AI prompt template selection in lib/prompts.ts
 * - Content generation parameter tuning in lib/content-generation.ts
 * - Bilan analytics event categorization and tracking
 * 
 * @example
 * ```typescript
 * // Each content type object structure:
 * {
 *   contentType: 'blog',           // Typed enum value for internal processing
 *   title: 'Blog Posts',          // User-facing display name
 *   description: 'Create...',     // Explanatory text for user guidance
 *   icon: '📝',                   // Visual identifier (emoji)
 *   examples: ['...', '...']      // Concrete use cases to inspire users
 * }
 * ```
 */
// Demo cards showing three core Bilan integration patterns
const demoCards = [
  {
    id: 'quick-action',
    title: 'Quick Translation',
    description: 'Single AI turn with optional voting. Demonstrates the simplest Bilan integration pattern - one interaction, one vote.',
    icon: '🌐',
    examples: [
      'Translate any text',
      'Single turn tracking',
      'Optional feedback vote'
    ],
    pattern: 'Single Turn + Vote'
  },
  {
    id: 'conversation',  
    title: 'AI Chat',
    description: 'Multi-turn conversation with AI. Each message is tracked, demonstrating conversation management with start/end tracking.',
    icon: '💬',
    examples: [
      'Multiple turns',
      'Conversation tracking',
      'Vote on any response'
    ],
    pattern: 'Conversation (Multiple Turns)'
  },
  {
    id: 'workflow',
    title: 'Email Workflow',
    description: 'Guided email creation workflow. Demonstrates journey tracking with steps, multiple turns, and comprehensive analytics.',
    icon: '📧',
    examples: [
      'Journey with steps',
      'Multiple AI turns',
      'Vote at each stage'
    ],
    pattern: 'Journey + Steps + Turns'
  }
]

export default function HomePage() {
  const { navigateToCreator } = useNavigation()
  const [showChat, setShowChat] = useState(false)
  const quickActions = useQuickActions()

  // Handle voting on quick action results
  const handleQuickActionVote = async (turnId: string, rating: 1 | -1) => {
    try {
      // Import vote function from bilan
      const { vote } = await import('../lib/bilan')
      
      // Submit vote to Bilan
      await vote(turnId, rating, undefined, {
        feedbackType: rating === 1 ? 'accept' : 'reject',
        action_context: 'quick_action_demo'
      })

      console.log('Vote submitted successfully:', turnId, rating)
    } catch (error) {
      console.error('Failed to submit vote:', error)
    }
  }

  const handleDemoSelect = (demoId: string) => {
    switch (demoId) {
      case 'quick-action':
        // Open translation quick action
        quickActions.openAction({
          id: 'translate',
          label: 'Translate',
          description: 'Translate text to any language',
          icon: <IconLanguage size={16} />,
          placeholder: 'Enter text to translate and specify target language...',
          maxLength: 3000
        })
        break
      case 'conversation':
        setShowChat(true)
        break
      case 'workflow':
        navigateToCreator('email')
        break
    }
  }

  return (
    <Container size="xl" py="xl">
      <Stack align="center" gap="xl" mb="xl">
        <Title order={1} ta="center" fw={700}>
          Bilan SDK Demo - Three Core Patterns
        </Title>
        
        <Text size="lg" ta="center" c="dimmed" maw={600}>
          Explore three fundamental ways to integrate Bilan analytics into your AI application.
          Each demo showcases a different tracking pattern.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        {demoCards.map((demo) => (
          <Card key={demo.id} shadow="sm" padding="lg" radius="md" withBorder>
            <Stack>
              <Group justify="space-between" align="flex-start">
                <Text size="2rem">{demo.icon}</Text>
                <Text size="xs" c="dimmed" fw={500}>{demo.pattern}</Text>
              </Group>
              
              <Text size="lg" fw={600}>{demo.title}</Text>
              <Text size="sm" c="dimmed">{demo.description}</Text>
              
              <Stack gap="xs">
                {demo.examples.map((example, idx) => (
                  <Group key={idx} gap="xs">
                    <Text size="xs" c="blue">•</Text>
                    <Text size="xs" c="dimmed">{example}</Text>
                  </Group>
                ))}
              </Stack>
              
              <Button 
                fullWidth 
                mt="md"
                onClick={() => handleDemoSelect(demo.id)}
              >
                Try {demo.title}
              </Button>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      {/* Quick Action Modal - Managed by useQuickActions hook */}
      <QuickActionModal
        opened={quickActions.isModalOpen}
        onClose={quickActions.closeAction}
        action={quickActions.selectedAction}
        onSubmit={quickActions.processAction}
        onVote={handleQuickActionVote}
      />

      {/* Chat Interface - Conversation Demo */}
      {showChat && (
        <Container size="lg" mt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack>
              <Group justify="space-between">
                <Title order={3}>AI Conversation Demo</Title>
                <Button variant="subtle" onClick={() => setShowChat(false)}>
                  Close
                </Button>
              </Group>
              <Text size="sm" c="dimmed">
                Each message creates a tracked turn. Conversation ID links all turns together.
              </Text>
              <WebLLMChat onClose={() => setShowChat(false)} />
            </Stack>
          </Card>
        </Container>
      )}
    </Container>
  )
}
