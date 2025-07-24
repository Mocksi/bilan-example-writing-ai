'use client'

import { 
  AppShell as MantineAppShell, 
  Burger, 
  Group, 
  Text, 
  Button, 
  Stack,
  Tabs,
  Menu,
  ActionIcon,
  Box
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { 
  IconChevronDown,
  IconSparkles,
  IconPencil,
  IconLanguage,
  IconBulb,
  IconFileText
} from '@tabler/icons-react'
import { ReactNode, useState } from 'react'
import { AIStatusIndicator } from './AIStatusIndicator'

interface AppShellProps {
  children: ReactNode
}

/**
 * Quick action definitions for standalone AI interactions
 * 
 * Defines the available quick actions that users can perform as standalone turns
 * (not part of conversations or journeys). Each action represents a single AI
 * interaction with immediate results.
 * 
 * @interface QuickAction
 * @property {string} id - Unique identifier for the action
 * @property {string} label - User-facing display name
 * @property {string} description - Brief explanation of what the action does
 * @property {ReactNode} icon - Icon component for visual identification
 */
interface QuickAction {
  id: string
  label: string
  description: string
  icon: ReactNode
}

/**
 * Available quick actions for standalone AI turns
 * 
 * These actions demonstrate standalone turns in the Bilan tracking model -
 * single AI interactions that don't require conversation context or journey state.
 * Each action can be triggered independently and tracked as individual turns.
 */
const quickActions: QuickAction[] = [
  {
    id: 'summarize',
    label: 'Summarize Text',
    description: 'Create concise summaries of long content',
    icon: <IconFileText size={16} />
  },
  {
    id: 'grammar',
    label: 'Fix Grammar',
    description: 'Correct grammar and improve clarity',
    icon: <IconPencil size={16} />
  },
  {
    id: 'translate',
    label: 'Translate',
    description: 'Translate text to different languages',
    icon: <IconLanguage size={16} />
  },
  {
    id: 'brainstorm',
    label: 'Generate Ideas',
    description: 'Brainstorm creative ideas and concepts',
    icon: <IconBulb size={16} />
  }
]

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
   * Handle quick action selection
   * 
   * Triggers a standalone AI turn for the selected quick action.
   * These are tracked as individual turns without conversation or journey context.
   * 
   * @param {string} actionId - Unique identifier of the selected quick action
   */
  const handleQuickAction = (actionId: string) => {
    // TODO: Implement quick action handlers for standalone turns
    console.log('Quick action selected:', actionId)
  }

  /**
   * Quick actions dropdown menu component
   * 
   * Provides access to standalone AI actions that can be performed independently
   * of workflows or conversations. Each action represents a single turn in the
   * Bilan tracking model.
   */
  const QuickActionsDropdown = () => (
    <Menu shadow="md" width={250}>
      <Menu.Target>
        <Button
          variant="light"
          rightSection={<IconChevronDown size={14} />}
          leftSection={<IconSparkles size={16} />}
          size="sm"
        >
          Quick Actions
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>AI Tools</Menu.Label>
        {quickActions.map((action) => (
          <Menu.Item
            key={action.id}
            leftSection={action.icon}
            onClick={() => handleQuickAction(action.id)}
          >
            <Box>
              <Text size="sm" fw={500}>{action.label}</Text>
              <Text size="xs" c="dimmed">{action.description}</Text>
            </Box>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )

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
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Text
              size="lg"
              fw={600}
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
            >
              Bilan Content Creator
            </Text>
          </Group>
          
          <Group gap="sm">
            <QuickActionsDropdown />
            <Button
              variant="light"
              size="sm"
              onClick={handleAnalyticsClick}
            >
              View Analytics
            </Button>
          </Group>
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
                leftSection="📝"
                fullWidth
                onClick={() => console.log('Navigate to blog workflow')}
              >
                Blog Creation
              </Button>
              <Button
                variant="light"
                justify="flex-start"
                leftSection="📧"
                fullWidth
                onClick={() => console.log('Navigate to email workflow')}
              >
                Email Campaign
              </Button>
              <Button
                variant="light"
                justify="flex-start"
                leftSection="📱"
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
                fullWidth
                onClick={() => console.log('Start new conversation')}
              >
                New Conversation
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => console.log('View conversation history')}
              >
                Recent Chats
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

      <MantineAppShell.Main>
        {children}
      </MantineAppShell.Main>
    </MantineAppShell>
  )
} 