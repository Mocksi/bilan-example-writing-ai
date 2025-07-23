'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Container, Text, Button, Alert, Stack, Group } from '@mantine/core'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })
    
    // Log error for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Container size="sm" py="xl">
          <Alert 
            variant="light" 
            color="red" 
            title="Something went wrong"
            mb="md"
          >
            <Stack gap="md">
              <Text size="sm">
                An unexpected error occurred while processing your request. 
                This might be due to AI model loading issues or a temporary glitch.
              </Text>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Text size="xs" c="dimmed" ff="monospace">
                  {this.state.error.message}
                </Text>
              )}
              
              <Group>
                <Button onClick={this.handleReset} variant="light">
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline">
                  Reload Page
                </Button>
              </Group>
            </Stack>
          </Alert>
        </Container>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
} 