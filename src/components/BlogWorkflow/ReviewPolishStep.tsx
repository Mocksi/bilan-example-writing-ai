'use client'

import { useState, useEffect } from 'react'
import { 
  Stack, 
  Button, 
  Text, 
  Title, 
  Card, 
  Group,
  Textarea,
  Alert,
  Badge,
  Paper,
  Tabs,
  ScrollArea,
  Select,
  Divider,
  CopyButton,
  ActionIcon,
  Modal,
  TextInput
} from '@mantine/core'
import { generateContentForType } from '../../lib/ai-client'
import { trackTurn } from '../../lib/bilan'
import type { TopicExplorationData } from './TopicExplorationStep'
import type { OutlineGenerationData } from './OutlineGenerationStep'
import type { SectionWritingData } from './SectionWritingStep'

export interface ReviewPolishData {
  finalTitle: string
  finalContent: string
  totalWordCount: number
  completedAt: number
  exportFormats: string[]
  satisfaction: 'high' | 'medium' | 'low'
}

export interface ReviewPolishStepProps {
  journeyId: string
  topicData?: TopicExplorationData
  outlineData?: OutlineGenerationData
  sectionsData?: SectionWritingData
  onComplete: () => void
}

type ReviewTab = 'preview' | 'edit' | 'export'

export function ReviewPolishStep({ 
  journeyId, 
  topicData, 
  outlineData, 
  sectionsData, 
  onComplete 
}: ReviewPolishStepProps) {
  const [activeTab, setActiveTab] = useState<ReviewTab>('preview')
  const [blogTitle, setBlogTitle] = useState('')
  const [finalContent, setFinalContent] = useState('')
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const [isPolishing, setIsPolishing] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [satisfaction, setSatisfaction] = useState<'high' | 'medium' | 'low'>('high')
  const [hasInitialized, setHasInitialized] = useState(false)

  // Initialize content when component mounts
  useEffect(() => {
    if (!hasInitialized && sectionsData) {
      const assembledContent = sectionsData.sections
        .filter(section => section.status === 'complete' && section.content.trim())
        .map(section => `## ${section.title}\n\n${section.content}`)
        .join('\n\n')
      
      setFinalContent(assembledContent)
      setBlogTitle(topicData?.topic || 'Blog Post Title')
      setHasInitialized(true)
    }
  }, [sectionsData, topicData, hasInitialized])

  const getTotalWordCount = () => {
    return finalContent.split(/\s+/).filter(word => word.length > 0).length
  }

  const handleGenerateTitle = async () => {
    setIsGeneratingTitle(true)
    
    try {
      const prompt = `Generate a compelling blog post title based on the following content:

Topic: ${topicData?.topic || 'Blog post topic'}
Target Audience: ${topicData?.audience || 'General audience'}
Key Points: ${topicData?.keyPoints?.join(', ') || 'Various topics'}

Content Preview:
${finalContent.substring(0, 500)}...

Generate 3 alternative titles that are:
1. Attention-grabbing and clickable
2. SEO-friendly with relevant keywords
3. Appropriate for the target audience
4. Clear about the value/benefit

Format as:
TITLE 1: [title]
TITLE 2: [title] 
TITLE 3: [title]`

      const { result, turnId } = await trackTurn(
        'Generate blog titles',
        () => generateContentForType('blog', prompt),
        {
          contentType: 'blog',
          journey_id: journeyId,
          journey_step: 'review-polish',
          userIntent: 'title-generation'
        }
      )

      // Parse titles from response
      const lines = result.text.split('\n')
      const titles = lines
        .filter(line => line.includes('TITLE'))
        .map(line => line.replace(/TITLE \d+:\s*/, '').trim())
        .filter(title => title.length > 0)

      if (titles.length > 0) {
        setBlogTitle(titles[0]) // Set the first title as default
        
        // Show all titles for user selection (could be enhanced with a selection UI)
        console.log('Generated titles:', titles)
      }

    } catch (error) {
      console.error('Failed to generate title:', error)
    } finally {
      setIsGeneratingTitle(false)
    }
  }

  const handlePolishContent = async () => {
    setIsPolishing(true)
    
    try {
      const prompt = `Polish and improve this blog post content while maintaining its core message and structure:

Original Topic: ${topicData?.topic}
Target Audience: ${topicData?.audience}
Desired Tone: ${topicData?.tone}

Current Content:
${finalContent}

Please improve the content by:
1. Enhancing clarity and readability
2. Improving transitions between sections
3. Adding engaging examples or analogies where appropriate
4. Ensuring consistent tone throughout
5. Optimizing for the target audience
6. Maintaining the original structure and key points

Return the polished version while keeping the same section headers and overall organization.`

      const { result, turnId } = await trackTurn(
        'Polish blog content',
        () => generateContentForType('blog', prompt),
        {
          contentType: 'blog',
          journey_id: journeyId,
          journey_step: 'review-polish',
          userIntent: 'content-polishing',
          originalWordCount: getTotalWordCount()
        }
      )

      setFinalContent(result.text.trim())

    } catch (error) {
      console.error('Failed to polish content:', error)
    } finally {
      setIsPolishing(false)
    }
  }

  const handleExport = (format: string) => {
    const content = `# ${blogTitle}\n\n${finalContent}`
    
    let mimeType = 'text/plain'
    let fileName = 'blog-post.txt'
    let exportContent = content

    switch (format) {
      case 'markdown':
        mimeType = 'text/markdown'
        fileName = 'blog-post.md'
        exportContent = content
        break
      case 'plain':
        mimeType = 'text/plain'
        fileName = 'blog-post.txt'
        exportContent = content.replace(/^#+\s*/gm, '').replace(/\*\*(.*?)\*\*/g, '$1')
        break
      case 'html':
        mimeType = 'text/html'
        fileName = 'blog-post.html'
        exportContent = `<!DOCTYPE html>
<html>
<head>
    <title>${blogTitle}</title>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; }
        p { margin-bottom: 15px; }
    </style>
</head>
<body>
${content.replace(/^# (.*$)/gm, '<h1>$1</h1>')
         .replace(/^## (.*$)/gm, '<h2>$1</h2>')
         .replace(/^### (.*$)/gm, '<h3>$1</h3>')
         .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
         .replace(/\*(.*?)\*/g, '<em>$1</em>')
         .replace(/\n\n/g, '</p>\n<p>')
         .replace(/^(?!<h|<\/p>)(.+)$/gm, '<p>$1</p>')}
</body>
</html>`
        break
    }

    // Create and trigger download
    const blob = new Blob([exportContent], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const renderPreviewTab = () => (
    <Stack gap="md">
      <Card withBorder p="lg">
        <Title order={2} mb="md">{blogTitle}</Title>
        <div 
          style={{ 
            whiteSpace: 'pre-wrap', 
            lineHeight: 1.6,
            fontSize: '16px'
          }}
          dangerouslySetInnerHTML={{
            __html: finalContent
              .replace(/^## (.*$)/gm, '<h3 style="margin-top: 24px; margin-bottom: 12px; color: #333;">$1</h3>')
              .replace(/^### (.*$)/gm, '<h4 style="margin-top: 20px; margin-bottom: 8px; color: #555;">$1</h4>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/\n\n/g, '</p><p style="margin-bottom: 16px;">')
              .replace(/^(?!<h|<\/p>)(.+)$/gm, '<p style="margin-bottom: 16px;">$1</p>')
          }}
        />
      </Card>
      
      <Card withBorder p="md" bg="gray.0">
        <Group justify="space-between">
          <div>
            <Text fw={500} size="sm">Content Statistics</Text>
            <Text size="xs" c="dimmed">
              {getTotalWordCount()} words · {Math.ceil(getTotalWordCount() / 200)} min read
            </Text>
          </div>
          <Group gap="xs">
            <Badge color="blue" size="sm">
              {sectionsData?.sections.filter(s => s.status === 'complete').length || 0} sections
            </Badge>
            <Badge color="green" size="sm">
              Ready to publish
            </Badge>
          </Group>
        </Group>
      </Card>
    </Stack>
  )

  const renderEditTab = () => (
    <Stack gap="md">
      <TextInput
        label="Blog Title"
        value={blogTitle}
        onChange={(e) => setBlogTitle(e.target.value)}
        rightSection={
          <Button
            size="xs"
            variant="light"
            onClick={handleGenerateTitle}
            loading={isGeneratingTitle}
          >
            Generate
          </Button>
        }
      />
      
      <div>
        <Group justify="space-between" mb="sm">
          <Text fw={500} size="sm">Content</Text>
          <Button
            size="xs"
            variant="light"
            onClick={handlePolishContent}
            loading={isPolishing}
          >
            Polish with AI
          </Button>
        </Group>
        
        <Textarea
          value={finalContent}
          onChange={(e) => setFinalContent(e.target.value)}
          minRows={20}
          maxRows={30}
          styles={{
            input: {
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: 1.5
            }
          }}
        />
      </div>
    </Stack>
  )

  const renderExportTab = () => (
    <Stack gap="md">
      <Text fw={500}>Export Your Blog Post</Text>
      
      <Card withBorder p="md">
        <Text size="sm" c="dimmed" mb="md">
          Choose a format to export your completed blog post:
        </Text>
        
        <Stack gap="sm">
          <Group justify="space-between">
            <div>
              <Text fw={500} size="sm">Markdown (.md)</Text>
              <Text size="xs" c="dimmed">Perfect for platforms like GitHub, dev.to, or Notion</Text>
            </div>
            <Button size="xs" onClick={() => handleExport('markdown')}>
              Download
            </Button>
          </Group>
          
          <Divider />
          
          <Group justify="space-between">
            <div>
              <Text fw={500} size="sm">HTML (.html)</Text>
              <Text size="xs" c="dimmed">Web-ready format with styling for easy publishing</Text>
            </div>
            <Button size="xs" onClick={() => handleExport('html')}>
              Download
            </Button>
          </Group>
          
          <Divider />
          
          <Group justify="space-between">
            <div>
              <Text fw={500} size="sm">Plain Text (.txt)</Text>
              <Text size="xs" c="dimmed">Simple text format for easy copying and pasting</Text>
            </div>
            <Button size="xs" onClick={() => handleExport('plain')}>
              Download
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card withBorder p="md">
        <Text fw={500} size="sm" mb="sm">Copy to Clipboard</Text>
        <Group gap="sm">
          <CopyButton value={`# ${blogTitle}\n\n${finalContent}`}>
            {({ copied, copy }) => (
              <Button size="xs" variant="light" onClick={copy} color={copied ? 'green' : 'blue'}>
                {copied ? 'Copied!' : 'Copy Markdown'}
              </Button>
            )}
          </CopyButton>
          
          <CopyButton value={finalContent.replace(/^#+\s*/gm, '').replace(/\*\*(.*?)\*\*/g, '$1')}>
            {({ copied, copy }) => (
              <Button size="xs" variant="light" onClick={copy} color={copied ? 'green' : 'blue'}>
                {copied ? 'Copied!' : 'Copy Plain Text'}
              </Button>
            )}
          </CopyButton>
        </Group>
      </Card>
    </Stack>
  )

  const handleCompleteWorkflow = async () => {
    try {
      // Track final satisfaction
      await trackTurn(
        'Complete blog workflow',
        async () => ({ text: 'Workflow completed successfully' }),
        {
          contentType: 'blog',
          journey_id: journeyId,
          journey_step: 'review-polish',
          userIntent: 'workflow-completion',
          satisfaction,
          finalWordCount: getTotalWordCount(),
          finalTitle: blogTitle
        }
      )

      onComplete()
    } catch (error) {
      console.error('Failed to complete workflow:', error)
      onComplete() // Complete anyway
    }
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={3} mb="xs">Review & Polish</Title>
        <Text c="dimmed" size="sm">
          Review your blog post, make final edits, and export in your preferred format.
        </Text>
      </div>

      {/* Content Summary */}
      <Card withBorder p="md" bg="blue.0">
        <Group justify="space-between">
          <div>
            <Text fw={500} size="sm">Your Blog Post</Text>
            <Text size="xs" c="dimmed">
              "{blogTitle}" • {getTotalWordCount()} words
            </Text>
          </div>
          <Group gap="xs">
            <Badge variant="light">
              {sectionsData?.sections.filter(s => s.status === 'complete').length || 0} sections
            </Badge>
            <Badge variant="light" color="green">
              Complete
            </Badge>
          </Group>
        </Group>
      </Card>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value as ReviewTab)}>
        <Tabs.List>
          <Tabs.Tab value="preview">Preview</Tabs.Tab>
          <Tabs.Tab value="edit">Edit</Tabs.Tab>
          <Tabs.Tab value="export">Export</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="preview" pt="md">
          {renderPreviewTab()}
        </Tabs.Panel>

        <Tabs.Panel value="edit" pt="md">
          {renderEditTab()}
        </Tabs.Panel>

        <Tabs.Panel value="export" pt="md">
          {renderExportTab()}
        </Tabs.Panel>
      </Tabs>

      {/* Satisfaction feedback */}
      <Card withBorder p="md">
        <Text fw={500} size="sm" mb="sm">How satisfied are you with your blog post?</Text>
        <Group gap="sm">
          {[
            { value: 'high', label: '😊 Very satisfied', color: 'green' },
            { value: 'medium', label: '😐 Somewhat satisfied', color: 'orange' },
            { value: 'low', label: '😞 Needs improvement', color: 'red' }
          ].map((option) => (
            <Button
              key={option.value}
              size="xs"
              variant={satisfaction === option.value ? 'filled' : 'light'}
              color={option.color}
              onClick={() => setSatisfaction(option.value as typeof satisfaction)}
            >
              {option.label}
            </Button>
          ))}
        </Group>
      </Card>

      {/* Complete workflow */}
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Your blog post is ready! Export it or complete the workflow.
        </Text>
        
        <Button 
          onClick={handleCompleteWorkflow}
          size="md"
          color="green"
        >
          Complete Blog Creation 🎉
        </Button>
      </Group>
    </Stack>
  )
} 