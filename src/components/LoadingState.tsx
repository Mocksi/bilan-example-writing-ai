'use client'

import { Skeleton, Stack, Group, Text, Progress, Card, Loader, Center } from '@mantine/core'

interface LoadingSkeletonProps {
  lines?: number
  height?: number
}

export function LoadingSkeleton({ lines = 3, height = 20 }: LoadingSkeletonProps) {
  return (
    <Stack gap="sm">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton 
          key={index} 
          height={height}
          width={index === lines - 1 ? '70%' : '100%'}
        />
      ))}
    </Stack>
  )
}

interface ContentGenerationLoadingProps {
  progress?: number
  status?: string
  estimatedTime?: string
}

/**
 * Content generation loading indicator component for AI processing workflows
 * 
 * Displays a comprehensive loading state during AI content generation, providing
 * users with visual feedback about the processing status, progress, and estimated
 * completion time. This component is specifically designed for AI-powered content
 * creation scenarios where generation times can vary based on model initialization,
 * content complexity, and system resources.
 * 
 * @component
 * @param {ContentGenerationLoadingProps} props - Component properties
 * @param {number} [props.progress] - Optional progress percentage (0-100) for progress bar display
 * @param {string} [props.status='Generating content...'] - Current status message shown to user
 * @param {string} [props.estimatedTime] - Optional estimated completion time display
 * 
 * @example
 * ```tsx
 * // Basic loading state
 * <ContentGenerationLoading />
 * 
 * // With progress and estimated time
 * <ContentGenerationLoading
 *   progress={45}
 *   status="Processing your blog post..."
 *   estimatedTime="30 seconds"
 * />
 * 
 * // Dynamic status updates during AI generation
 * <ContentGenerationLoading
 *   status={isInitializing ? "Initializing AI model..." : "Generating content..."}
 *   progress={modelLoadProgress}
 * />
 * ```
 * 
 * @remarks
 * This component is essential for the Bilan demo user experience because:
 * - **Transparency**: Shows users that AI processing is actively occurring
 * - **Expectations**: Provides time estimates to manage user patience
 * - **Model Loading**: Explains potential delays during first-time model initialization
 * - **Progress Updates**: Visual progress bar reduces perceived wait time
 * - **Professional Feel**: Creates a polished loading experience
 * 
 * The component integrates with AI content generation workflows by:
 * - Displaying during WebLLM model initialization
 * - Showing progress during content generation API calls
 * - Providing contextual messaging for different AI processing stages
 * - Supporting Bilan analytics by clearly defining user wait periods
 * 
 * @returns {JSX.Element} Card component with loader, status text, optional progress bar, and guidance text
 */
export function ContentGenerationLoading({ 
  progress, 
  status = 'Generating content...', 
  estimatedTime 
}: ContentGenerationLoadingProps) {
  return (
    <Card withBorder p="xl">
      <Stack align="center" gap="md">
        <Loader size="lg" />
        
        <Text fw={500} ta="center">
          {status}
        </Text>
        
        {progress !== undefined && (
          <Progress 
            value={progress} 
            size="sm" 
            radius="xl" 
            w="100%" 
            animated 
          />
        )}
        
        {estimatedTime && (
          <Text size="sm" c="dimmed" ta="center">
            Estimated time: {estimatedTime}
          </Text>
        )}
        
        <Text size="xs" c="dimmed" ta="center" maw={300}>
          AI model is processing your request. This may take a few moments on first use 
          as the model downloads and initializes.
        </Text>
      </Stack>
    </Card>
  )
}

interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <Center h="50vh">
      <Stack align="center" gap="md">
        <Loader size="xl" />
        <Text fw={500}>{message}</Text>
      </Stack>
    </Center>
  )
}

interface ContentCardSkeletonProps {
  showActions?: boolean
}

export function ContentCardSkeleton({ showActions = true }: ContentCardSkeletonProps) {
  return (
    <Card withBorder p="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Skeleton height={24} width={120} />
          <Skeleton height={20} width={80} />
        </Group>
        
        <LoadingSkeleton lines={4} height={16} />
        
        {showActions && (
          <Group mt="md">
            <Skeleton height={36} width={100} />
            <Skeleton height={36} width={100} />
            <Skeleton height={36} width={120} />
          </Group>
        )}
      </Stack>
    </Card>
  )
} 