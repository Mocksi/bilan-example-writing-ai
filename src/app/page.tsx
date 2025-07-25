'use client'

import { Container, Title, Text, SimpleGrid, Stack, Card, Button, Group, Modal, Textarea, Badge } from '@mantine/core'
import { useState } from 'react'
import { IconThumbUp, IconThumbDown, IconLanguage } from '@tabler/icons-react'
import { ChatInterface } from '../components/ChatInterface'
import { useNavigation, useQuickActions } from '../hooks'
import { LoadingState } from '../components/LoadingState'

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
  const [showQuickAction, setShowQuickAction] = useState(false)
  const [showChat, setShowChat] = useState(false)

  const handleDemoSelect = (demoId: string) => {
    switch (demoId) {
      case 'quick-action':
        setShowQuickAction(true)
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

      {/* Quick Action Modal - Single Turn Demo */}
      {showQuickAction && (
        <Modal
          opened={showQuickAction}
          onClose={() => setShowQuickAction(false)}
          title="Translation Demo - Single Turn Pattern"
          size="lg"
        >
          <TranslationQuickAction />
        </Modal>
      )}

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
              <ChatInterface />
            </Stack>
          </Card>
        </Container>
      )}
    </Container>
  )
}
