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
import { TopicExplorationStep, type TopicExplorationData } from './BlogWorkflow/TopicExplorationStep'
import { OutlineGenerationStep, type OutlineGenerationData } from './BlogWorkflow/OutlineGenerationStep'
import { SectionWritingStep, type SectionWritingData } from './BlogWorkflow/SectionWritingStep'
import { ReviewPolishStep, type ReviewPolishData } from './BlogWorkflow/ReviewPolishStep'

/**
 * Blog workflow step definitions following the implementation plan
 */
export type BlogWorkflowStep = 'topic-exploration' | 'outline-generation' | 'section-writing' | 'review-polish'

export interface BlogWorkflowState {
  currentStep: BlogWorkflowStep | 'completed'
  completedSteps: BlogWorkflowStep[]
  journeyId: string
  sessionId?: SessionId
  topicData?: TopicExplorationData
  outlineData?: OutlineGenerationData
  sectionsData?: SectionWritingData
  reviewData?: ReviewPolishData
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
      setWorkflowState(prev => {
        const updatedState: BlogWorkflowState = {
          ...prev,
          completedSteps: newCompletedSteps,
          currentStep: (nextStep || 'completed') as BlogWorkflowStep | 'completed'
        }

        // Assign data to the correct property based on step type
        switch (step) {
          case 'topic-exploration':
            updatedState.topicData = data as TopicExplorationData
            break
          case 'outline-generation':
            updatedState.outlineData = data as OutlineGenerationData
            break
          case 'section-writing':
            updatedState.sectionsData = data as SectionWritingData
            break
          case 'review-polish':
            updatedState.reviewData = data as ReviewPolishData
            break
        }

        return updatedState
      })

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

  const handleWorkflowComplete = async (reviewData?: ReviewPolishData) => {
    try {
      if (workflowState.journeyId) {
        await endJourney(workflowState.journeyId, 'completed', {
          finalOutput: reviewData?.finalContent,
          satisfactionScore: reviewData?.satisfaction === 'high' ? 1 : 0, // Simple: satisfied or not
          completionTime: Date.now()
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
          <OutlineGenerationStep
            journeyId={workflowState.journeyId}
            topicData={workflowState.topicData}
            onComplete={(data) => handleStepComplete('outline-generation', data)}
          />
        )
      case 'section-writing':
        return (
          <SectionWritingStep
            journeyId={workflowState.journeyId}
            topicData={workflowState.topicData}
            outlineData={workflowState.outlineData}
            onComplete={(data) => handleStepComplete('section-writing', data)}
          />
        )
      case 'review-polish':
        return (
          <ReviewPolishStep
            journeyId={workflowState.journeyId}
            topicData={workflowState.topicData}
            outlineData={workflowState.outlineData}
            sectionsData={workflowState.sectionsData}
            onComplete={(data) => handleWorkflowComplete(data)}
          />
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