'use client'

import { AppShell as MantineAppShell, Burger, Group, Text, ActionIcon as _ActionIcon } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure()

  const handleBurgerClick = () => {
    console.warn('Navigation menu clicked')
    toggle()
  }

  const handleLogoClick = () => {
    console.warn('Logo clicked - navigate to home')
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
          <Group style={{ cursor: 'pointer' }} onClick={handleLogoClick}>
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