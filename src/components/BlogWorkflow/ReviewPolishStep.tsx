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
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { generateContentForType } from '../../lib/ai-client'
import { trackTurn, vote } from '../../lib/bilan'
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
  const [titleTurnId, setTitleTurnId] = useState<string>('')
  const [polishTurnId, setPolishTurnId] = useState<string>('')
  const [titleVote, setTitleVote] = useState<1 | -1 | null>(null)
  const [polishVote, setPolishVote] = useState<1 | -1 | null>(null)

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

  /**
   * Generates alternative blog post titles using AI based on content analysis
   * 
   * This asynchronous function creates compelling, SEO-friendly blog titles by analyzing
   * the blog content, topic data, and target audience information. It leverages AI content
   * generation to produce multiple title options and automatically selects the first one
   * as the default title while tracking the generation process with Bilan analytics.
   * 
   * **Core Functionality:**
   * - Constructs a comprehensive prompt including topic, audience, key points, and content preview
   * - Generates 3 alternative titles with specific criteria (attention-grabbing, SEO-friendly, audience-appropriate)
   * - Parses AI response to extract formatted titles using regex pattern matching
   * - Updates blog title state with the first generated title as default
   * - Tracks the generation process with Bilan analytics for user interaction insights
   * - Stores turn ID for potential user feedback/voting on generated titles
   * 
   * **Title Generation Criteria:**
   * 1. Attention-grabbing and clickable for engagement
   * 2. SEO-friendly with relevant keywords for search optimization  
   * 3. Appropriate for the specified target audience
   * 4. Clear about the value/benefit the blog post provides
   * 
   * **AI Integration Process:**
   * 1. Build prompt with topic data, audience info, key points, and content preview (500 chars)
   * 2. Track AI interaction with Bilan analytics including journey context
   * 3. Parse structured response format: "TITLE 1: [title]" pattern
   * 4. Filter and clean title results, removing formatting artifacts
   * 5. Set first title as default and store turn ID for feedback collection
   * 
   * **State Management:**
   * - Sets `isGeneratingTitle` loading state during AI generation
   * - Updates `blogTitle` with the first generated title
   * - Stores `titleTurnId` for potential user voting/feedback
   * - Maintains loading state regardless of success/failure outcome
   * 
   * @async
   * @function handleGenerateTitle
   * @returns {Promise<void>} Promise that resolves when title generation completes
   * 
   * @throws {Error} AI generation failures, network issues, or parsing errors are caught and logged securely
   * 
   * @description
   * **Security Considerations:**
   * Error logging is sanitized to prevent exposure of sensitive information such as
   * API keys, user data, or internal system details while maintaining debugging capability.
   * 
   * **Analytics Integration:**
   * The function uses Bilan's `trackTurn` to capture:
   * - User intent: 'title-generation'
   * - Journey step: 'review-polish' 
   * - Content type: 'blog'
   * - Turn ID for correlation with user feedback
   * 
   * **Future Enhancements:**
   * Currently logs all generated titles to console for development. Production version
   * could include UI for user selection among multiple generated title options.
   * 
   * @example
   * ```typescript
   * // User clicks "Generate Title" button
   * await handleGenerateTitle()
   * 
   * // Results in:
   * // - blogTitle updated with generated title
   * // - titleTurnId stored for voting
   * // - Bilan analytics event tracked
   * // - Loading state managed automatically
   * ```
   */
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
        setTitleTurnId(turnId) // Store turnId for voting
        
        // Show all titles for user selection (could be enhanced with a selection UI)
        console.log('Generated titles:', titles)
      }

    } catch (error) {
      // Sanitize error logging to prevent exposure of sensitive information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Failed to generate title:', errorMessage)
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
      setPolishTurnId(turnId)

    } catch (error) {
      // Sanitize error logging to prevent exposure of sensitive information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Failed to polish content:', errorMessage)
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
            lineHeight: 1.6,
            fontSize: '16px'
          }}
        >
          <ReactMarkdown
            rehypePlugins={[rehypeSanitize]}
            components={{
              h2: ({ children }) => (
                <h3 style={{ marginTop: '24px', marginBottom: '12px', color: '#333' }}>
                  {children}
                </h3>
              ),
              h3: ({ children }) => (
                <h4 style={{ marginTop: '20px', marginBottom: '8px', color: '#555' }}>
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p style={{ marginBottom: '16px' }}>
                  {children}
                </p>
              )
            }}
          >
            {finalContent}
          </ReactMarkdown>
        </div>
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

  const handleVoteOnTitle = async (rating: 1 | -1) => {
    if (!titleTurnId) return
    try {
      await vote(titleTurnId, rating, rating === 1 ? 'Good title' : 'Title needs work')
      setTitleVote(rating)
    } catch (error) {
      // Sanitize error logging to prevent exposure of sensitive information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Failed to record title vote:', errorMessage)
    }
  }

  const handleVoteOnPolish = async (rating: 1 | -1) => {
    if (!polishTurnId) return
    try {
      await vote(polishTurnId, rating, rating === 1 ? 'Good polish' : 'Polish needs work')
      setPolishVote(rating)
    } catch (error) {
      // Sanitize error logging to prevent exposure of sensitive information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Failed to record polish vote:', errorMessage)
    }
  }

  const handleCompleteWorkflow = async () => {
    try {
      onComplete()
    } catch (error) {
      // Sanitize error logging to prevent exposure of sensitive information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Failed to complete workflow:', errorMessage)
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