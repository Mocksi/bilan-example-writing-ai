'use client'

import { Container, Title, Text, Card, Button, Group } from '@mantine/core'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import type { ContentType } from '../../types'

/**
 * Content creation page component that renders the main interface for AI-powered content generation.
 * 
 * This component handles the core logic for the `/create` route, including:
 * - Extracting and validating the content type from URL query parameters
 * - Rendering appropriate UI based on the selected content type (blog, email, social)
 * - Providing error handling for invalid or missing content type parameters
 * - Managing navigation back to the home page
 * - Displaying a placeholder interface for the upcoming content creator functionality
 * 
 * **Query Parameter Validation:**
 * - Expects a `type` query parameter with values: 'blog', 'email', or 'social'
 * - Renders an error state with navigation options if the parameter is invalid or missing
 * - Uses TypeScript type safety with the ContentType union type for validation
 * 
 * **UI Rendering Logic:**
 * - Success state: Shows content type-specific header with "coming soon" placeholder
 * - Error state: Displays user-friendly error message with back navigation
 * - Consistent Mantine UI components for styling and responsive design
 * - Navigation buttons use Next.js App Router for client-side routing
 * 
 * **Integration Points:**
 * - Designed to be replaced with full content creator interface in future iterations
 * - Placeholder shows selected content type for development/testing purposes
 * - Navigation system validates the App Router integration is working correctly
 * 
 * @returns {JSX.Element} The rendered content creation page with either:
 *   - Main content creation interface (if valid content type)
 *   - Error state with navigation options (if invalid/missing content type)
 * 
 * @example
 * // Accessed via navigation from home page:
 * // /create?type=blog -> Renders blog post creation interface
 * // /create?type=email -> Renders email creation interface  
 * // /create?type=social -> Renders social media post creation interface
 * // /create -> Renders error state (missing type parameter)
 * // /create?type=invalid -> Renders error state (invalid type parameter)
 */
function CreatePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const contentType = searchParams.get('type') as ContentType | null

  const handleGoBack = () => {
    router.push('/')
  }

  if (!contentType || !['blog', 'email', 'social'].includes(contentType)) {
    return (
      <Container size="sm" py="xl">
        <Card withBorder p="xl" ta="center">
          <Title order={2} mb="md">Invalid Content Type</Title>
          <Text c="dimmed" mb="lg">
            Please select a valid content type from the home page.
          </Text>
          <Button onClick={handleGoBack}>
            Go Back to Home
          </Button>
        </Card>
      </Container>
    )
  }

  const contentTypeLabels: Record<ContentType, string> = {
    blog: 'Blog Post',
    email: 'Email',
    social: 'Social Media Post'
  }

  return (
    <Container size="xl" py="xl">
      <Card withBorder p="xl">
        <Group justify="space-between" mb="lg">
          <div>
            <Title order={1}>Create {contentTypeLabels[contentType]}</Title>
            <Text c="dimmed">AI-powered content generation</Text>
          </div>
          <Button variant="outline" onClick={handleGoBack}>
            Back to Home
          </Button>
        </Group>

        <Card withBorder p="lg" bg="gray.0">
          <Text size="lg" fw={500} mb="md">
            🚧 Content Creator Coming Soon
          </Text>
          <Text c="dimmed">
            This will be the content creator interface for {contentTypeLabels[contentType].toLowerCase()} generation.
            The navigation system is now working with Next.js App Router!
          </Text>
          <Text size="sm" c="dimmed" mt="md">
            Selected content type: <strong>{contentType}</strong>
          </Text>
        </Card>
      </Card>
    </Container>
  )
}

export default function CreatePage() {
  return (
    <Suspense fallback={
      <Container size="sm" py="xl">
        <Card withBorder p="xl" ta="center">
          <Text>Loading...</Text>
        </Card>
      </Container>
    }>
      <CreatePageContent />
    </Suspense>
  )
} 