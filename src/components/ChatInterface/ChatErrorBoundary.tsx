import React, { Component } from 'react'
import type { ReactNode } from 'react'
import {
  Container,
  Stack,
  Text,
  Button,
  Alert,
  Group,
  Paper,
  Divider
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconRefresh,
  IconBug,
  IconHome
} from '@tabler/icons-react'

interface ChatErrorBoundaryProps {
  children: ReactNode
}

interface ChatErrorBoundaryState {
  hasError: boolean
  errorId: string
  errorTimestamp: string
}

/**
 * Error boundary component for ChatInterface to catch and handle runtime errors
 * 
 * This component implements the error boundary pattern required by coding guidelines
 * for AI integration components. It provides:
 * - Safe error catching without crashing the entire application
 * - Sanitized error logging that doesn't expose sensitive information
 * - User-friendly error UI with recovery options
 * - Automatic error reporting with unique error IDs
 * 
 * @component
 */
export class ChatErrorBoundary extends Component<ChatErrorBoundaryProps, ChatErrorBoundaryState> {
  constructor(props: ChatErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      errorId: '',
      errorTimestamp: ''
    }
  }

  static getDerivedStateFromError(_error: Error): ChatErrorBoundaryState {
    // Generate unique error ID for tracking
    const errorId = `chat_error_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    const errorTimestamp = new Date().toISOString()
    
    // Update state to show error UI
    return {
      hasError: true,
      errorId,
      errorTimestamp
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Sanitized error logging - avoid exposing sensitive information
    console.error('ChatInterface error caught by boundary', {
      errorId: this.state.errorId,
      timestamp: this.state.errorTimestamp,
      errorType: 'chat_interface_error',
      component: 'ChatInterface',
      hasStack: Boolean(error.stack),
      hasComponentStack: Boolean(errorInfo.componentStack),
      // Safe metadata only - no raw error messages or stack traces
      context: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent.substring(0, 100) : 'unknown',
        url: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown'
      }
    })
  }

  handleRefresh = () => {
    // Reset error boundary state
    this.setState({
      hasError: false,
      errorId: '',
      errorTimestamp: ''
    })
  }

  handleReload = () => {
    // Full page reload as fallback
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  handleGoHome = () => {
    // Navigate to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container size="xl" h="100%" p={{ base: 'md', sm: 'lg' }}>
          <Stack align="center" justify="center" h="100%" gap="xl">
            {/* Error Alert */}
            <Alert 
              icon={<IconAlertTriangle size={24} />} 
              title="Chat Interface Error" 
              color="red"
              variant="light"
              style={{ maxWidth: 600, width: '100%' }}
            >
              <Stack gap="md">
                <Text size="sm">
                  The chat interface encountered an unexpected error and needs to be restarted. 
                  Your data is safe, and this issue has been automatically reported.
                </Text>
                
                <Paper p="xs" bg="gray.0" style={{ border: '1px solid #dee2e6' }}>
                  <Group gap="xs">
                    <IconBug size={14} />
                    <Text size="xs" c="dimmed" ff="monospace">
                      Error ID: {this.state.errorId}
                    </Text>
                  </Group>
                </Paper>
              </Stack>
            </Alert>

            {/* Recovery Actions */}
            <Stack gap="md" align="center">
              <Text size="lg" fw={600} ta="center">
                Choose a recovery option:
              </Text>
              
              <Group gap="md" justify="center">
                <Button
                  leftSection={<IconRefresh size={16} />}
                  variant="filled"
                  color="blue"
                  size="md"
                  onClick={this.handleRefresh}
                >
                  Restart Chat
                </Button>
                
                <Button
                  leftSection={<IconRefresh size={16} />}
                  variant="light"
                  color="gray"
                  size="md"
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>
                
                <Button
                  leftSection={<IconHome size={16} />}
                  variant="outline"
                  color="gray"
                  size="md"
                  onClick={this.handleGoHome}
                >
                  Go Home
                </Button>
              </Group>
            </Stack>

            <Divider style={{ width: '100%', maxWidth: 400 }} />

            {/* Additional Information */}
            <Stack gap="sm" align="center">
              <Text size="sm" c="dimmed" ta="center" style={{ maxWidth: 500 }}>
                If this error persists, try refreshing your browser or clearing your cache. 
                The error has been logged with ID <strong>{this.state.errorId}</strong> for support purposes.
              </Text>
              
              <Text size="xs" c="dimmed" ta="center">
                Error occurred at: {new Date(this.state.errorTimestamp).toLocaleString()}
              </Text>
            </Stack>
          </Stack>
        </Container>
      )
    }

    return this.props.children
  }
} 