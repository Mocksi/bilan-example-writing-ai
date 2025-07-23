'use client'

import { Container, Title, Text, Card, Button, Group } from '@mantine/core'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import type { ContentType } from '../../types'

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