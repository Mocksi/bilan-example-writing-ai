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
 * Blog workflow step definitions representing the structured content creation process
 * 
 * This union type defines the four sequential steps in the blog creation journey,
 * following the implementation plan for comprehensive content development. Each step
 * represents a distinct phase with specific inputs, outputs, and user interactions
 * that progressively build toward a complete blog post.
 * 
 * @type {BlogWorkflowStep}
 * @property {'topic-exploration'} topic-exploration - Initial step for discovering and refining blog topics through conversation
 * @property {'outline-generation'} outline-generation - Second step for creating structured blog outlines with AI assistance
 * @property {'section-writing'} section-writing - Third step for writing individual sections using multiple creation methods
 * @property {'review-polish'} review-polish - Final step for reviewing, editing, and exporting the completed blog post
 * 
 * @example
 * ```typescript
 * const currentStep: BlogWorkflowStep = 'topic-exploration'
 * const nextStep: BlogWorkflowStep = 'outline-generation'
 * ```
 */
export type BlogWorkflowStep = 'topic-exploration' | 'outline-generation' | 'section-writing' | 'review-polish'

/**
 * Complete state management interface for the blog creation workflow
 * 
 * This interface represents the comprehensive state of a blog creation session,
 * including current progress, completed steps, generated content data, and
 * analytics tracking information. It serves as the central data structure
 * that orchestrates the entire workflow and preserves user progress.
 * 
 * @interface BlogWorkflowState
 * @property {BlogWorkflowStep | 'completed'} currentStep - The currently active workflow step or 'completed' if finished
 * @property {BlogWorkflowStep[]} completedSteps - Array of steps that have been successfully completed by the user
 * @property {string} journeyId - Unique Bilan journey identifier for analytics tracking and step correlation
 * @property {SessionId} [sessionId] - Optional session identifier for content persistence and user tracking
 * @property {TopicExplorationData} [topicData] - Data from topic exploration step: topic, audience, key points, tone
 * @property {OutlineGenerationData} [outlineData] - Data from outline generation step: structured outline and sections
 * @property {SectionWritingData} [sectionsData] - Data from section writing step: individual section content and metadata
 * @property {ReviewPolishData} [reviewData] - Data from review polish step: final content, satisfaction, and export info
 * 
 * @example
 * ```typescript
 * const workflowState: BlogWorkflowState = {
 *   currentStep: 'section-writing',
 *   completedSteps: ['topic-exploration', 'outline-generation'],
 *   journeyId: 'journey_abc123',
 *   topicData: { topic: 'AI in Healthcare', audience: 'Developers', ... },
 *   outlineData: { outline: '1. Introduction...', sections: [...], ... }
 * }
 * ```
 */
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

/**
 * Props interface for the BlogWorkflow component
 * 
 * Defines the required and optional properties for the main BlogWorkflow component
 * that orchestrates the complete blog creation process. This component manages
 * step progression, state coordination, and user interaction throughout the
 * structured content creation journey.
 * 
 * @interface BlogWorkflowProps
 * @property {ContentType} contentType - Type of content being created ('blog', 'email', 'social') for context and analytics
 * @property {function} onBack - Callback function invoked when user clicks back button to return to content selection
 * @property {function} [onComplete] - Optional callback invoked when workflow completes, receives final BlogWorkflowState
 * 
 * @description
 * **Component Usage:**
 * The BlogWorkflow component uses these props to:
 * - Configure content-specific prompts and instructions based on contentType
 * - Provide navigation back to the main content selection interface
 * - Handle workflow completion and pass results to parent components
 * 
 * **Callback Patterns:**
 * - `onBack`: Typically navigates to home/selection page using Next.js router
 * - `onComplete`: Receives complete workflow state for result processing, analytics, or navigation
 * 
 * @example
 * ```typescript
 * <BlogWorkflow
 *   contentType="blog"
 *   onBack={() => router.push('/')}
 *   onComplete={(result) => {
 *     console.log('Blog created:', result.topicData?.topic)
 *     // Handle completion logic
 *   }}
 * />
 * ```
 */
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

  const handleWorkflowComplete = async () => {
    try {
      if (workflowState.journeyId) {
        await endJourney(workflowState.journeyId, 'completed')
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
            onComplete={handleWorkflowComplete}
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