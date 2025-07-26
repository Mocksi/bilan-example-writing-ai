'use client'

import {
  Container,
  Card,
  Stepper,
  Group,
  Button,
  Title,
  Text,
  Stack,
  Badge,
  Alert,
  Loader
} from '@mantine/core'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { IconCheck, IconAlertCircle } from '@tabler/icons-react'
import type { ContentType } from '../types'
import { initializeBilan, createUserId } from '../lib/bilan'
import { JourneyTracker } from '../lib/journey-tracker'
import { EmailWorkflowStep } from './EmailWorkflowStep'
import { SocialWorkflowStep } from './SocialWorkflowStep'

/**
 * Workflow step definition interface
 */
interface WorkflowStep {
  id: string
  title: string
  description: string
  component: React.ComponentType<WorkflowStepProps>
}

/**
 * Props passed to individual workflow step components
 */
export interface WorkflowStepProps {
  stepId: string
  stepData: Record<string, any>
  onStepComplete: (stepId: string, data: any) => void
  onStepError: (stepId: string, error: string) => void
  isActive: boolean
  isCompleted: boolean
}

/**
 * Main workflow interface props
 */
interface WorkflowInterfaceProps {
  contentType: ContentType
  onComplete?: (result: any) => void
  onCancel?: () => void
}

/**
 * Workflow definitions for email and social media
 */
const WORKFLOW_DEFINITIONS = {
  email: [
    {
      id: 'purpose-definition',
      title: 'Define Purpose & Audience',
      description: 'Clarify your email goal and target audience',
      component: EmailWorkflowStep
    },
    {
      id: 'subject-generation',
      title: 'Create Subject Line',
      description: 'Generate compelling subject lines that get opened',
      component: EmailWorkflowStep
    },
    {
      id: 'body-writing',
      title: 'Write Email Body',
      description: 'Craft the main message with clear structure',
      component: EmailWorkflowStep
    },
    {
      id: 'cta-creation',
      title: 'Design Call-to-Action',
      description: 'Create effective call-to-action that drives results',
      component: EmailWorkflowStep
    }
  ] as WorkflowStep[],
  social: [
    {
      id: 'goal-setting',
      title: 'Set Goals & Platform',
      description: 'Define objectives and choose target platform',
      component: SocialWorkflowStep
    },
    {
      id: 'content-ideation',
      title: 'Generate Content Ideas',
      description: 'Brainstorm engaging content concepts',
      component: SocialWorkflowStep
    },
    {
      id: 'post-creation',
      title: 'Create Social Post',
      description: 'Write optimized post content',
      component: SocialWorkflowStep
    },
    {
      id: 'hashtag-generation',
      title: 'Add Hashtags & Engagement',
      description: 'Optimize with hashtags and engagement strategies',
      component: SocialWorkflowStep
    }
  ] as WorkflowStep[],
  blog: [] // Will be implemented in future PR
}

/**
 * Main workflow interface component
 * 
 * Orchestrates step-by-step content creation workflows with comprehensive
 * Bilan analytics integration. Handles journey progression, step tracking,
 * and result compilation for email and social media content creation.
 */
export function WorkflowInterface({ 
  contentType, 
  onComplete, 
  onCancel 
}: WorkflowInterfaceProps) {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [stepData, setStepData] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const journeyTracker = useRef<JourneyTracker | null>(null)

  const workflow = WORKFLOW_DEFINITIONS[contentType] || []
  const currentStep = workflow[activeStep]

  /**
   * Initialize journey tracking when component mounts
   */
  useEffect(() => {
    const initializeJourney = async () => {
      try {
        setIsLoading(true)
        
        // Initialize Bilan with user ID
        const userId = createUserId(`user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`)
        await initializeBilan(userId)
        
        const journeyType = contentType === 'email' ? 'email-campaign' : 
                           contentType === 'social' ? 'social-media' : 
                           'blog-creation'
        
        // Create journey tracker
        journeyTracker.current = new JourneyTracker(
          journeyType,
          userId,
          workflow.length,
          {
            contentType,
            topic: `${contentType} content creation`,
            userBrief: `Creating ${contentType} content through guided workflow`
          }
        )

        // Start the journey
        await journeyTracker.current.start({
          source: 'workflow_interface',
          contentType
        })
      } catch (err) {
        setError('Failed to initialize workflow. Please try again.')
        console.error('Journey initialization failed:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initializeJourney()
  }, [contentType, workflow.length])

  /**
   * Track step changes after journey is initialized
   */
  useEffect(() => {
    const trackStepStart = async () => {
      if (journeyTracker.current && currentStep && activeStep > 0) {
        try {
          await journeyTracker.current.trackStep(
            currentStep.id, 
            activeStep + 1,
            { stepIndex: activeStep }
          )
        } catch (err) {
          console.error('Failed to track step start:', err)
        }
      }
    }

    trackStepStart()
  }, [activeStep, currentStep])

  /**
   * Handle step completion
   */
  const handleStepComplete = async (stepId: string, data: any) => {
    try {
      setIsLoading(true)
      
      // Update step data
      const newStepData = { ...stepData, [stepId]: data }
      setStepData(newStepData)
      
      // Mark step as completed
      const newCompletedSteps = new Set(completedSteps)
      newCompletedSteps.add(activeStep)
      setCompletedSteps(newCompletedSteps)
      
      // Track step completion with enhanced metadata
      if (journeyTracker.current) {
        // Include rich step data
        const stepMetadata = {
          ...data,
          completionStatus: 'completed',
          stepIndex: activeStep,
          timeToComplete: Date.now()
        }

        // For email workflow, add specific metadata
        if (contentType === 'email') {
          if (stepId === 'subject-generation' && data.subjects) {
            stepMetadata.subjects_generated = data.subjects.length
            stepMetadata.selected_subject = data.selectedSubject
          } else if (stepId === 'body-writing' && data.body) {
            stepMetadata.body_length = data.body.length
            stepMetadata.structure_used = data.structure
          }
        }

        await journeyTracker.current.trackStep(stepId, activeStep + 1, stepMetadata)

        // Link turn if one was created
        if (data.turnId) {
          await journeyTracker.current.linkTurn(data.turnId, {
            step_name: stepId,
            generated_content_length: data.generatedContent?.length || 0
          })
        }
      }
      
      // Move to next step or complete workflow
      if (activeStep < workflow.length - 1) {
        const nextStepIndex = activeStep + 1
        setActiveStep(nextStepIndex)
        
        // Track next step start
        if (journeyTracker.current) {
          await journeyTracker.current.trackStep(
            workflow[nextStepIndex].id, 
            nextStepIndex + 1,
            { stepStatus: 'started' }
          )
        }
      } else {
        // Workflow complete
        await handleWorkflowComplete(newStepData)
      }
    } catch (err) {
      setError('Failed to process step. Please try again.')
      console.error('Step completion failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle workflow completion
   */
  const handleWorkflowComplete = async (finalStepData: Record<string, any>) => {
    try {
      // End journey tracking with comprehensive metadata
      if (journeyTracker.current) {
        await journeyTracker.current.complete('completed', {
          finalOutput: JSON.stringify(finalStepData),
          satisfactionScore: 1, // Could be enhanced with user feedback
          completionTime: Date.now(),
          totalStepsData: Object.keys(finalStepData).length,
          contentType
        })
      }

      // Call completion callback or navigate
      if (onComplete) {
        onComplete(finalStepData)
      } else {
        // Default: show completion message and return home
        router.push('/?success=workflow-completed')
      }
    } catch (err) {
      console.error('Workflow completion failed:', err)
      setError('Workflow completed but tracking failed. Your content has been created successfully.')
    }
  }

  /**
   * Handle step error
   */
  const handleStepError = (stepId: string, errorMessage: string) => {
    setError(`Step "${currentStep?.title}" failed: ${errorMessage}`)
  }

  /**
   * Handle workflow cancellation
   */
  const handleCancel = async () => {
    try {
      // Track journey abandonment with detailed context
      if (journeyTracker.current) {
        await journeyTracker.current.abandon('user_cancelled')
      }

      if (onCancel) {
        onCancel()
      } else {
        router.push('/')
      }
    } catch (err) {
      console.error('Journey abandonment tracking failed:', err)
      // Still allow cancellation even if tracking fails
      if (onCancel) {
        onCancel()
      } else {
        router.push('/')
      }
    }
  }

  /**
   * Handle step navigation (back button)
   */
  const handleStepBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  if (workflow.length === 0) {
    return (
      <Container size="sm" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} color="orange">
          Workflow for "{contentType}" content type is not yet implemented.
        </Alert>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Card withBorder p="xl">
        {/* Workflow Header */}
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={1}>
              {contentType === 'email' ? 'Email Campaign' : 
               contentType === 'social' ? 'Social Media' : 
               'Content'} Workflow
            </Title>
            <Text c="dimmed">
              Step-by-step {contentType} content creation with AI assistance
            </Text>
          </div>
          <Group>
            <Badge variant="light" size="lg">
              Step {activeStep + 1} of {workflow.length}
            </Badge>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </Group>
        </Group>

        {/* Error Display */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Progress Stepper */}
        <Stepper 
          active={activeStep} 
          onStepClick={setActiveStep}
          allowNextStepsSelect={false}
          mb="xl"
        >
          {workflow.map((step, index) => (
            <Stepper.Step
              key={step.id}
              label={step.title}
              description={step.description}
              completedIcon={<IconCheck size={18} />}
              loading={isLoading && index === activeStep}
            />
          ))}
        </Stepper>

        {/* Current Step Content */}
        {currentStep && (
          <Card withBorder p="lg" mb="xl">
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={2}>{currentStep.title}</Title>
                {isLoading && <Loader size="sm" />}
              </Group>
              <Text c="dimmed">{currentStep.description}</Text>
              
              {/* Render current step component */}
              <currentStep.component
                stepId={currentStep.id}
                stepData={stepData}
                onStepComplete={handleStepComplete}
                onStepError={handleStepError}
                isActive={true}
                isCompleted={completedSteps.has(activeStep)}
              />
            </Stack>
          </Card>
        )}

        {/* Navigation Controls */}
        <Group justify="space-between">
          <Button
            variant="outline"
            onClick={handleStepBack}
            disabled={activeStep === 0 || isLoading}
          >
            Previous Step
          </Button>
          
          <Group>
            <Text size="sm" c="dimmed">
              {completedSteps.size} of {workflow.length} steps completed
            </Text>
          </Group>
        </Group>
      </Card>
    </Container>
  )
} 