'use client'

import { Container, Title, Text, SimpleGrid, Stack } from '@mantine/core'
import { ContentTypeCard } from '../components/ContentTypeCard'
import type { ContentType } from '../types'
import { useNavigation } from '../hooks'

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

export default function HomePage() {
  const { navigateToCreator } = useNavigation()

  const handleContentTypeSelect = (contentType: ContentType) => {
    navigateToCreator(contentType)
  }

  return (
    <Container size="xl" py="xl">
      <Stack align="center" gap="xl" mb="xl">
        <Title order={1} ta="center" fw={700}>
          AI-Powered Content Creation
        </Title>
        
        <Text size="lg" ta="center" c="dimmed" maw={600}>
          Choose the type of content you want to create. Our AI assistant will help you 
          craft compelling content tailored to your needs.
        </Text>
        
        <Text size="sm" ta="center" c="dimmed">
          This demo showcases <strong>Bilan SDK integration</strong> with AI content creation workflows.
          All user interactions are tracked for analytics insights.
        </Text>
      </Stack>

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
