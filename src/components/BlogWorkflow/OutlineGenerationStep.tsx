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
  Divider,
  Badge,
  Paper,
  ActionIcon,
  Loader
} from '@mantine/core'
import { generateContentForType } from '../../lib/ai-client'
import { trackTurn, vote } from '../../lib/bilan'
import type { TopicExplorationData } from './TopicExplorationStep'

export interface OutlineGenerationData {
  outline: string
  sections: Array<{ title: string; description: string }>
  estimatedWordCount: number
  generatedAt: number
}

export interface OutlineGenerationStepProps {
  journeyId: string
  topicData?: TopicExplorationData
  onComplete: (data: OutlineGenerationData) => void
}

interface OutlineSection {
  title: string
  description: string
}

export function OutlineGenerationStep({ journeyId, topicData, onComplete }: OutlineGenerationStepProps) {
  const [outline, setOutline] = useState('')
  const [sections, setSections] = useState<OutlineSection[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [isAutoGenerating, setIsAutoGenerating] = useState(false)
  const [estimatedWordCount, setEstimatedWordCount] = useState(0)
  const [turnId, setTurnId] = useState<string>('')
  const [userVote, setUserVote] = useState<1 | -1 | null>(null)

  // Auto-generate outline when component mounts if we have topic data
  useEffect(() => {
    if (topicData && !hasGenerated && !isGenerating) {
      setIsAutoGenerating(true)
      handleGenerateOutline()
    }
  }, [topicData, hasGenerated, isGenerating])

  const buildOutlinePrompt = () => {
    if (!topicData) {
      return 'Please create a detailed blog post outline.'
    }

    return `Create a comprehensive blog post outline based on the following topic exploration:

Topic: ${topicData.topic}
Target Audience: ${topicData.audience}
Tone: ${topicData.tone}
Key Points to Cover: ${topicData.keyPoints.join(', ')}

${topicData.conversationHistory ? `
Previous Topic Discussion:
${topicData.conversationHistory.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n\n')}
` : ''}

Please create a detailed outline that:
1. Has a compelling introduction that hooks the reader
2. Logically organizes the key points into 3-5 main sections
3. Includes practical examples and actionable insights
4. Has a strong conclusion with key takeaways
5. Is appropriate for the target audience and tone

Format your response as:

OUTLINE:
[Detailed outline with main points and subpoints]

SECTIONS:
1. Section Title | Brief description of what this section covers
2. Section Title | Brief description of what this section covers
[Continue for each section...]

ESTIMATED_WORD_COUNT: [Provide an estimate for the full blog post]`
  }

  const handleGenerateOutline = async () => {
    setIsGenerating(true)
    
    try {
      const prompt = buildOutlinePrompt()
      
      // Track the outline generation turn
      const { result, turnId: generatedTurnId } = await trackTurn(
        topicData ? `Generate outline for: ${topicData.topic}` : 'Generate blog outline',
        () => generateContentForType('blog', prompt),
        {
          contentType: 'blog',
          iterationNumber: 1,
          journey_id: journeyId,
          journey_step: 'outline-generation',
          userIntent: 'outline-generation',
          topicData: topicData ? {
            topic: topicData.topic,
            audience: topicData.audience,
            keyPoints: topicData.keyPoints
          } : undefined
        }
      )

      setTurnId(generatedTurnId)
      
      // Parse the AI response
      const responseText = result.text
      const lines = responseText.split('\n')
      
      let outlineText = ''
      let sectionsData: OutlineSection[] = []
      let wordCount = 800 // Default estimate
      
      let currentSection = ''
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        
        if (trimmedLine.startsWith('OUTLINE:')) {
          currentSection = 'outline'
          continue
        } else if (trimmedLine.startsWith('SECTIONS:')) {
          currentSection = 'sections'
          continue
        } else if (trimmedLine.startsWith('ESTIMATED_WORD_COUNT:')) {
          const countMatch = trimmedLine.match(/(\d+)/)
          if (countMatch) {
            wordCount = parseInt(countMatch[1])
          }
          continue
        }
        
        if (currentSection === 'outline' && trimmedLine) {
          outlineText += line + '\n'
        } else if (currentSection === 'sections' && trimmedLine) {
          // Parse section format: "Number. Title | Description"
          const sectionMatch = trimmedLine.match(/^\d+\.\s*(.+?)\s*\|\s*(.+)$/)
          if (sectionMatch) {
            sectionsData.push({
              title: sectionMatch[1].trim(),
              description: sectionMatch[2].trim()
            })
          }
        }
      }
      
      // If parsing failed, extract sections from outline text
      if (sectionsData.length === 0 && outlineText) {
        const outlineLines = outlineText.split('\n').filter(line => line.trim())
        const sectionLines = outlineLines.filter(line => 
          line.match(/^\d+\./) || line.match(/^[A-Z]\./) || line.match(/^[IVX]+\./)
        )
        
        sectionsData = sectionLines.slice(0, 6).map((line, index) => ({
          title: line.replace(/^\d+\.\s*|^[A-Z]\.\s*|^[IVX]+\.\s*/, '').trim(),
          description: `Section ${index + 1} content`
        }))
      }
      
      setOutline(outlineText.trim())
      setSections(sectionsData)
      setEstimatedWordCount(wordCount)
      setHasGenerated(true)
      
    } catch (error) {
      console.error('Failed to generate outline:', error)
      
      // Provide fallback outline
      const fallbackOutline = `Blog Post Outline for: ${topicData?.topic || 'Your Topic'}

1. Introduction
   - Hook to capture reader attention
   - Brief overview of the topic
   - Preview of key points

2. Main Content Sections
   ${topicData?.keyPoints.map((point, i) => `- ${point}`).join('\n   ') || '- Key point 1\n   - Key point 2\n   - Key point 3'}

3. Conclusion
   - Summary of main points
   - Call to action or next steps
   - Final thoughts`
      
      setOutline(fallbackOutline)
      setSections([
        { title: 'Introduction', description: 'Hook and overview of the topic' },
        { title: 'Main Content', description: 'Core points and detailed discussion' },
        { title: 'Conclusion', description: 'Summary and call to action' }
      ])
      setEstimatedWordCount(800)
      setHasGenerated(true)
    } finally {
      setIsGenerating(false)
      setIsAutoGenerating(false)
    }
  }

  const handleVote = async (rating: 1 | -1) => {
    if (!turnId) return
    
    try {
      await vote(turnId, rating, rating === 1 ? 'Helpful outline' : 'Could be better')
      setUserVote(rating)
    } catch (error) {
      console.error('Failed to record vote:', error)
    }
  }

  const handleRegenerateOutline = () => {
    setHasGenerated(false)
    setOutline('')
    setSections([])
    setTurnId('')
    setUserVote(null)
    handleGenerateOutline()
  }

  const handleEditOutline = (newOutline: string) => {
    setOutline(newOutline)
    
    // Try to extract sections from edited outline
    const lines = newOutline.split('\n').filter(line => line.trim())
    const sectionLines = lines.filter(line => 
      line.match(/^\d+\./) || line.match(/^[A-Z]\./) || line.match(/^[IVX]+\./)
    )
    
    if (sectionLines.length > 0) {
      const updatedSections = sectionLines.slice(0, 6).map((line, index) => ({
        title: line.replace(/^\d+\.\s*|^[A-Z]\.\s*|^[IVX]+\.\s*/, '').trim(),
        description: sections[index]?.description || `Section ${index + 1} content`
      }))
      setSections(updatedSections)
    }
  }

  const handleComplete = () => {
    if (!outline.trim()) return

    const outlineData: OutlineGenerationData = {
      outline: outline.trim(),
      sections,
      estimatedWordCount,
      generatedAt: Date.now()
    }

    onComplete(outlineData)
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={3} mb="xs">Outline Generation</Title>
        <Text c="dimmed" size="sm">
          Create a structured outline for your blog post. This will serve as the blueprint for your content.
        </Text>
      </div>

      {/* Topic Summary */}
      {topicData && (
        <Card withBorder p="md" bg="blue.0">
          <Text fw={500} mb="sm">Topic Summary</Text>
          <Group gap="xs" mb="sm">
            <Badge variant="light" color="blue">Topic</Badge>
            <Text size="sm">{topicData.topic}</Text>
          </Group>
          <Group gap="xs" mb="sm">
            <Badge variant="light" color="green">Audience</Badge>
            <Text size="sm">{topicData.audience}</Text>
          </Group>
          <Group gap="xs" mb="sm">
            <Badge variant="light" color="orange">Tone</Badge>
            <Text size="sm" tt="capitalize">{topicData.tone}</Text>
          </Group>
          <Group gap="xs">
            <Badge variant="light" color="purple">Key Points</Badge>
            <Text size="sm">{topicData.keyPoints.join(', ')}</Text>
          </Group>
        </Card>
      )}

      {/* Auto-generation indicator */}
      {isAutoGenerating && (
        <Alert color="blue" title="Generating Outline">
          <Group gap="sm">
            <Loader size="sm" />
            <Text size="sm">Creating your blog outline based on the topic exploration...</Text>
          </Group>
        </Alert>
      )}

      {/* Generated Outline */}
      {hasGenerated && (
        <>
          <Card withBorder p="md">
            <Group justify="space-between" mb="md">
              <Text fw={500}>Generated Outline</Text>
              <Group gap="sm">
                <Text size="xs" c="dimmed">~{estimatedWordCount} words</Text>
                {/* Vote buttons */}
                {turnId && (
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant={userVote === 1 ? 'filled' : 'light'}
                      color="green"
                      onClick={() => handleVote(1)}
                    >
                      👍 Good
                    </Button>
                    <Button
                      size="xs"
                      variant={userVote === -1 ? 'filled' : 'light'}
                      color="red"
                      onClick={() => handleVote(-1)}
                    >
                      👎 Not helpful
                    </Button>
                  </Group>
                )}
                <Button
                  size="xs"
                  variant="light"
                  onClick={handleRegenerateOutline}
                  loading={isGenerating}
                >
                  Regenerate
                </Button>
              </Group>
            </Group>

            <Textarea
              value={outline}
              onChange={(e) => handleEditOutline(e.target.value)}
              minRows={12}
              maxRows={20}
              placeholder="Your blog outline will appear here..."
              styles={{
                input: {
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: 1.5
                }
              }}
            />
          </Card>

          {/* Section Breakdown */}
          {sections.length > 0 && (
            <Card withBorder p="md">
              <Text fw={500} mb="md">Section Breakdown</Text>
              <Stack gap="sm">
                {sections.map((section, index) => (
                  <Paper key={index} p="sm" withBorder bg="gray.0">
                    <Group justify="space-between" align="flex-start">
                      <div style={{ flex: 1 }}>
                        <Text fw={500} size="sm" mb="xs">
                          {index + 1}. {section.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {section.description}
                        </Text>
                      </div>
                      <Badge size="xs" color="gray">
                        Section {index + 1}
                      </Badge>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Card>
          )}
        </>
      )}

      {/* Generate Button (if not auto-generated) */}
      {!hasGenerated && !isAutoGenerating && (
        <Card withBorder p="md" ta="center">
          <Text c="dimmed" mb="md">
            {topicData 
              ? "Click below to generate your blog outline based on your topic exploration."
              : "Click below to generate a blog outline. (For best results, complete topic exploration first.)"
            }
          </Text>
          <Button
            onClick={handleGenerateOutline}
            loading={isGenerating}
            size="md"
          >
            Generate Outline
          </Button>
        </Card>
      )}

      {/* Action Buttons */}
      <Group justify="space-between">
        <div>
          {/* Could add outline template options here */}
        </div>
        
        <Button 
          onClick={handleComplete}
          disabled={!outline.trim()}
          size="md"
        >
          Complete Outline Generation
        </Button>
      </Group>

      {!outline.trim() && hasGenerated && (
        <Alert color="yellow" title="Outline Required">
          Please generate or enter a blog outline to continue to the next step.
        </Alert>
      )}
    </Stack>
  )
} 