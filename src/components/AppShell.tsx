'use client'

import { 
  AppShell as MantineAppShell, 
  Burger, 
  Group, 
  Text, 
  Button, 
  Stack,
  Tabs,
  Box
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { 
  IconSparkles,
  IconPencil,
  IconMail,
  IconBrandTwitter
} from '@tabler/icons-react'
import { ReactNode, useState, useEffect } from 'react'
import { AIStatusIndicator } from './AIStatusIndicator'
import { QuickActionModal, type QuickAction } from './QuickActionModal'
import { useQuickActions } from '../hooks/useQuickActions'
import { vote, track, initializeBilan, createUserId } from '../lib/bilan'
import { trackQuickActionFeedback } from '../lib/quick-action-analytics'

interface AppShellProps {
  children: ReactNode
}

/**
 * Quick action definitions for standalone AI interactions
 * 
 * Defines the available quick actions that users can perform as standalone turns
 * (not part of conversations or journeys). Each action represents a single AI
 * interaction with immediate results.
 */



/**
 * Main application shell component implementing dual-mode interface
 * 
 * Provides the primary navigation structure for the Bilan Content Creation Demo,
 * featuring a dual-mode layout that demonstrates all three Bilan tracking concepts:
 * 
 * - **Workflows Tab**: Journey-focused content creation workflows (blog, email, social)
 * - **Chat Tab**: Conversation-focused AI assistant for open-ended interactions  
 * - **Quick Actions**: Standalone turns for immediate AI assistance
 * 
 * The shell manages the overall application state and provides consistent navigation
 * patterns throughout the user experience. It serves as the container for both
 * structured workflows (journeys) and free-form conversations.
 * 
 * @component
 * @param {AppShellProps} props - Component properties
 * @param {ReactNode} props.children - Child components to render in the main content area
 * 
 * @example
 * ```tsx
 * <AppShell>
 *   <WorkflowInterface />
 * </AppShell>
 * ```
 * 
 * @remarks
 * This component implements the architectural vision from the technical specification:
 * - Demonstrates clear separation between turns, conversations, and journeys
 * - Provides intuitive navigation between different AI interaction modes
 * - Maintains consistent Bilan analytics context across all user actions
 * - Uses Mantine v7 components for professional UI consistency
 * - Includes accessibility improvements with keyboard navigation and ARIA labels
 * 
 * The dual-mode interface allows users to:
 * - Start structured content creation workflows (journeys)
 * - Engage in open-ended AI conversations 
 * - Perform quick standalone AI actions (turns)
 * - Switch seamlessly between different interaction modes
 * 
 * @returns {JSX.Element} Complete application shell with navigation and content area
 */
export function AppShell({ children }: AppShellProps) {
  const [opened, { toggle }] = useDisclosure()
  const [activeTab, setActiveTab] = useState<string>('workflows')
  const quickActions = useQuickActions()

  // Initialize Bilan SDK for the entire app
  useEffect(() => {
    const initializeBilanForApp = async () => {
      try {
        const userId = createUserId(`user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`)
        await initializeBilan(userId)
        console.log('Bilan initialized in AppShell for user:', userId)
      } catch (error) {
        console.warn('Bilan initialization failed in AppShell:', error)
      }
    }

    initializeBilanForApp()
  }, [])

  /**
   * Handle analytics dashboard navigation
   * 
   * Opens the external Bilan analytics dashboard in a new tab to view
   * collected analytics data from user interactions with the demo application.
   */
  const handleAnalyticsClick = () => {
    // TODO: Integrate with actual Bilan dashboard URL from environment
    console.log('Opening Bilan analytics dashboard')
  }



  /**
   * Handle quick action vote
   * 
   * Records user feedback for the quick action result using Bilan vote tracking
   * and enhanced quick action analytics.
   */
  const handleQuickActionVote = async (turnId: string, rating: 1 | -1) => {
    try {
      const feedbackTime = Date.now()
      
      // Submit vote to Bilan for turn correlation
      await vote(turnId, rating, undefined, {
        feedbackType: rating === 1 ? 'accept' : 'reject',
        responseTime: feedbackTime,
        action_context: 'quick_action'
      })

      // Track with enhanced quick action analytics
      if (quickActions.selectedAction) {
        await trackQuickActionFeedback(
          turnId, 
          quickActions.selectedAction.id, 
          rating, 
          feedbackTime
        )
      }

      // Track general vote event for analytics
      await track('quick_action_voted', {
        turn_id: turnId,
        rating,
        vote_timestamp: feedbackTime,
        context: 'standalone_turn',
        action_id: quickActions.selectedAction?.id
      })

      console.log('Vote submitted successfully:', turnId, rating)
    } catch (error) {
      console.error('Failed to submit vote:', error)
      // Don't throw - voting failures shouldn't break user experience
    }
  }

  const handleLogoClick = () => {
    // TODO: Implement navigation to home page
    // Should use Next.js router to navigate to root route
  }

  const handleLogoKeyDown = (event: React.KeyboardEvent) => {
    // Handle keyboard activation for accessibility
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleLogoClick()
    }
  }



  return (
    <MantineAppShell
      header={{ height: { base: 60, sm: 70 } }}
      navbar={{
        width: { base: 280, sm: 300 },
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding={{ base: 'xs', sm: 'md' }}
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group 
              style={{ cursor: 'pointer' }} 
              onClick={handleLogoClick}
              onKeyDown={handleLogoKeyDown}
              role="button"
              tabIndex={0}
              aria-label="Go to homepage"
            >
              <Text size="lg" fw={600}>
                🧠 Bilan Content Demo
              </Text>
            </Group>
            <AIStatusIndicator />
          </Group>
          
          <Button
            variant="light"
            size="sm"
            onClick={handleAnalyticsClick}
          >
            View Analytics
          </Button>
        </Group>

        {/* Navigation Tabs for Dual-Mode Interface */}
        <Box px={{ base: 'xs', sm: 'md' }} pb="sm">
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'workflows')}>
            <Tabs.List>
              <Tabs.Tab value="workflows">
                <Group gap="xs">
                  <IconPencil size={16} />
                  <Text size="sm">Workflows</Text>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="chat">
                <Group gap="xs">
                  <IconSparkles size={16} />
                  <Text size="sm">Chat</Text>
                </Group>
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Box>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p={{ base: 'xs', sm: 'md' }}>
        {activeTab === 'workflows' ? (
          <Stack gap="md">
            <Text fw={500} mb="sm">
              Content Workflows
            </Text>
            
            <Text size="sm" c="dimmed" mb="md">
              Structured journeys for content creation. Each workflow guides you through 
              a multi-step process to create professional content.
            </Text>

            <Stack gap="xs">
              <Button
                variant="light"
                justify="flex-start"
                leftSection={<IconPencil size={16} />}
                fullWidth
                onClick={() => console.log('Navigate to blog workflow')}
              >
                Blog Creation
              </Button>
              <Button
                variant="light"
                justify="flex-start"
                leftSection={<IconMail size={16} />}
                fullWidth
                onClick={() => console.log('Navigate to email workflow')}
              >
                Email Campaign
              </Button>
              <Button
                variant="light"
                justify="flex-start"
                leftSection={<IconBrandTwitter size={16} />}
                fullWidth
                onClick={() => console.log('Navigate to social workflow')}
              >
                Social Media
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack gap="md">
            <Text fw={500} mb="sm">
              AI Chat Assistant
            </Text>
            
            <Text size="sm" c="dimmed" mb="md">
              Open-ended conversations with AI. Get writing help, brainstorm ideas, 
              or explore topics before starting a workflow.
            </Text>

            <Stack gap="xs">
              <Button
                variant="light"
                justify="flex-start"
                fullWidth
                onClick={() => console.log('Start new conversation')}
              >
                New Conversation
              </Button>
              <Button
                variant="subtle"
                justify="flex-start"
                fullWidth
                onClick={() => console.log('Load recent conversations')}
              >
                Recent Conversations
              </Button>
            </Stack>
          </Stack>
        )}

        <Stack gap="sm" mt="xl">
          <Text size="sm" c="dimmed">
            This demo showcases Bilan SDK integration with AI content creation.
          </Text>
          <AIStatusIndicator />
        </Stack>
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>{children}</MantineAppShell.Main>

      {/* Quick Action Modal */}
      <QuickActionModal
        opened={quickActions.isModalOpen}
        onClose={quickActions.closeAction}
        action={quickActions.selectedAction}
        onSubmit={quickActions.processAction}
        onVote={handleQuickActionVote}
      />
    </MantineAppShell>
  )
}