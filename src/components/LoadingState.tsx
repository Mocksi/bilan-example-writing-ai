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