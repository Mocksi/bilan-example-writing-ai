'use client'

import { Card, Text, Button, Group, ThemeIcon, Stack } from '@mantine/core'
import type { ContentType } from '../types'

/**
 * Props interface for the ContentTypeCard component
 * 
 * Defines the properties required to render a content type selection card,
 * including display data, user interaction handlers, and accessibility options.
 * Used in the content type selection interface to present users with available
 * AI content generation options.
 * 
 * @interface ContentTypeCardProps
 * @example
 * ```tsx
 * <ContentTypeCard
 *   contentType="blog"
 *   title="Blog Posts"
 *   description="Create engaging blog posts..."
 *   icon="📝"
 *   examples={["AI best practices", "Remote work trends"]}
 *   onSelect={(type) => navigateToCreator(type)}
 *   disabled={!aiReady}
 * />
 * ```
 */
interface ContentTypeCardProps {
  /** 
   * The content type identifier used throughout the application
   * 
   * Typed enum value that determines AI prompt templates, generation parameters,
   * and analytics categorization. Must match one of the defined ContentType values.
   * 
   * @type {ContentType}
   */
  contentType: ContentType
  
  /** 
   * User-facing display title for the content type
   * 
   * Short, descriptive name shown in the card header that clearly identifies
   * the content type to users (e.g., "Blog Posts", "Email Writing").
   * 
   * @type {string}
   */
  title: string
  
  /** 
   * Detailed description explaining the content type's purpose and use cases
   * 
   * Longer explanatory text that helps users understand what this content type
   * is for and when they should choose it. Displayed in the card body.
   * 
   * @type {string}
   */
  description: string
  
  /** 
   * Visual icon representing the content type
   * 
   * Emoji or icon character used for visual identification and quick recognition.
   * Should be relevant to the content type (e.g., "📝" for blog posts).
   * 
   * @type {string}
   */
  icon: string
  
  /** 
   * Array of concrete example use cases for the content type
   * 
   * Specific, realistic examples that inspire users and demonstrate the content
   * type's capabilities. Helps users understand practical applications.
   * 
   * @type {string[]}
   */
  examples: string[]
  
  /** 
   * Callback function triggered when user selects this content type
   * 
   * Handler function called when the user clicks the selection button.
   * Receives the contentType as a parameter for routing or state management.
   * 
   * @type {function}
   * @param {ContentType} contentType - The selected content type identifier
   * @returns {void}
   */
  onSelect: (contentType: ContentType) => void
  
  /** 
   * Optional flag to disable the card interaction
   * 
   * When true, prevents user interaction with the card (e.g., when AI is not ready).
   * Defaults to false. Used for conditional availability based on system state.
   * 
   * @type {boolean}
   * @default false
   * @optional
   */
  disabled?: boolean
}

export function ContentTypeCard({
  contentType,
  title,
  description,
  icon,
  examples,
  onSelect,
  disabled = false
}: ContentTypeCardProps) {
  return (
    <Card 
      shadow="sm" 
      padding="lg" 
      radius="md" 
      withBorder
      h="100%"
    >
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Group>
            <ThemeIcon size="lg" variant="light">
              <Text size="xl">{icon}</Text>
            </ThemeIcon>
            <Text fw={500} size="lg">
              {title}
            </Text>
          </Group>
        </Group>
      </Card.Section>

      <Stack mt="md" gap="md">
        <Text size="sm" c="dimmed">
          {description}
        </Text>

        <div>
          <Text size="sm" fw={500} mb="xs">
            Examples:
          </Text>
          <Stack gap="xs">
            {examples.map((example, index) => (
              <Text key={index} size="xs" c="dimmed" pl="md">
                • {example}
              </Text>
            ))}
          </Stack>
        </div>

        <Button
          fullWidth
          mt="auto"
          onClick={() => onSelect(contentType)}
          disabled={disabled}
        >
          Create {title}
        </Button>
      </Stack>
    </Card>
  )
} 