'use client'

import { Card, Text, Button, Group, ThemeIcon, Stack } from '@mantine/core'
import type { ContentType } from '../types'

interface ContentTypeCardProps {
  contentType: ContentType
  title: string
  description: string
  icon: string
  examples: string[]
  onSelect: (contentType: ContentType) => void
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