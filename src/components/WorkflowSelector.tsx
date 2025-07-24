'use client'

import { 
  Card, 
  Group, 
  Text, 
  Button, 
  Stack, 
  Badge,
  ThemeIcon,
  SimpleGrid,
  Container,
  Title
} from '@mantine/core'
import { 
  IconPencil, 
  IconMail, 
  IconBrandTwitter,
  IconClock,
  IconList
} from '@tabler/icons-react'
import type { ContentType } from '../types'

/**
 * Workflow definition interface for content creation journeys
 * 
 * Defines the structure of workflow configurations that guide users through
 * multi-step content creation processes. Each workflow represents a journey
 * in the Bilan tracking model with defined steps and expected outcomes.
 * 
 * @interface WorkflowDefinition
 * @property {ContentType} id - Content type identifier matching the application's type system
 * @property {string} title - User-facing display name for the workflow
 * @property {string} description - Detailed explanation of what the workflow produces
 * @property {React.ComponentType} icon - Icon component for visual identification
 * @property {string} estimatedTime - Expected completion time for user planning
 * @property {number} stepCount - Number of steps in the workflow journey
 * @property {string[]} steps - Array of step names that users will complete
 * @property {string[]} examples - Concrete output examples to set user expectations
 * @property {string} difficulty - Complexity level indicator for user guidance
 */
interface WorkflowDefinition {
  id: ContentType
  title: string
  description: string
  icon: React.ComponentType<{ size?: number }>
  estimatedTime: string
  stepCount: number
  steps: string[]
  examples: string[]
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
}

/**
 * Component props for the workflow selector interface
 * 
 * @interface WorkflowSelectorProps
 * @property {function} onWorkflowSelect - Callback fired when user selects a workflow to start
 */
interface WorkflowSelectorProps {
  onWorkflowSelect: (workflowId: ContentType) => void
}

/**
 * Available content creation workflows
 * 
 * Defines the structured journeys available in the Bilan Content Creation Demo.
 * Each workflow represents a complete journey with multiple steps that guide
 * users through professional content creation processes.
 * 
 * These workflows demonstrate the journey concept in Bilan analytics:
 * - Clear start and end points
 * - Multiple interconnected steps
 * - Progress tracking throughout the process
 * - Outcome measurement and optimization
 */
const workflows: WorkflowDefinition[] = [
  {
    id: 'blog',
    title: 'Blog Creation Journey',
    description: 'Create engaging blog posts through a structured process from topic exploration to final polish. Perfect for thought leadership and storytelling.',
    icon: IconPencil,
    estimatedTime: '15-30 min',
    stepCount: 5,
    steps: [
      'Topic Exploration & Research',
      'Outline Generation & Structure', 
      'Introduction & Hook Creation',
      'Body Section Development',
      'Conclusion & Call-to-Action'
    ],
    examples: [
      'How to Build Better AI Products',
      'The Future of Remote Work',
      'Startup Lessons Learned in 2024'
    ],
    difficulty: 'Intermediate'
  },
  {
    id: 'email',
    title: 'Email Campaign Journey',
    description: 'Craft professional email campaigns that drive results. From subject lines to calls-to-action, create compelling business communication.',
    icon: IconMail,
    estimatedTime: '10-20 min',
    stepCount: 4,
    steps: [
      'Campaign Purpose & Audience',
      'Subject Line Optimization',
      'Email Body & Messaging',
      'Call-to-Action Design'
    ],
    examples: [
      'Product Launch Announcement',
      'Weekly Newsletter Template',
      'Follow-up Sequence for Leads'
    ],
    difficulty: 'Beginner'
  },
  {
    id: 'social',
    title: 'Social Media Journey',
    description: 'Generate engaging social media content that sparks conversation. Create posts optimized for different platforms and audiences.',
    icon: IconBrandTwitter,
    estimatedTime: '5-15 min',
    stepCount: 3,
    steps: [
      'Platform & Audience Selection',
      'Content Ideation & Creation',
      'Hashtag & Engagement Strategy'
    ],
    examples: [
      'Behind-the-Scenes Content',
      'Industry Insight Posts',
      'Product Feature Highlights'
    ],
    difficulty: 'Beginner'
  }
]

/**
 * Workflow card component for individual journey selection
 * 
 * Renders a detailed card for a single content creation workflow, providing
 * users with comprehensive information to make informed decisions about which
 * journey to begin.
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {WorkflowDefinition} props.workflow - Workflow configuration to display
 * @param {function} props.onSelect - Callback fired when user selects this workflow
 */
function WorkflowCard({ 
  workflow, 
  onSelect 
}: { 
  workflow: WorkflowDefinition
  onSelect: (id: ContentType) => void 
}) {
  const IconComponent = workflow.icon

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Group>
            <ThemeIcon size="lg" variant="light">
              <IconComponent size={20} />
            </ThemeIcon>
            <div>
              <Text fw={500} size="lg">
                {workflow.title}
              </Text>
              <Badge size="sm" variant="light">
                {workflow.difficulty}
              </Badge>
            </div>
          </Group>
        </Group>
      </Card.Section>

      <Stack mt="md" gap="md">
        <Text size="sm" c="dimmed">
          {workflow.description}
        </Text>

        <Group gap="lg">
          <Group gap="xs">
            <IconClock size={16} />
            <Text size="sm" c="dimmed">
              {workflow.estimatedTime}
            </Text>
          </Group>
          <Group gap="xs">
            <IconList size={16} />
            <Text size="sm" c="dimmed">
              {workflow.stepCount} steps
            </Text>
          </Group>
        </Group>

        <div>
          <Text size="sm" fw={500} mb="xs">
            Workflow Steps:
          </Text>
          <Stack gap="xs">
            {workflow.steps.map((step, index) => (
              <Text key={index} size="xs" c="dimmed" pl="md">
                {index + 1}. {step}
              </Text>
            ))}
          </Stack>
        </div>

        <div>
          <Text size="sm" fw={500} mb="xs">
            Example Outputs:
          </Text>
          <Stack gap="xs">
            {workflow.examples.map((example, index) => (
              <Text key={index} size="xs" c="dimmed" pl="md">
                • {example}
              </Text>
            ))}
          </Stack>
        </div>

        <Button
          fullWidth
          mt="auto"
          size="md"
          onClick={() => onSelect(workflow.id)}
        >
          Start {workflow.title}
        </Button>
      </Stack>
    </Card>
  )
}

/**
 * Workflow selector interface component
 * 
 * Provides the main interface for users to select and begin content creation journeys.
 * This component serves as the primary entry point for structured workflows in the
 * Bilan Content Creation Demo, demonstrating the journey concept in Bilan analytics.
 * 
 * The interface presents available workflows as detailed cards with comprehensive
 * information about each journey, including steps, estimated time, difficulty level,
 * and example outputs. This helps users make informed decisions about which
 * workflow best fits their content creation needs.
 * 
 * @component
 * @param {WorkflowSelectorProps} props - Component properties
 * @param {function} props.onWorkflowSelect - Callback fired when user selects a workflow
 * 
 * @example
 * ```tsx
 * <WorkflowSelector 
 *   onWorkflowSelect={(workflowId) => startJourney(workflowId)}
 * />
 * ```
 * 
 * @remarks
 * This component integrates with the Bilan demo architecture by:
 * - Serving as the entry point for journey tracking
 * - Providing clear workflow descriptions for user guidance
 * - Supporting analytics by clearly defining user intentions
 * - Offering structured paths that can be measured and optimized
 * 
 * Each workflow selection initiates a new journey in the Bilan tracking system,
 * allowing for comprehensive analytics on user preferences, completion rates,
 * and workflow effectiveness.
 * 
 * @returns {JSX.Element} Grid of workflow cards with selection interface
 */
export function WorkflowSelector({ onWorkflowSelect }: WorkflowSelectorProps) {
  return (
    <Container size="xl" py={{ base: 'md', sm: 'xl' }}>
      <Stack align="center" gap="xl" mb="xl">
        <Title order={1} ta="center" fw={700}>
          Choose Your Content Journey
        </Title>
        
        <Text size="lg" ta="center" c="dimmed" maw={700}>
          Select a structured workflow to guide you through professional content creation. 
          Each journey is designed to help you create high-quality content efficiently.
        </Text>
        
        <Text size="sm" ta="center" c="dimmed">
          These workflows demonstrate <strong>journey tracking</strong> in Bilan analytics,
          with progress monitoring and completion analysis.
        </Text>
      </Stack>

      <SimpleGrid 
        cols={{ base: 1, sm: 2, lg: 3 }} 
        spacing={{ base: 'md', sm: 'lg' }}
      >
        {workflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            onSelect={onWorkflowSelect}
          />
        ))}
      </SimpleGrid>

      <Stack align="center" mt="xl" gap="md">
        <Text size="sm" c="dimmed" ta="center">
          Need something different? Try our <strong>Chat Assistant</strong> for open-ended
          conversations or <strong>Quick Actions</strong> for immediate AI help.
        </Text>
      </Stack>
    </Container>
  )
} 