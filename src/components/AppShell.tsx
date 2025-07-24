'use client'

import { AppShell as MantineAppShell, Burger, Group, Text, ActionIcon as _ActionIcon } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'

/**
 * Application shell component providing consistent layout structure
 * with header, collapsible navigation sidebar, and main content area.
 * 
 * @param props - Component props
 * @param props.children - ReactNode content to render in the main area
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure()

  const handleBurgerClick = () => {
    // Toggle mobile navigation menu visibility
    toggle()
  }

  const handleLogoClick = () => {
    // TODO: Implement navigation to home page
    // Should use Next.js router to navigate to root route
  }

  const handleLogoKeyDown = (event: React.KeyboardEvent) => {
    // Handle keyboard activation for accessibility
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleLogoClick()
    }
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
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={handleBurgerClick} hiddenFrom="sm" size="sm" />
          <Group 
            style={{ cursor: 'pointer' }} 
            onClick={handleLogoClick}
            onKeyDown={handleLogoKeyDown}
            role="button"
            tabIndex={0}
            aria-label="Go to homepage"
          >
            <Text size="lg" fw={600}>
              🧠 Bilan Content Demo
            </Text>
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <Text>Navigation items will go here</Text>
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  )
} 