'use client'

import { useState, useEffect } from 'react'
import { 
  Card, 
  Stepper, 
  Button, 
  Group, 
  Text, 
  Title, 
  Stack,
  Progress,
  Alert
} from '@mantine/core'
// Using text alternatives for icons to avoid dependency issues
// import { IconInfoCircle, IconArrowLeft } from '@tabler/icons-react'
import type { ContentType, SessionId } from '../types'
import { startJourney, trackJourneyStep, endJourney } from '../lib/bilan'
import { TopicExplorationStep } from './BlogWorkflow/TopicExplorationStep'
// Remaining step components will be created in subsequent commits
// import { OutlineGenerationStep } from './BlogWorkflow/OutlineGenerationStep'
// import { SectionWritingStep } from './BlogWorkflow/SectionWritingStep'
// import { ReviewPolishStep } from './BlogWorkflow/ReviewPolishStep'

/**
 * Blog workflow step definitions following the implementation plan
 */
export type BlogWorkflowStep = 'topic-exploration' | 'outline-generation' | 'section-writing' | 'review-polish'

export interface BlogWorkflowState {
  currentStep: BlogWorkflowStep | 'completed'
  completedSteps: BlogWorkflowStep[]
  journeyId: string
  sessionId?: SessionId
  topicData?: {
    topic: string
    audience: string
    keyPoints: string[]
    tone: string
  }
  outlineData?: {
    outline: string
    sections: Array<{ title: string; description: string }>
  }
  sectionsData?: {
    sections: Array<{ title: string; content: string; status: 'draft' | 'complete' }>
  }
  finalContent?: {
    title: string
    content: string
    wordCount: number
  }
}

export interface BlogWorkflowProps {
  contentType: ContentType
  onBack: () => void
  onComplete?: (result: BlogWorkflowState) => void
}

const BLOG_STEPS: Array<{ 
  value: BlogWorkflowStep
  label: string 
  description: string 
}> = [
  {
    value: 'topic-exploration',
    label: 'Topic Exploration',
    description: 'Discover and refine your blog topic through conversation'
  },
  {
    value: 'outline-generation', 
    label: 'Outline Generation',
    description: 'Create a structured outline for your blog post'
  },
  {
    value: 'section-writing',
    label: 'Section Writing', 
    description: 'Write each section with AI assistance'
  },
  {
    value: 'review-polish',
    label: 'Review & Polish',
    description: 'Final review, editing, and export options'
  }
]

export function BlogWorkflow({ contentType, onBack, onComplete }: BlogWorkflowProps) {
  const [workflowState, setWorkflowState] = useState<BlogWorkflowState>({
    currentStep: 'topic-exploration',
    completedSteps: [],
    journeyId: ''
  })
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize the journey when component mounts
  useEffect(() => {
    const initializeJourney = async () => {
      try {
        const journeyId = await startJourney('blog-creation', {
          contentType,
          topic: 'Blog creation workflow',
          userBrief: 'Starting blog creation journey'
        })

        if (journeyId) {
          setWorkflowState(prev => ({
            ...prev,
            journeyId
          }))
          
          // Track the first step as started
          await trackJourneyStep(journeyId, 'topic-exploration', {
            completionStatus: 'started'
          })
        } else {
          setError('Failed to initialize blog creation journey')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize workflow')
      } finally {
        setIsInitializing(false)
      }
    }

    initializeJourney()
  }, [contentType])

  const handleStepComplete = async (step: BlogWorkflowStep, data: unknown) => {
    try {
      // Mark current step as completed
      const newCompletedSteps = [...workflowState.completedSteps, step]
      
      // Track step completion
      if (workflowState.journeyId) {
        await trackJourneyStep(workflowState.journeyId, step, {
          completionStatus: 'completed',
          stepData: data
        })
      }

      // Update state with step data
      const nextStep = getNextStep(step)
      setWorkflowState(prev => ({
        ...prev,
        completedSteps: newCompletedSteps,
        [`${step.replace('-', '')}Data`]: data,
        currentStep: nextStep || 'completed'
      }))

      // Start next step if not at the end
      if (nextStep && workflowState.journeyId) {
        await trackJourneyStep(workflowState.journeyId, nextStep, {
          completionStatus: 'started'
        })
      }
    } catch (err) {
      setError(`Failed to complete step: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleWorkflowComplete = async () => {
    try {
      if (workflowState.journeyId) {
        await endJourney(workflowState.journeyId, 'completed', {
          finalOutput: workflowState.finalContent?.content,
          satisfactionScore: 1 // Assuming successful completion
        })
      }

      onComplete?.(workflowState)
    } catch (err) {
      setError(`Failed to complete workflow: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const getNextStep = (currentStep: BlogWorkflowStep): BlogWorkflowStep | null => {
    const currentIndex = BLOG_STEPS.findIndex(step => step.value === currentStep)
    const nextStep = BLOG_STEPS[currentIndex + 1]
    return nextStep ? nextStep.value : null
  }

  const getCurrentStepIndex = () => {
    return BLOG_STEPS.findIndex(step => step.value === workflowState.currentStep)
  }

  const getProgress = () => {
    return (workflowState.completedSteps.length / BLOG_STEPS.length) * 100
  }

  if (isInitializing) {
    return (
      <Card withBorder p="xl">
        <Stack align="center" gap="md">
          <Text>Initializing blog creation workflow...</Text>
          <Progress value={0} size="lg" w="100%" animated />
        </Stack>
      </Card>
    )
  }

  if (error) {
    return (
      <Card withBorder p="xl">
        <Alert 
          title="Workflow Error" 
          color="red"
          mb="md"
        >
          {error}
        </Alert>
        <Button onClick={onBack}>
          ← Back to Home
        </Button>
      </Card>
    )
  }

  const renderCurrentStep = () => {
    // Placeholder step implementations until step components are created
    switch (workflowState.currentStep) {
      case 'topic-exploration':
        return (
          <TopicExplorationStep
            journeyId={workflowState.journeyId}
            onComplete={(data) => handleStepComplete('topic-exploration', data)}
          />
        )
      case 'outline-generation':
        return (
          <Stack gap="md">
            <Title order={3}>Outline Generation</Title>
            <Text c="dimmed">AI-powered outline creation coming in next commit...</Text>
            <Button onClick={() => handleStepComplete('outline-generation', { outline: 'Sample Outline', sections: [{ title: 'Introduction', description: 'Opening section' }] })}>
              Complete Step (Placeholder)
            </Button>
          </Stack>
        )
      case 'section-writing':
        return (
          <Stack gap="md">
            <Title order={3}>Section Writing</Title>
            <Text c="dimmed">Mixed interaction section writing coming in next commit...</Text>
            <Button onClick={() => handleStepComplete('section-writing', { sections: [{ title: 'Introduction', content: 'Sample content', status: 'complete' }] })}>
              Complete Step (Placeholder)
            </Button>
          </Stack>
        )
      case 'review-polish':
        return (
          <Stack gap="md">
            <Title order={3}>Review & Polish</Title>
            <Text c="dimmed">Final review and export coming in next commit...</Text>
            <Button onClick={handleWorkflowComplete}>
              Complete Workflow (Placeholder)
            </Button>
          </Stack>
        )
      case 'completed':
        return (
          <Stack align="center" gap="md">
            <Title order={3}>Workflow Complete! 🎉</Title>
            <Text c="dimmed">Your blog post has been created successfully.</Text>
          </Stack>
        )
      default:
        return <Text>Unknown step: {workflowState.currentStep}</Text>
    }
  }

  return (
    <Stack gap="lg">
      {/* Header with back button */}
      <Group justify="space-between">
        <div>
          <Title order={1}>Create Blog Post</Title>
          <Text c="dimmed">AI-powered blog creation workflow</Text>
        </div>
        <Button variant="outline" onClick={onBack}>
          ← Back to Home
        </Button>
      </Group>

      {/* Progress indicator */}
      <Card withBorder p="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={500}>Progress</Text>
            <Text size="sm" c="dimmed">
              {workflowState.completedSteps.length} of {BLOG_STEPS.length} steps completed
            </Text>
          </Group>
          <Progress value={getProgress()} size="lg" />
        </Stack>
      </Card>

      {/* Step navigation */}
      <Card withBorder p="md">
        <Stepper 
          active={getCurrentStepIndex()} 
          completedIcon={null}
          size="sm"
        >
          {BLOG_STEPS.map((step) => (
            <Stepper.Step
              key={step.value}
              label={step.label}
              description={step.description}
              loading={workflowState.currentStep === step.value}
            />
          ))}
        </Stepper>
      </Card>

      {/* Current step content */}
      <Card withBorder p="xl" mih={400}>
        {renderCurrentStep()}
      </Card>
    </Stack>
  )
} 