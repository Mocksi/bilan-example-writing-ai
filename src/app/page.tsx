'use client'

import { Container, Title, Text, SimpleGrid, Stack, Button, Menu, Group, Divider } from '@mantine/core'
import { ContentTypeCard } from '../components/ContentTypeCard'
import type { ContentType, QuickActionType, QuickActionConfig } from '../types'
import { useNavigation } from '../hooks'

/**
 * Quick Action Tools Configuration - defines available standalone AI tools
 * 
 * This configuration array defines the quick action tools available in the home page
 * dropdown menu. Each tool represents a standalone turn in Bilan tracking, demonstrating
 * single-purpose AI interactions that don't require conversation context or multi-step
 * workflows. These tools provide immediate value and showcase turn-based analytics.
 * 
 * @remarks
 * Quick actions demonstrate Bilan's "turn" concept by:
 * - Tracking individual AI requests/responses without conversation context
 * - Collecting immediate user feedback through voting mechanisms
 * - Providing analytics on tool usage patterns and user preferences
 * - Serving as lightweight entry points to the AI assistant capabilities
 * 
 * Each action configuration includes user-facing metadata that drives the dropdown
 * interface, helping users understand tool capabilities and expected input formats.
 * 
 * @example
 * ```typescript
 * // Each quick action object structure:
 * {
 *   type: 'summarize',                    // Internal identifier for tracking
 *   title: 'Summarize Text',             // User-facing display name
 *   description: 'Create concise...',    // Tool purpose explanation
 *   icon: '📝',                          // Visual identifier
 *   inputExample: 'Paste long text...',  // User guidance
 *   outputDescription: 'Concise summary' // Expected result
 * }
 * ```
 */
const quickActionTools: QuickActionConfig[] = [
  {
    type: 'summarize' as QuickActionType,
    title: 'Summarize Text',
    description: 'Create concise summaries of long content',
    icon: '📝',
    inputExample: 'Paste long text, articles, or documents',
    outputDescription: 'Concise summary highlighting key points'
  },
  {
    type: 'grammar' as QuickActionType,
    title: 'Fix Grammar',
    description: 'Improve grammar, punctuation, and clarity',
    icon: '✏️',
    inputExample: 'Text with grammar or punctuation issues',
    outputDescription: 'Corrected text with explanations'
  },
  {
    type: 'tone' as QuickActionType,
    title: 'Adjust Tone',
    description: 'Change writing tone (formal, casual, friendly)',
    icon: '🎭',
    inputExample: 'Text to modify with desired tone',
    outputDescription: 'Rewritten text in requested tone'
  },
  {
    type: 'titles' as QuickActionType,
    title: 'Generate Titles',
    description: 'Create compelling titles and headlines',
    icon: '💡',
    inputExample: 'Topic or content description',
    outputDescription: 'Multiple title options to choose from'
  },
  {
    type: 'translate' as QuickActionType,
    title: 'Translate Content',
    description: 'Translate text to different languages',
    icon: '🌍',
    inputExample: 'Text with target language',
    outputDescription: 'Accurate translation with context'
  }
]

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
const contentTypes = [
  {
    /** @property {ContentType} contentType - Typed enum value used throughout the application for content processing */
    contentType: 'blog' as ContentType,
    /** @property {string} title - User-facing display name shown in selection cards and navigation */
    title: 'Blog Posts',
    /** @property {string} description - Explanatory text helping users understand this content type's purpose */
    description: 'Create engaging blog posts and articles with AI assistance. Perfect for thought leadership, tutorials, and storytelling.',
    /** @property {string} icon - Emoji icon providing visual identification in the UI */
    icon: '📝',
    /** @property {string[]} examples - Concrete use cases that inspire users and demonstrate content type capabilities */
    examples: [
      'AI development best practices for startups',
      'The future of remote work trends',
      'How to build better coding habits'
    ]
  },
  {
    /** @property {ContentType} contentType - Professional email content type for business communication */
    contentType: 'email' as ContentType,
    /** @property {string} title - Display name emphasizing professional email writing capabilities */
    title: 'Email Writing',
    /** @property {string} description - Focuses on results-oriented business communication use cases */
    description: 'Craft professional emails that get results. From follow-ups to announcements, create clear and effective communication.',
    /** @property {string} icon - Email emoji representing digital correspondence */
    icon: '📧',
    /** @property {string[]} examples - Business-focused email scenarios for various professional contexts */
    examples: [
      'Follow-up after networking event',
      'Project update to stakeholders',
      'Customer onboarding sequence'
    ]
  },
  {
    /** @property {ContentType} contentType - Social media content type optimized for engagement and virality */
    contentType: 'social' as ContentType,
    /** @property {string} title - Display name highlighting social media content creation */
    title: 'Social Media',
    /** @property {string} description - Emphasizes engagement-driven content for social platforms */
    description: 'Generate engaging social media content that drives interaction. Create posts that capture attention and spark conversation.',
    /** @property {string} icon - Mobile phone emoji representing social media platforms */
    icon: '📱',
    /** @property {string[]} examples - Social media post types across different content categories */
    examples: [
      'Product launch announcement',
      'Behind-the-scenes company culture',
      'Industry insights and tips'
    ]
  }
]

/**
 * Enhanced Home Page component demonstrating all three Bilan concepts
 * 
 * This component serves as the main entry point for the Bilan Content Creation Demo,
 * providing users with three distinct paths that demonstrate different Bilan tracking
 * concepts: journeys (workflows), conversations (chat), and standalone turns (quick tools).
 * 
 * The home page implements the dual-mode interface design from the technical specification,
 * transforming from a single-purpose workflow selector into a comprehensive AI assistant
 * entry point that showcases the full range of Bilan SDK capabilities.
 * 
 * @component
 * @returns {JSX.Element} Enhanced home page with workflow cards, chat access, and quick tools
 * 
 * @example
 * ```tsx
 * // Entry points demonstrate three Bilan concepts:
 * // 1. Content type cards → Journeys (multi-step workflows)
 * // 2. Open Chat button → Conversations (dialogue sessions)  
 * // 3. Quick Tools dropdown → Standalone turns (single AI interactions)
 * ```
 * 
 * @remarks
 * Key enhancements over the original home page:
 * - **Chat Integration**: Direct access to conversational AI interface
 * - **Quick Tools**: Dropdown menu for standalone AI tools and actions
 * - **Clear Visual Hierarchy**: Three distinct sections for different interaction types
 * - **Bilan Concept Mapping**: Each UI element maps to specific Bilan tracking concepts
 * - **Seamless Navigation**: Smooth transitions between different AI interaction modes
 */
export default function HomePage() {
  const { navigateToCreator, navigateToChat } = useNavigation()

  /**
   * Handle content type selection for workflow journeys
   * 
   * Navigates users to the content creation workflow interface for the selected
   * content type. This demonstrates Bilan's "journey" concept through structured,
   * multi-step content creation processes.
   */
  const handleContentTypeSelect = (contentType: ContentType) => {
    navigateToCreator(contentType)
  }

  /**
   * Handle chat interface navigation
   * 
   * Opens the conversational AI interface for free-form dialogue with the AI assistant.
   * This demonstrates Bilan's "conversation" concept through natural back-and-forth
   * interactions that are tracked as conversation sessions.
   */
  const handleOpenChat = () => {
    navigateToChat()
  }

  /**
   * Handle quick action tool selection
   * 
   * Navigates to quick action interface for the selected tool. This demonstrates
   * Bilan's "turn" concept through standalone AI interactions that don't require
   * conversation context or multi-step workflows.
   * 
   * @param {QuickActionType} actionType - The selected quick action tool
   * @todo Implement navigation to quick action interface in future PR
   */
  const handleQuickAction = (actionType: QuickActionType) => {
    // TODO: Navigate to quick action interface with selected tool
    // This will be implemented in a future PR for the quick actions interface
    // For now, the menu item selection is handled but no navigation occurs
    void actionType // Acknowledge parameter to prevent unused variable warning
  }

  return (
    <Container size="xl" py="xl">
      <Stack align="center" gap="xl" mb="xl">
        <Title order={1} ta="center" fw={700}>
          AI-Powered Content Creation
        </Title>
        
        <Text size="lg" ta="center" c="dimmed" maw={600}>
          Choose how you want to interact with our AI assistant. Create structured content,
          have open conversations, or use quick tools for immediate assistance.
        </Text>
        
        <Text size="sm" ta="center" c="dimmed">
          This demo showcases <strong>Bilan SDK integration</strong> with comprehensive
          AI interaction tracking across all three core concepts.
        </Text>

        {/* Enhanced Entry Options - Three Clear Paths */}
        <Group justify="center" gap="md" mt="md">
          <Button
            size="lg"
            leftSection="💬"
            variant="gradient"
            gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
            onClick={handleOpenChat}
          >
            Open Chat Assistant
          </Button>

          <Menu shadow="md" width={300} position="bottom">
            <Menu.Target>
              <Button
                size="lg"
                leftSection="🛠️"
                rightSection="▾"
                variant="light"
                color="gray"
              >
                Quick Tools
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Standalone AI Tools</Menu.Label>
              {quickActionTools.map((tool) => (
                <Menu.Item
                  key={tool.type}
                  leftSection={<Text size="sm">{tool.icon}</Text>}
                  onClick={() => handleQuickAction(tool.type)}
                >
                  <div>
                    <Text size="sm" fw={500}>{tool.title}</Text>
                    <Text size="xs" c="dimmed">{tool.description}</Text>
                  </div>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Stack>

      <Divider my="xl" label="Content Creation Workflows" labelPosition="center" />

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        {contentTypes.map((type) => (
          <ContentTypeCard
            key={type.contentType}
            contentType={type.contentType}
            title={type.title}
            description={type.description}
            icon={type.icon}
            examples={type.examples}
            onSelect={handleContentTypeSelect}
          />
        ))}
      </SimpleGrid>
    </Container>
  )
}
