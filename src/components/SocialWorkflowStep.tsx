'use client'

import {
  Stack,
  Text,
  Card,
  Alert
} from '@mantine/core'
import type { WorkflowStepProps } from './WorkflowInterface'

/**
 * Social workflow step component placeholder
 * 
 * This is a placeholder component that will be fully implemented in the next commit.
 * It handles all four steps of the social media workflow:
 * 1. Goal Setting & Platform Selection
 * 2. Content Ideation
 * 3. Post Creation
 * 4. Hashtag Generation & Engagement Strategy
 */
export function SocialWorkflowStep({
  stepId,
  stepData,
  onStepComplete,
  onStepError,
  isActive,
  isCompleted
}: WorkflowStepProps) {
  return (
    <Stack gap="lg">
      <Card withBorder p="md">
        <Alert color="blue">
          <Text size="sm">
            <strong>Social Media Workflow - Coming in Next Commit</strong>
            <br />
            Step: {stepId}
            <br />
            This will be fully implemented with platform selection, content ideation, 
            post creation, and hashtag generation capabilities.
          </Text>
        </Alert>
      </Card>
    </Stack>
  )
} 