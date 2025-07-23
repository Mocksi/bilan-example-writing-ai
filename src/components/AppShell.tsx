'use client'

import { AppShell as MantineAppShell, Burger, Group, Text, Button, ActionIcon, Stack } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { ReactNode } from 'react'
import { AIStatusIndicator } from './AIStatusIndicator'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [opened, { toggle }] = useDisclosure()

  const handleAnalyticsClick = () => {
    // TODO: Integrate with actual Bilan dashboard URL
    console.log('Opening Bilan analytics dashboard')
  }

  const handleContentTypeClick = (contentType: string) => {
    // TODO: Navigate to content creator with selected type
    console.log('Selected content type:', contentType)
  }

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Text
              size="lg"
              fw={600}
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
            >
              Bilan Content Creator
            </Text>
          </Group>
          
          <Button
            variant="light"
            size="sm"
            onClick={handleAnalyticsClick}
          >
            View Analytics Dashboard
          </Button>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <Text fw={500} mb="md">
          Content Types
        </Text>
        
        <Stack gap="xs">
          <Button
            variant="light"
            justify="flex-start"
            leftSection="📝"
            fullWidth
            onClick={() => handleContentTypeClick('blog')}
          >
            Blog Posts
          </Button>
          <Button
            variant="light"
            justify="flex-start"
            leftSection="📧"
            fullWidth
            onClick={() => handleContentTypeClick('email')}
          >
            Email Writing
          </Button>
          <Button
            variant="light"
            justify="flex-start"
            leftSection="📱"
            fullWidth
            onClick={() => handleContentTypeClick('social')}
          >
            Social Media
          </Button>
        </Stack>

        <Stack gap="sm" mt="xl">
          <Text size="sm" c="dimmed">
            This demo showcases Bilan SDK integration with AI content creation.
          </Text>
          <AIStatusIndicator />
        </Stack>
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        {children}
      </MantineAppShell.Main>
    </MantineAppShell>
  )
} 