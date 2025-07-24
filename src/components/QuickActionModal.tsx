'use client'

import { 
  Modal, 
  Text, 
  Textarea, 
  Button, 
  Group, 
  Stack, 
  Card, 
  Badge,
  ActionIcon,
  CopyButton,
  Tooltip,
  LoadingOverlay,
  Box
} from '@mantine/core'
import { useState } from 'react'
import { 
  IconCopy, 
  IconCheck,
  IconThumbUp,
  IconThumbDown,
  IconSend
} from '@tabler/icons-react'

export interface QuickAction {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  placeholder?: string
  maxLength?: number
}

interface QuickActionModalProps {
  opened: boolean
  onClose: () => void
  action: QuickAction | null
  onSubmit: (actionId: string, input: string) => Promise<{
    result: string
    turnId: string
  }>
  onVote?: (turnId: string, rating: 1 | -1) => Promise<void>
}

interface ActionResult {
  text: string
  turnId: string
  voted?: boolean
  rating?: 1 | -1
}

/**
 * Quick Action Modal Component
 * 
 * Provides a modal interface for standalone AI actions (quick turns).
 * Handles input collection, result display, and immediate feedback collection
 * following the Bilan standalone turn pattern.
 * 
 * Features:
 * - Text input with action-specific placeholders
 * - Real-time result display with loading states
 * - Immediate feedback collection (thumbs up/down)
 * - Copy functionality for results
 * - Proper Bilan turn tracking integration
 */
export function QuickActionModal({ 
  opened, 
  onClose, 
  action, 
  onSubmit,
  onVote 
}: QuickActionModalProps) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ActionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens/closes or action changes
  const handleClose = () => {
    setInput('')
    setResult(null)
    setError(null)
    setIsLoading(false)
    onClose()
  }

  // Handle action submission
  const handleSubmit = async () => {
    if (!action || !input.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await onSubmit(action.id, input.trim())
      setResult({
        text: response.result,
        turnId: response.turnId,
        voted: false
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process action')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle user feedback
  const handleVote = async (rating: 1 | -1) => {
    if (!result || !onVote) return

    try {
      await onVote(result.turnId, rating)
      setResult(prev => prev ? { 
        ...prev, 
        voted: true, 
        rating 
      } : null)
    } catch (err) {
      console.error('Failed to submit vote:', err)
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handleSubmit()
    }
  }

  if (!action) return null

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          {action.icon}
          <Text size="lg" fw={600}>{action.label}</Text>
        </Group>
      }
      size="lg"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {action.description}
        </Text>

        {/* Input Section */}
        {!result && (
          <Box pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Textarea
              label="Input Text"
              placeholder={action.placeholder || `Enter text for ${action.label.toLowerCase()}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              minRows={4}
              maxRows={8}
              maxLength={action.maxLength || 2000}
              error={error}
              description={`${input.length}/${action.maxLength || 2000} characters`}
            />
            
            <Group justify="flex-end" mt="md">
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                leftSection={<IconSend size={16} />}
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                loading={isLoading}
              >
                {isLoading ? 'Processing...' : 'Generate'}
              </Button>
            </Group>
          </Box>
        )}

        {/* Result Section */}
        {result && (
          <Card withBorder p="md">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <Badge color="green" variant="light">
                  Result
                </Badge>
                <CopyButton value={result.text}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied!' : 'Copy result'}>
                      <ActionIcon 
                        variant="subtle" 
                        onClick={copy}
                        color={copied ? 'green' : 'gray'}
                      >
                        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>

              <Text 
                size="sm" 
                style={{ 
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6
                }}
              >
                {result.text}
              </Text>

              {/* Feedback Section */}
              <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed">
                  Was this result helpful?
                </Text>
                
                <Group gap="xs">
                  <Tooltip label="Good result">
                    <ActionIcon
                      variant={result.voted && result.rating === 1 ? 'filled' : 'subtle'}
                      color={result.voted && result.rating === 1 ? 'green' : 'gray'}
                      onClick={() => !result.voted && handleVote(1)}
                      disabled={result.voted}
                    >
                      <IconThumbUp size={16} />
                    </ActionIcon>
                  </Tooltip>
                  
                  <Tooltip label="Poor result">
                    <ActionIcon
                      variant={result.voted && result.rating === -1 ? 'filled' : 'subtle'}
                      color={result.voted && result.rating === -1 ? 'red' : 'gray'}
                      onClick={() => !result.voted && handleVote(-1)}
                      disabled={result.voted}
                    >
                      <IconThumbDown size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              {result.voted && (
                <Text size="xs" c="dimmed" ta="center">
                  Thank you for your feedback!
                </Text>
              )}

              {/* Action Buttons */}
              <Group justify="flex-end" mt="sm">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setResult(null)
                    setInput('')
                  }}
                >
                  Try Again
                </Button>
                <Button onClick={handleClose}>
                  Done
                </Button>
              </Group>
            </Stack>
          </Card>
        )}
      </Stack>
    </Modal>
  )
} 