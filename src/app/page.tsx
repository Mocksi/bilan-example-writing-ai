'use client'

import { Container, Title, Text, SimpleGrid, Stack } from '@mantine/core'
import { ContentTypeCard } from '../components/ContentTypeCard'
import type { ContentType } from '../types'

const contentTypes = [
  {
    contentType: 'blog' as ContentType,
    title: 'Blog Posts',
    description: 'Create engaging blog posts and articles with AI assistance. Perfect for thought leadership, tutorials, and storytelling.',
    icon: '📝',
    examples: [
      'AI development best practices for startups',
      'The future of remote work trends',
      'How to build better coding habits'
    ]
  },
  {
    contentType: 'email' as ContentType,
    title: 'Email Writing',
    description: 'Craft professional emails that get results. From follow-ups to announcements, create clear and effective communication.',
    icon: '📧',
    examples: [
      'Follow-up after networking event',
      'Project update to stakeholders',
      'Customer onboarding sequence'
    ]
  },
  {
    contentType: 'social' as ContentType,
    title: 'Social Media',
    description: 'Generate engaging social media content that drives interaction. Create posts that capture attention and spark conversation.',
    icon: '📱',
    examples: [
      'Product launch announcement',
      'Behind-the-scenes company culture',
      'Industry insights and tips'
    ]
  }
]

export default function HomePage() {
  const handleContentTypeSelect = (contentType: ContentType) => {
    // TODO: Navigate to content creator page
    console.log('Selected content type:', contentType)
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
