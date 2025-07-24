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
  Alert,
  Loader,
  Code,
  ActionIcon,
  MultiSelect,
  Checkbox
} from '@mantine/core'
import { useState, useEffect } from 'react'
import { IconSparkles, IconCopy, IconCheck, IconHash, IconUsers, IconTarget } from '@tabler/icons-react'
import type { WorkflowStepProps } from './WorkflowInterface'
import { trackTurn, vote } from '../lib/bilan'
import { generateContentForType } from '../lib/ai-client'

/**
 * Social workflow step data interfaces
 */
interface GoalStepData {
  platform: string
  goal: string
  targetAudience: string
  contentType: string
  tone: string
}

interface IdeationStepData {
  contentPillars: string[]
  themes: string
  hooks: string[]
  selectedIdeas: string[]
}

interface PostCreationStepData {
  postContent: string
  platform: string
  contentLength: string
  includeEmojis: boolean
  callToAction?: string
}

interface HashtagStepData {
  hashtags: string[]
  hashtagStrategy: string
  engagementTactics: string[]
  postingTime?: string
}

/**
 * Social workflow step component
 * 
 * Handles all four steps of the social media workflow:
 * 1. Goal Setting & Platform Selection
 * 2. Content Ideation & Theme Development
 * 3. Post Creation & Optimization
 * 4. Hashtag Generation & Engagement Strategy
 */
export function SocialWorkflowStep({
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
        () => generateContentForType('social', prompt),
        {
          contentType: 'social',
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
      case 'goal-setting':
        return (
          <Stack gap="md">
            <Group>
              <IconTarget size={20} />
              <Title order={3}>Set Goals & Platform</Title>
            </Group>
            
            <Select
              label="Primary social media platform"
              placeholder="Select platform"
              value={formData.platform || ''}
              onChange={(value) => updateFormData('platform', value)}
              data={[
                { value: 'twitter', label: 'Twitter/X' },
                { value: 'linkedin', label: 'LinkedIn' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'facebook', label: 'Facebook' },
                { value: 'tiktok', label: 'TikTok' },
                { value: 'youtube', label: 'YouTube' }
              ]}
              required
            />
            
            <Select
              label="What's your main goal?"
              placeholder="Select primary objective"
              value={formData.goal || ''}
              onChange={(value) => updateFormData('goal', value)}
              data={[
                { value: 'brand-awareness', label: 'Build Brand Awareness' },
                { value: 'engagement', label: 'Increase Engagement' },
                { value: 'lead-generation', label: 'Generate Leads' },
                { value: 'community-building', label: 'Build Community' },
                { value: 'thought-leadership', label: 'Establish Thought Leadership' },
                { value: 'product-promotion', label: 'Promote Product/Service' }
              ]}
              required
            />
            
            <TextInput
              label="Target audience"
              placeholder="e.g., Tech entrepreneurs, Marketing professionals, Small business owners"
              value={formData.targetAudience || ''}
              onChange={(e) => updateFormData('targetAudience', e.target.value)}
              required
            />
            
            <Select
              label="Content type preference"
              placeholder="What type of content works best?"
              value={formData.contentType || ''}
              onChange={(value) => updateFormData('contentType', value)}
              data={[
                { value: 'educational', label: 'Educational/Tips' },
                { value: 'inspirational', label: 'Inspirational/Motivational' },
                { value: 'behind-scenes', label: 'Behind-the-Scenes' },
                { value: 'news-updates', label: 'News & Updates' },
                { value: 'user-generated', label: 'User-Generated Content' },
                { value: 'promotional', label: 'Promotional' }
              ]}
            />
            
            <Select
              label="Tone of voice"
              placeholder="How should your brand sound?"
              value={formData.tone || ''}
              onChange={(value) => updateFormData('tone', value)}
              data={[
                { value: 'professional', label: 'Professional' },
                { value: 'casual', label: 'Casual & Friendly' },
                { value: 'witty', label: 'Witty & Humorous' },
                { value: 'inspiring', label: 'Inspiring & Motivational' },
                { value: 'authoritative', label: 'Expert & Authoritative' }
              ]}
            />
          </Stack>
        )

      case 'content-ideation':
        return (
          <Stack gap="md">
            <Group>
              <IconUsers size={20} />
              <Title order={3}>Generate Content Ideas</Title>
            </Group>
            
            <Alert color="blue">
              <Text size="sm">
                Platform: <strong>{stepData['goal-setting']?.platform}</strong>
                <br />
                Goal: <strong>{stepData['goal-setting']?.goal}</strong>
                <br />
                Audience: <strong>{stepData['goal-setting']?.targetAudience}</strong>
              </Text>
            </Alert>
            
                         <MultiSelect
               label="Content pillars (key themes for your content)"
               placeholder="Select or add content themes"
               value={formData.contentPillars || []}
               onChange={(values) => updateFormData('contentPillars', values)}
               data={[
                 { value: 'industry-insights', label: 'Industry Insights' },
                 { value: 'personal-stories', label: 'Personal Stories' },
                 { value: 'how-to-guides', label: 'How-to Guides' },
                 { value: 'company-culture', label: 'Company Culture' },
                 { value: 'product-features', label: 'Product Features' },
                 { value: 'customer-success', label: 'Customer Success' },
                 { value: 'trends-analysis', label: 'Trends Analysis' },
                 { value: 'behind-scenes', label: 'Behind the Scenes' }
               ]}
               searchable
             />
            
            <Textarea
              label="Specific themes or topics you want to cover"
              placeholder="e.g., AI trends, productivity tips, startup challenges, remote work best practices"
              value={formData.themes || ''}
              onChange={(e) => updateFormData('themes', e.target.value)}
              minRows={3}
            />
            
            <Button
              leftSection={<IconSparkles size={16} />}
              onClick={handleGenerate}
              disabled={isGenerating || !formData.contentPillars?.length}
              loading={isGenerating}
            >
              Generate Content Ideas
            </Button>
          </Stack>
        )

      case 'post-creation':
        return (
          <Stack gap="md">
            <Group>
              <IconSparkles size={20} />
              <Title order={3}>Create Social Post</Title>
            </Group>
            
            <Alert color="blue">
              <Text size="sm">
                Best ideas from brainstorming: <strong>{stepData['content-ideation']?.selectedIdeas?.join(', ') || 'Generated ideas'}</strong>
                <br />
                Platform: <strong>{stepData['goal-setting']?.platform}</strong>
              </Text>
            </Alert>
            
            <Select
              label="Content length"
              placeholder="How long should the post be?"
              value={formData.contentLength || ''}
              onChange={(value) => updateFormData('contentLength', value)}
              data={[
                { value: 'short', label: 'Short & Punchy (50-100 chars)' },
                { value: 'medium', label: 'Standard Length (100-200 chars)' },
                { value: 'long', label: 'Long-form (200+ chars)' }
              ]}
            />
            
            <Checkbox
              label="Include emojis to increase engagement"
              checked={formData.includeEmojis || false}
              onChange={(e) => updateFormData('includeEmojis', e.currentTarget.checked)}
            />
            
            <TextInput
              label="Call-to-action (optional)"
              placeholder="e.g., Visit our website, Share your thoughts, Join the discussion"
              value={formData.callToAction || ''}
              onChange={(e) => updateFormData('callToAction', e.target.value)}
            />
            
            <Button
              leftSection={<IconSparkles size={16} />}
              onClick={handleGenerate}
              disabled={isGenerating || !formData.contentLength}
              loading={isGenerating}
            >
              Generate Social Media Post
            </Button>
          </Stack>
        )

      case 'hashtag-generation':
        return (
          <Stack gap="md">
            <Group>
              <IconHash size={20} />
              <Title order={3}>Add Hashtags & Engagement</Title>
            </Group>
            
            <Alert color="blue">
              <Text size="sm">
                Platform: <strong>{stepData['goal-setting']?.platform}</strong>
                <br />
                Goal: <strong>{stepData['goal-setting']?.goal}</strong>
              </Text>
            </Alert>
            
            <Select
              label="Hashtag strategy"
              placeholder="What's your hashtag approach?"
              value={formData.hashtagStrategy || ''}
              onChange={(value) => updateFormData('hashtagStrategy', value)}
              data={[
                { value: 'niche', label: 'Niche-specific hashtags' },
                { value: 'trending', label: 'Trending hashtags' },
                { value: 'branded', label: 'Branded hashtags' },
                { value: 'mixed', label: 'Mixed approach' },
                { value: 'community', label: 'Community hashtags' }
              ]}
              required
            />
            
            <MultiSelect
              label="Engagement tactics to include"
              placeholder="Select engagement strategies"
              value={formData.engagementTactics || []}
              onChange={(values) => updateFormData('engagementTactics', values)}
              data={[
                { value: 'ask-question', label: 'Ask a Question' },
                { value: 'poll', label: 'Create a Poll' },
                { value: 'user-generated', label: 'Encourage User-Generated Content' },
                { value: 'share-experience', label: 'Ask to Share Experience' },
                { value: 'tag-friends', label: 'Tag Friends' },
                { value: 'comment-prompt', label: 'Comment Prompt' }
              ]}
            />
            
            <TextInput
              label="Optimal posting time (optional)"
              placeholder="e.g., 9 AM EST, Weekday evenings, Tuesday 2 PM"
              value={formData.postingTime || ''}
              onChange={(e) => updateFormData('postingTime', e.target.value)}
            />
            
            <Button
              leftSection={<IconSparkles size={16} />}
              onClick={handleGenerate}
              disabled={isGenerating || !formData.hashtagStrategy}
              loading={isGenerating}
            >
              Generate Hashtags & Strategy
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
            {stepId === 'hashtag-generation' ? 'Complete Social Media Campaign' : 'Continue to Next Step'}
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
 * Build AI prompts for each social media step
 */
function buildPromptForStep(stepId: string, formData: any, allStepData: Record<string, any>): string {
  const goalData = allStepData['goal-setting'] as GoalStepData
  
  switch (stepId) {
    case 'content-ideation':
      return `Generate creative content ideas for social media:

Platform: ${goalData?.platform}
Goal: ${goalData?.goal}
Target Audience: ${goalData?.targetAudience}
Content Type: ${goalData?.contentType}
Tone: ${goalData?.tone}
Content Pillars: ${formData.contentPillars?.join(', ')}
Themes: ${formData.themes}

Requirements:
- Generate 10 specific, actionable content ideas
- Each idea should be platform-appropriate for ${goalData?.platform}
- Match the ${goalData?.tone} tone
- Appeal to ${goalData?.targetAudience}
- Support the goal of ${goalData?.goal}
- Incorporate the specified content pillars and themes
- Provide variety in content formats and approaches

Please provide a numbered list of 10 content ideas with brief descriptions.`

    case 'post-creation': {
      const ideationData = allStepData['content-ideation'] as IdeationStepData
      return `Create an engaging social media post:

Platform: ${goalData?.platform}
Goal: ${goalData?.goal}
Audience: ${goalData?.targetAudience}
Tone: ${goalData?.tone}
Content Length: ${formData.contentLength}
Include Emojis: ${formData.includeEmojis ? 'Yes' : 'No'}
Call-to-Action: ${formData.callToAction || 'None specified'}
Content Ideas: ${ideationData?.selectedIdeas?.join(', ') || 'Based on brainstormed ideas'}

Requirements:
- Write for ${goalData?.platform} best practices
- Use ${goalData?.tone} tone throughout
- Target ${goalData?.targetAudience}
- ${formData.contentLength} length
- ${formData.includeEmojis ? 'Include relevant emojis' : 'No emojis'}
- ${formData.callToAction ? `Include this call-to-action: ${formData.callToAction}` : 'Natural engagement prompt'}
- Make it engaging and shareable
- Follow ${goalData?.platform} character limits and format

Please write the complete social media post now.`
    }

    case 'hashtag-generation':
      return `Create hashtags and engagement strategy:

Platform: ${goalData?.platform}
Goal: ${goalData?.goal}
Hashtag Strategy: ${formData.hashtagStrategy}
Engagement Tactics: ${formData.engagementTactics?.join(', ')}
Posting Time: ${formData.postingTime || 'Not specified'}
Target Audience: ${goalData?.targetAudience}

Requirements:
- Generate 10-15 relevant hashtags using ${formData.hashtagStrategy} strategy
- Mix of popular and niche hashtags
- Platform-appropriate for ${goalData?.platform}
- Support ${goalData?.goal} objective
- Include engagement tactics: ${formData.engagementTactics?.join(', ')}
- ${formData.postingTime ? `Consider timing: ${formData.postingTime}` : 'Include general timing recommendations'}

Please provide:
1. List of hashtags with explanation
2. Specific engagement tactics to implement
3. Posting timing recommendations
4. Additional engagement tips`

    default:
      return `Help with ${stepId}: ${JSON.stringify(formData)}`
  }
} 