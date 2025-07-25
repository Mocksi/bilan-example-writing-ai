'use client'

import { Container, Title, Text, Card, Button, Group, Skeleton } from '@mantine/core'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import type { ContentType } from '../../types'
import { BlogWorkflow, WorkflowInterface } from '../../components'

/**
 * Content creation page component that renders the main interface for AI-powered content generation.
 * 
 * This component handles the core logic for the `/create` route, including:
 * - Extracting and validating the content type from URL query parameters
 * - Rendering the appropriate workflow interface based on content type (blog, email, social)
 * - Providing error handling for invalid or missing content type parameters
 * - Managing navigation back to the home page
 * - Integrating with specialized workflows for different content types
 * 
 * **Query Parameter Validation:**
 * - Expects a `type` query parameter with values: 'blog', 'email', or 'social'
 * - Renders an error state with navigation options if the parameter is invalid or missing
 * - Uses TypeScript type safety with the ContentType union type for validation
 * 
 * **Workflow Selection Logic:**
 * - Blog content type: Uses specialized BlogWorkflow component with comprehensive step-by-step process
 * - Email content type: Uses generic WorkflowInterface with email-specific workflow steps
 * - Social content type: Uses generic WorkflowInterface with social media workflow steps
 * 
 * **UI Rendering Logic:**
 * - Success state: Shows appropriate workflow interface for the selected content type
 * - Error state: Displays user-friendly error message with back navigation
 * - Consistent Mantine UI components for styling and responsive design
 * - Navigation buttons use Next.js App Router for client-side routing
 * 
 * **Integration Points:**
 * - Connected to BlogWorkflow for comprehensive blog creation process
 * - Connected to WorkflowInterface for email and social media workflows
 * - Integrated with Bilan analytics through both workflow systems
 * - Handles workflow completion and cancellation callbacks
 * 
 * @returns {JSX.Element} The rendered content creation page with either:
 *   - BlogWorkflow for blog content type
 *   - WorkflowInterface for email and social content types
 *   - Error state with navigation options (if invalid/missing content type)
 * 
 * @example
 * // Accessed via navigation from home page:
 * // /create?type=blog -> Renders specialized blog workflow interface
 * // /create?type=email -> Renders email workflow interface  
 * // /create?type=social -> Renders social media workflow interface
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

  const handleWorkflowComplete = (result: any) => {
    // Navigate to home with success message
    router.push('/?success=workflow-completed')
  }

  const handleWorkflowCancel = () => {
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

  // Render the appropriate workflow based on content type
  if (contentType === 'blog') {
    return (
      <Container size="xl" py="xl">
        <BlogWorkflow 
          contentType={contentType}
          onBack={handleGoBack}
          onComplete={(result) => {
            console.log('Blog workflow completed:', result)
            // Navigate to home with success message
            router.push('/?success=blog-completed')
          }}
        />
      </Container>
    )
  }

  // Use WorkflowInterface for email and social content types
  return (
    <WorkflowInterface
      contentType={contentType}
      onComplete={handleWorkflowComplete}
      onCancel={handleWorkflowCancel}
    />
  )
}

export default function CreatePage() {
  return (
    <Suspense fallback={
      <Container size="xl" py="xl">
        <Card withBorder p="xl">
          <Group justify="space-between" mb="lg">
            <div>
              <Skeleton height={32} width={200} mb="xs" />
              <Skeleton height={16} width={150} />
            </div>
            <Skeleton height={36} width={120} />
          </Group>
          <Card withBorder p="lg" bg="gray.0">
            <Skeleton height={24} width={250} mb="md" />
            <Skeleton height={16} width="100%" mb="xs" />
            <Skeleton height={16} width="80%" />
          </Card>
        </Card>
      </Container>
    }>
      <CreatePageContent />
    </Suspense>
  )
} 