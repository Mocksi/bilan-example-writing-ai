'use client'

import {
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Select,
  Card,
  Text,
  Badge,
  Title,
  Divider,
  Alert,
  Loader,
  Code,
  ActionIcon
} from '@mantine/core'
import { useState, useEffect } from 'react'
import { IconSparkles, IconCopy, IconCheck } from '@tabler/icons-react'
import type { WorkflowStepProps } from './WorkflowInterface'
import { trackTurn, vote } from '../lib/bilan'
import { generateContentForType } from '../lib/ai-client'

/**
 * Email workflow step data interfaces
 */
interface PurposeStepData {
  goal: string
  audience: string
  tone: string
  context?: string
}

interface SubjectStepData {
  subjects: string[]
  selectedSubject: string
  reasoning?: string
}

interface BodyStepData {
  body: string
  structure: string
  keyPoints: string[]
}

interface CTAStepData {
  ctaText: string
  ctaType: string
  placement: string
  urgency?: string
}

/**
 * Email workflow step component
 * 
 * Handles all four steps of the email campaign workflow:
 * 1. Purpose & Audience Definition
 * 2. Subject Line Generation
 * 3. Email Body Writing
 * 4. Call-to-Action Creation
 */
export function EmailWorkflowStep({
  stepId,
  stepData,
  onStepComplete,
  onStepError,
  isActive,
  isCompleted
}: WorkflowStepProps) {
  const [formData, setFormData] = useState<any>({})
  const [generatedContent, setGeneratedContent] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [turnId, setTurnId] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Initialize form data from existing step data
  useEffect(() => {
    if (stepData[stepId]) {
      setFormData(stepData[stepId])
    }
  }, [stepId, stepData])

  /**
   * Handle AI content generation for current step
   */
  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      
      const prompt = buildPromptForStep(stepId, formData, stepData)
      
      const { result, turnId: newTurnId } = await trackTurn(
        prompt,
        () => generateContentForType('email', prompt),
        {
          contentType: 'email',
          journey_step: stepId,
          stepData: formData
        }
      )

      setGeneratedContent(result.text)
      setTurnId(newTurnId)
      
    } catch (error) {
      onStepError(stepId, `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Handle user feedback on generated content
   */
  const handleFeedback = async (rating: 1 | -1, comment?: string) => {
    if (turnId) {
      await vote(turnId, rating, comment, {
        feedbackType: rating === 1 ? 'accept' : 'reject',
        stepId
      })
    }
  }

  /**
   * Handle step completion
   */
  const handleComplete = () => {
    const completionData = {
      ...formData,
      generatedContent,
      turnId
    }
    onStepComplete(stepId, completionData)
  }

  /**
   * Copy generated content to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy content:', error)
    }
  }

  /**
   * Update form data
   */
  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  /**
   * Render step-specific form fields
   */
  const renderStepForm = () => {
    switch (stepId) {
      case 'purpose-definition':
        return (
          <Stack gap="md">
            <Title order={3}>Define Your Email Purpose</Title>
            <TextInput
              label="What is the main goal of this email?"
              placeholder="e.g., Announce new product, Follow up on meeting, Newsletter update"
              value={formData.goal || ''}
              onChange={(e) => updateFormData('goal', e.target.value)}
              required
            />
            <TextInput
              label="Who is your target audience?"
              placeholder="e.g., Existing customers, Potential leads, Newsletter subscribers"
              value={formData.audience || ''}
              onChange={(e) => updateFormData('audience', e.target.value)}
              required
            />
            <Select
              label="What tone should the email have?"
              placeholder="Select tone"
              value={formData.tone || ''}
              onChange={(value) => updateFormData('tone', value)}
              data={[
                { value: 'professional', label: 'Professional' },
                { value: 'friendly', label: 'Friendly' },
                { value: 'formal', label: 'Formal' },
                { value: 'casual', label: 'Casual' }
              ]}
              required
            />
            <Textarea
              label="Additional context (optional)"
              placeholder="Any specific details, background information, or requirements"
              value={formData.context || ''}
              onChange={(e) => updateFormData('context', e.target.value)}
              minRows={3}
            />
          </Stack>
        )

      case 'subject-generation':
        return (
          <Stack gap="md">
            <Title order={3}>Create Compelling Subject Lines</Title>
            <Alert color="blue">
              <Text size="sm">
                Based on your purpose: <strong>{stepData['purpose-definition']?.goal}</strong>
                <br />
                Target audience: <strong>{stepData['purpose-definition']?.audience}</strong>
              </Text>
            </Alert>
            <Button
              leftSection={<IconSparkles size={16} />}
              onClick={handleGenerate}
              disabled={isGenerating || !stepData['purpose-definition']?.goal}
              loading={isGenerating}
            >
              Generate Subject Line Options
            </Button>
          </Stack>
        )

      case 'body-writing':
        return (
          <Stack gap="md">
            <Title order={3}>Write Email Body</Title>
            <Alert color="blue">
              <Text size="sm">
                Subject: <strong>{stepData['subject-generation']?.selectedSubject}</strong>
                <br />
                Goal: <strong>{stepData['purpose-definition']?.goal}</strong>
              </Text>
            </Alert>
            <Select
              label="Email structure"
              placeholder="Choose structure"
              value={formData.structure || ''}
              onChange={(value) => updateFormData('structure', value)}
              data={[
                { value: 'problem-solution', label: 'Problem → Solution' },
                { value: 'announcement', label: 'Announcement Style' },
                { value: 'story', label: 'Story Format' },
                { value: 'list', label: 'List/Bullet Points' }
              ]}
            />
            <Textarea
              label="Key points to include"
              placeholder="List the main points you want to cover (one per line)"
              value={formData.keyPoints || ''}
              onChange={(e) => updateFormData('keyPoints', e.target.value)}
              minRows={4}
            />
            <Button
              leftSection={<IconSparkles size={16} />}
              onClick={handleGenerate}
              disabled={isGenerating || !formData.structure}
              loading={isGenerating}
            >
              Generate Email Body
            </Button>
          </Stack>
        )

      case 'cta-creation':
        return (
          <Stack gap="md">
            <Title order={3}>Design Call-to-Action</Title>
            <Alert color="blue">
              <Text size="sm">
                Email goal: <strong>{stepData['purpose-definition']?.goal}</strong>
              </Text>
            </Alert>
            <Select
              label="Call-to-action type"
              placeholder="What should readers do?"
              value={formData.ctaType || ''}
              onChange={(value) => updateFormData('ctaType', value)}
              data={[
                { value: 'buy', label: 'Make a Purchase' },
                { value: 'signup', label: 'Sign Up / Register' },
                { value: 'learn', label: 'Learn More / Read' },
                { value: 'contact', label: 'Contact Us' },
                { value: 'download', label: 'Download' },
                { value: 'schedule', label: 'Schedule Meeting' }
              ]}
              required
            />
            <Select
              label="Urgency level"
              placeholder="How urgent is this action?"
              value={formData.urgency || ''}
              onChange={(value) => updateFormData('urgency', value)}
              data={[
                { value: 'low', label: 'Low - Anytime' },
                { value: 'medium', label: 'Medium - Soon' },
                { value: 'high', label: 'High - Urgent' }
              ]}
            />
            <Button
              leftSection={<IconSparkles size={16} />}
              onClick={handleGenerate}
              disabled={isGenerating || !formData.ctaType}
              loading={isGenerating}
            >
              Generate Call-to-Action
            </Button>
          </Stack>
        )

      default:
        return <Text>Unknown step: {stepId}</Text>
    }
  }

  return (
    <Stack gap="lg">
      {/* Step Form */}
      <Card withBorder p="md">
        {renderStepForm()}
      </Card>

      {/* Generated Content Display */}
      {generatedContent && (
        <Card withBorder p="md">
          <Group justify="space-between" mb="md">
            <Title order={4}>Generated Content</Title>
            <Group>
              <ActionIcon
                variant="light"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </ActionIcon>
            </Group>
          </Group>
          
          <Code block>
            {generatedContent}
          </Code>

          <Group mt="md" gap="sm">
            <Button
              size="sm"
              variant="light"
              color="green"
              onClick={() => handleFeedback(1, 'Content looks good')}
            >
              👍 Good
            </Button>
            <Button
              size="sm"
              variant="light"
              color="red"
              onClick={() => handleFeedback(-1, 'Needs improvement')}
            >
              👎 Regenerate
            </Button>
          </Group>
        </Card>
      )}

      {/* Step Completion */}
      {(generatedContent || isCompleted) && (
        <Group justify="flex-end">
          <Button
            onClick={handleComplete}
            disabled={!generatedContent && !isCompleted}
            size="lg"
          >
            {stepId === 'cta-creation' ? 'Complete Email Campaign' : 'Continue to Next Step'}
          </Button>
        </Group>
      )}

      {/* Loading State */}
      {isGenerating && (
        <Card withBorder p="md">
          <Group>
            <Loader size="sm" />
            <Text>Generating {stepId.replace('-', ' ')}...</Text>
          </Group>
        </Card>
      )}
    </Stack>
  )
}

/**
 * Build AI prompts for each step
 */
function buildPromptForStep(stepId: string, formData: any, allStepData: Record<string, any>): string {
  const purposeData = allStepData['purpose-definition'] as PurposeStepData
  
  switch (stepId) {
    case 'subject-generation':
      return `Generate 5 compelling email subject lines for this email:

Goal: ${purposeData?.goal}
Audience: ${purposeData?.audience}
Tone: ${purposeData?.tone}
Context: ${purposeData?.context || 'None'}

Requirements:
- Subject lines should be attention-grabbing but not clickbait
- Match the ${purposeData?.tone} tone
- Be relevant to ${purposeData?.audience}
- Encourage opening the email
- Vary in style and approach

Please provide 5 different subject line options with brief explanations for each.`

    case 'body-writing':
      const subjectData = allStepData['subject-generation'] as SubjectStepData
      return `Write a complete email body with this information:

Subject: ${subjectData?.selectedSubject}
Goal: ${purposeData?.goal}
Audience: ${purposeData?.audience}
Tone: ${purposeData?.tone}
Structure: ${formData.structure}
Key Points: ${formData.keyPoints}

Requirements:
- Use ${purposeData?.tone} tone throughout
- Follow ${formData.structure} structure
- Include all key points naturally
- Write for ${purposeData?.audience}
- Be engaging and clear
- Include proper email greeting and closing
- Leave space for call-to-action at the end

Please write the complete email body now.`

    case 'cta-creation':
      return `Create an effective call-to-action for this email:

Email Goal: ${purposeData?.goal}
CTA Type: ${formData.ctaType}
Urgency: ${formData.urgency}
Audience: ${purposeData?.audience}
Tone: ${purposeData?.tone}

Requirements:
- Match the ${purposeData?.tone} tone
- Create appropriate urgency for ${formData.urgency} level
- Be clear and specific about the action
- Motivate ${purposeData?.audience} to take action
- Include both button text and surrounding copy

Please provide:
1. Main CTA button text
2. Supporting copy around the CTA
3. Any urgency/scarcity elements if applicable`

    default:
      return `Help with ${stepId}: ${JSON.stringify(formData)}`
  }
} 