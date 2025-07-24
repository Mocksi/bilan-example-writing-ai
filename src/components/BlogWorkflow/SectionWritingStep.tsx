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
  Progress,
  ActionIcon,
  Modal
} from '@mantine/core'
import { generateContentForType } from '../../lib/ai-client'
import { startConversation, endConversation, trackTurn, vote } from '../../lib/bilan'
import type { TopicExplorationData } from './TopicExplorationStep'
import type { OutlineGenerationData } from './OutlineGenerationStep'

/**
 * Data structure containing the completed section writing results and metadata
 * 
 * This interface represents the output of the section writing step in the blog
 * creation workflow. It contains an array of individual sections with their
 * content, completion status, and creation method, along with aggregate statistics
 * for the entire blog post.
 * 
 * @interface SectionWritingData
 * @property {Array<object>} sections - Array of individual blog post sections
 * @property {string} sections[].title - The section heading/title extracted from the outline
 * @property {string} sections[].content - The written content for this section (may be empty for drafts)
 * @property {'draft' | 'complete'} sections[].status - Completion status indicating if section has content
 * @property {number} sections[].wordCount - Number of words in the section content
 * @property {'ai-generated' | 'conversation' | 'manual'} sections[].method - Creation method used for this section
 * @property {string} [sections[].conversationId] - Optional Bilan conversation ID if created through chat interface
 * @property {number} totalWordCount - Sum of word counts across all completed sections
 * @property {number} completedAt - Unix timestamp when the section writing step was completed
 */
export interface SectionWritingData {
  sections: Array<{ 
    title: string
    content: string
    status: 'draft' | 'complete'
    wordCount: number
    method: 'ai-generated' | 'conversation' | 'manual'
    conversationId?: string
  }>
  totalWordCount: number
  completedAt: number
}

/**
 * Props interface for the SectionWritingStep component
 * 
 * Defines the required inputs for the section writing step of the blog workflow.
 * This component takes topic and outline data from previous steps and provides
 * multiple methods for users to create content for each section of their blog post.
 * 
 * @interface SectionWritingStepProps
 * @property {string} journeyId - Unique identifier for the current blog creation journey (for Bilan analytics tracking)
 * @property {TopicExplorationData} [topicData] - Optional topic data from step 1 containing user's topic, audience, tone, and key points
 * @property {OutlineGenerationData} [outlineData] - Optional outline data from step 2 containing structured sections to be written
 * @property {function} onComplete - Callback function invoked when section writing is complete, receives SectionWritingData with all section results
 */
export interface SectionWritingStepProps {
  journeyId: string
  topicData?: TopicExplorationData
  outlineData?: OutlineGenerationData
  onComplete: (data: SectionWritingData) => void
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  turnId?: string
}

interface SectionState {
  title: string
  content: string
  status: 'draft' | 'complete'
  method: 'ai-generated' | 'conversation' | 'manual'
  conversationId?: string
  conversationMessages?: ConversationMessage[]
  isGenerating: boolean
  wordCount: number
  turnId?: string
  userVote?: 1 | -1 | null
}

export function SectionWritingStep({ journeyId, topicData, outlineData, onComplete }: SectionWritingStepProps) {
  const [sections, setSections] = useState<SectionState[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [currentInput, setCurrentInput] = useState('')
  const [showConversationModal, setShowConversationModal] = useState(false)
  const [conversationalSectionIndex, setConversationalSectionIndex] = useState<number | null>(null)

  // Initialize sections from outline data
  useEffect(() => {
    if (outlineData && sections.length === 0) {
      const initialSections: SectionState[] = outlineData.sections.map(section => ({
        title: section.title,
        content: '',
        status: 'draft' as const,
        method: 'ai-generated' as const,
        isGenerating: false,
        wordCount: 0
      }))
      
      setSections(initialSections)
      setActiveSection(initialSections[0]?.title || null)
    }
  }, [outlineData, sections.length])

  /**
   * Constructs a comprehensive AI prompt for generating individual blog post sections
   * 
   * This function builds a detailed, context-rich prompt that provides the AI with all
   * necessary information to generate high-quality section content. The prompt includes
   * blog context, section specifications, writing guidelines, and continuity information
   * from previously written sections to ensure coherent flow throughout the blog post.
   * 
   * @function buildSectionPrompt
   * @param {string} sectionTitle - The title/heading of the section to be written (from outline)
   * @param {number} sectionIndex - Zero-based index of the section in the outline array
   * @returns {string} A formatted prompt string optimized for AI section generation
   * 
   * @description
   * The function constructs a multi-part prompt containing:
   * 
   * **Context Information:**
   * - Blog topic, target audience, and desired tone from topic exploration
   * - Complete outline for structural understanding
   * - Section-specific title and description from outline data
   * - Key points to consider throughout the content
   * 
   * **Continuity Features:**
   * - Previous sections content (first 200 chars) for flow consistency
   * - Only included for non-first sections to maintain narrative coherence
   * - Helps AI understand what's already been covered
   * 
   * **Writing Instructions:**
   * - 6-point checklist for section quality and structure
   * - Word count guidance (200-400 words)
   * - Tone and style consistency requirements
   * - Practical examples and actionable content directives
   * 
   * **Data Dependencies:**
   * - Relies on `topicData` from TopicExplorationStep for context
   * - Uses `outlineData` from OutlineGenerationStep for section structure
   * - Accesses current `sections` state for continuity information
   * - Gracefully handles missing data with fallback values
   * 
   * **Output Format:**
   * - Instructs AI to write only section content (no headers/numbering)
   * - Ensures content flows naturally with existing sections
   * - Optimized for blog post reading experience
   * 
   * @example
   * ```typescript
   * // Generate prompt for second section
   * const prompt = buildSectionPrompt("Benefits of AI in Healthcare", 1)
   * // Returns: "Write a detailed section for a blog post with the following context:
   * //           Blog Topic: AI in Healthcare...
   * //           Previous Sections Written: 1. Introduction: Healthcare is transforming..."
   * ```
   */
  const buildSectionPrompt = (sectionTitle: string, sectionIndex: number) => {
    const section = outlineData?.sections[sectionIndex]
    
    return `Write a detailed section for a blog post with the following context:

Blog Topic: ${topicData?.topic || 'Blog topic'}
Target Audience: ${topicData?.audience || 'General audience'}
Tone: ${topicData?.tone || 'professional'}
Overall Outline: ${outlineData?.outline || 'No outline provided'}

Section to Write: ${sectionTitle}
Section Description: ${section?.description || 'No description provided'}

${topicData?.keyPoints && topicData.keyPoints.length > 0 ? `
Key Points to Consider: ${topicData.keyPoints.join(', ')}
` : ''}

${outlineData && sectionIndex > 0 ? `
Previous Sections Written:
${sections.slice(0, sectionIndex).map((s, i) => `${i + 1}. ${s.title}: ${s.content.substring(0, 200)}...`).join('\n')}
` : ''}

Please write a comprehensive section that:
1. Flows naturally from the previous content
2. Addresses the section topic thoroughly
3. Maintains the specified tone and style
4. Includes practical examples where appropriate
5. Is approximately 200-400 words
6. Connects smoothly to the next section

Write only the section content without section headers or numbering.`
  }

  const handleGenerateSection = async (sectionIndex: number) => {
    const section = sections[sectionIndex]
    if (!section) return

    setSections(prev => prev.map((s, i) => 
      i === sectionIndex 
        ? { ...s, isGenerating: true, method: 'ai-generated' }
        : s
    ))

    try {
      const prompt = buildSectionPrompt(section.title, sectionIndex)
      
      const { result, turnId } = await trackTurn(
        `Generate section: ${section.title}`,
        () => generateContentForType('blog', prompt),
        {
          contentType: 'blog',
          iterationNumber: 1,
          journey_id: journeyId,
          journey_step: 'section-writing',
          userIntent: 'section-generation',
          sectionTitle: section.title,
          sectionIndex
        }
      )

      const content = result.text.trim()
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length

      setSections(prev => prev.map((s, i) => 
        i === sectionIndex 
          ? { 
              ...s, 
              content,
              wordCount,
              status: 'complete',
              isGenerating: false,
              method: 'ai-generated',
              turnId
            }
          : s
      ))

    } catch (error) {
      console.error('Failed to generate section:', error)
      
      setSections(prev => prev.map((s, i) => 
        i === sectionIndex 
          ? { ...s, isGenerating: false }
          : s
      ))
    }
  }

  /**
   * Initiates a conversational interface for developing a specific blog post section
   * 
   * This async function sets up a Bilan-tracked conversation session focused on
   * collaboratively developing content for a single blog section. It creates the
   * conversation infrastructure, provides contextual initial messaging, updates
   * the section's state to conversation mode, and opens the chat interface for
   * interactive content development.
   * 
   * @async
   * @function handleStartConversation
   * @param {number} sectionIndex - Zero-based index of the section to start conversation for
   * @returns {Promise<void>} Promise that resolves when conversation setup is complete
   * 
   * @description
   * **Process Flow:**
   * 1. **Validation**: Checks that the specified section exists in the sections array
   * 2. **Bilan Integration**: Creates a new conversation via startConversation() with metadata
   * 3. **Initial Message**: Generates contextual AI greeting with section-specific guidance
   * 4. **State Updates**: Updates section method to 'conversation' and stores conversation data
   * 5. **UI Activation**: Opens the conversation modal and sets active conversation context
   * 6. **Error Handling**: Gracefully handles conversation creation failures
   * 
   * **Bilan Conversation Setup:**
   * - Creates conversation with journeyId for analytics correlation
   * - Sets topic to `section-writing-${sectionTitle}` for identification
   * - Includes contentType 'blog' for proper categorization
   * - Conversation ID stored for subsequent turn tracking
   * 
   * **Initial AI Message Structure:**
   * - Welcomes user to collaborative section development
   * - Provides section title and description context
   * - Offers specific starting points and approaches
   * - Encourages user engagement with open-ended questions
   * 
   * **Section State Changes:**
   * - Updates `method` from default to 'conversation'
   * - Stores `conversationId` for Bilan turn correlation
   * - Initializes `conversationMessages` array with AI greeting
   * - Maintains all other section properties (title, content, status)
   * 
   * **UI State Management:**
   * - Sets `conversationalSectionIndex` to track active conversation
   * - Shows conversation modal (`setShowConversationModal(true)`)
   * - Enables message input and conversation interface
   * 
   * **Error Recovery:**
   * - Logs conversation creation errors for debugging
   * - Fails gracefully without affecting other sections
   * - User can retry or use alternative content creation methods
   * 
   * @example
   * ```typescript
   * // Start conversation for the second section (index 1)
   * await handleStartConversation(1)
   * // Result: Opens chat modal for "Benefits of AI" section with contextual AI greeting
   * ```
   */
  const handleStartConversation = async (sectionIndex: number) => {
    const section = sections[sectionIndex]
    if (!section) return

    try {
      const conversationId = await startConversation({
        journeyId,
        topic: `section-writing-${section.title}`,
        contentType: 'blog'
      })

      if (conversationId) {
        // Add initial AI message
        const initialMessage: ConversationMessage = {
          role: 'assistant',
          content: `Let's work on the "${section.title}" section together. I'll help you develop this part of your blog post through our conversation.

Based on your topic and outline, this section should cover: ${outlineData?.sections[sectionIndex]?.description || 'the main points for this section'}.

What specific aspect of "${section.title}" would you like to explore first? Or would you like me to suggest some approaches?`,
          timestamp: Date.now()
        }

        setSections(prev => prev.map((s, i) => 
          i === sectionIndex 
            ? { 
                ...s, 
                method: 'conversation',
                conversationId,
                conversationMessages: [initialMessage]
              }
            : s
        ))

        setConversationalSectionIndex(sectionIndex)
        setShowConversationModal(true)
      }
    } catch (error) {
      console.error('Failed to start section conversation:', error)
    }
  }

  const handleSendMessage = async () => {
    // ========================================
    // STEP 1: INPUT VALIDATION AND GUARDS
    // ========================================
    // Ensure we have valid user input (not empty/whitespace) and an active conversation
    if (!currentInput.trim() || conversationalSectionIndex === null) return

    // Get the section and conversation details for the active conversation
    const sectionIndex = conversationalSectionIndex
    const section = sections[sectionIndex]
    
    // Ensure section exists and has a valid Bilan conversation ID
    if (!section || !section.conversationId) return

    // ========================================
    // STEP 2: USER MESSAGE CREATION AND STATE UPDATE
    // ========================================
    // Create user message object with current timestamp for conversation history
    const userMessage: ConversationMessage = {
      role: 'user',
      content: currentInput,
      timestamp: Date.now()
    }

    // Update section state: add user message to conversation and set loading state
    setSections(prev => prev.map((s, i) => 
      i === sectionIndex 
        ? { 
            ...s, 
            conversationMessages: [...(s.conversationMessages || []), userMessage],
            isGenerating: true  // Show loading indicator while AI processes
          }
        : s
    ))

    // Clear input field for next user message
    setCurrentInput('')

    try {
      // ========================================
      // STEP 3: PROMPT CONSTRUCTION WITH CONTEXT
      // ========================================
      // Build complete conversation history including the new user message
      const conversationHistory = [...(section.conversationMessages || []), userMessage]
      
      // Format conversation history for AI context (User: message, Assistant: response)
      const conversationContext = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n')

      // Construct comprehensive prompt with blog context and conversation history
      const prompt = `You are helping a user write the "${section.title}" section of their blog post through conversation. 

Blog Context:
- Topic: ${topicData?.topic || 'Blog topic'}
- Audience: ${topicData?.audience || 'General audience'}
- Tone: ${topicData?.tone || 'professional'}
- Section Description: ${outlineData?.sections[sectionIndex]?.description || 'No description'}

Conversation so far:
${conversationContext}

Please respond as a helpful writing coach by:
1. Addressing the user's question or input
2. Asking follow-up questions to develop ideas
3. Suggesting specific content or examples
4. Helping refine the section content
5. When the user seems ready, offering to generate draft content based on the discussion

Keep responses focused on developing this specific section of the blog post.`

      // ========================================
      // STEP 4: AI CONTENT GENERATION WITH BILAN TRACKING
      // ========================================
      // Generate AI response using trackTurn for Bilan analytics integration
      const { result, turnId } = await trackTurn(
        currentInput,  // User's message as the turn prompt
        () => generateContentForType('blog', prompt),  // AI generation function
        {
          // Comprehensive metadata for Bilan analytics
          contentType: 'blog',
          iterationNumber: conversationHistory.length / 2,  // Approximate turn count
          conversationId: section.conversationId,  // Link to Bilan conversation
          journey_id: journeyId,  // Link to overall blog creation journey
          journey_step: 'section-writing',  // Current workflow step
          userIntent: 'section-conversation',  // Specific interaction type
          sectionTitle: section.title  // Section context for analytics
        }
      )

      // ========================================
      // STEP 5: AI MESSAGE CREATION AND STATE UPDATE
      // ========================================
      // Create AI response message with turnId for potential voting
      const aiMessage: ConversationMessage = {
        role: 'assistant',
        content: result.text,
        timestamp: Date.now(),
        turnId  // Store for user feedback/voting functionality
      }

      // Update section state: add both user and AI messages, clear loading state
      setSections(prev => prev.map((s, i) => 
        i === sectionIndex 
          ? { 
              ...s, 
              conversationMessages: [...(s.conversationMessages || []), userMessage, aiMessage],
              isGenerating: false  // Hide loading indicator
            }
          : s
      ))

    } catch (error) {
      // ========================================
      // STEP 6: ERROR HANDLING WITH STATE RESET
      // ========================================
      // Log error for debugging (using secure error message logging)
      console.error('Failed to send message:', error instanceof Error ? error.message : 'Unknown error')
      
      // Reset loading state on error so user can retry
      setSections(prev => prev.map((s, i) => 
        i === sectionIndex 
          ? { ...s, isGenerating: false }
          : s
      ))
      
      // Note: User message remains in conversation history even on AI failure
      // This preserves conversation context for retry attempts
    }
  }

  /**
   * Generates final blog section content by synthesizing conversation messages into polished text
   * 
   * This async function takes the accumulated conversation messages between the user and AI
   * assistant and transforms them into a final, coherent section of blog content. It serves
   * as the culmination of the conversational content development process, creating publication-ready
   * text from the collaborative discussion and ending the associated Bilan conversation.
   * 
   * @async
   * @function handleGenerateFromConversation
   * @param {number} sectionIndex - Zero-based index of the section to generate final content for
   * @returns {Promise<void>} Promise that resolves when content generation and conversation cleanup is complete
   * 
   * @description
   * **Process Flow:**
   * 1. **Validation**: Ensures section exists and has conversation messages to work with
   * 2. **Loading State**: Sets section to generating state for UI feedback
   * 3. **Content Synthesis**: Summarizes conversation into structured prompt for AI
   * 4. **AI Generation**: Creates final polished content via trackTurn with Bilan analytics
   * 5. **Content Processing**: Calculates word count and updates section state
   * 6. **Conversation Cleanup**: Ends Bilan conversation and closes UI modal
   * 7. **Error Recovery**: Handles failures gracefully with state reset
   * 
   * **Conversation Synthesis:**
   * - Aggregates all conversation messages (user + assistant) into summary format
   * - Preserves context and ideas developed during collaborative discussion
   * - Formats as "role: content" pairs for AI comprehension
   * 
   * **AI Prompt Construction:**
   * - Includes blog context (topic, audience, tone) for consistency
   * - Provides complete conversation summary for idea incorporation
   * - Instructs AI to create polished, publication-ready content (200-400 words)
   * - Specifies content-only output (no headers/formatting)
   * 
   * **Bilan Integration:**
   * - Tracks final content generation as a turn with comprehensive metadata
   * - Links to existing conversation via conversationId for analytics correlation
   * - Ends conversation with 'completed' status indicating successful content creation
   * - Records outcome metadata for journey analytics
   * 
   * **Section State Updates:**
   * - Sets final `content` from AI generation result
   * - Calculates and stores `wordCount` for content statistics
   * - Updates `status` to 'complete' indicating section is finished
   * - Clears `isGenerating` flag to hide loading indicators
   * 
   * **UI State Management:**
   * - Closes conversation modal (`setShowConversationModal(false)`)
   * - Clears active conversation reference (`setConversationalSectionIndex(null)`)
   * - Returns user to main section writing interface
   * 
   * **Error Handling:**
   * - Logs generation failures securely (message only)
   * - Resets loading state to allow user retry
   * - Preserves conversation history for manual review or retry
   * - Maintains conversation modal for continued interaction if needed
   * 
   * @example
   * ```typescript
   * // Generate final content for section 2 based on conversation history
   * await handleGenerateFromConversation(1)
   * // Result: Section content updated, conversation ended, modal closed
   * ```
   */
  const handleGenerateFromConversation = async (sectionIndex: number) => {
    const section = sections[sectionIndex]
    if (!section || !section.conversationMessages) return

    setSections(prev => prev.map((s, i) => 
      i === sectionIndex 
        ? { ...s, isGenerating: true }
        : s
    ))

    try {
      const conversationSummary = section.conversationMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n')

      const prompt = `Based on our conversation, generate the final content for the "${section.title}" section of the blog post.

Blog Context:
- Topic: ${topicData?.topic}
- Audience: ${topicData?.audience}
- Tone: ${topicData?.tone}

Our Conversation Summary:
${conversationSummary}

Please generate a polished section (200-400 words) that incorporates the ideas we discussed. Write only the section content without headers.`

      const { result, turnId } = await trackTurn(
        `Generate section from conversation: ${section.title}`,
        () => generateContentForType('blog', prompt),
        {
          contentType: 'blog',
          conversationId: section.conversationId,
          journey_id: journeyId,
          journey_step: 'section-writing',
          userIntent: 'section-from-conversation',
          sectionTitle: section.title
        }
      )

      const content = result.text.trim()
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length

      setSections(prev => prev.map((s, i) => 
        i === sectionIndex 
          ? { 
              ...s, 
              content,
              wordCount,
              status: 'complete',
              isGenerating: false
            }
          : s
      ))

      // End the conversation
      if (section.conversationId) {
        await endConversation(section.conversationId, 'completed', {
          satisfactionScore: 1,
          outcome: 'section-generated'
        })
      }

      setShowConversationModal(false)
      setConversationalSectionIndex(null)

    } catch (error) {
      console.error('Failed to generate section from conversation:', error)
      
      setSections(prev => prev.map((s, i) => 
        i === sectionIndex 
          ? { ...s, isGenerating: false }
          : s
      ))
    }
  }

  /**
   * Handles manual editing of section content with automatic word count and status updates
   * 
   * This function processes user-initiated direct edits to section content through text input
   * fields or text areas, automatically calculating word count, updating section status based
   * on content presence, and marking the section as manually edited. It provides real-time
   * content management for the section writing workflow step.
   * 
   * **Core Functionality:**
   * - Updates section content with user-provided text input
   * - Calculates accurate word count using whitespace splitting and filtering
   * - Automatically determines section status based on content presence
   * - Marks section method as 'manual' to distinguish from AI-generated content
   * - Preserves all other section properties while updating modified fields
   * 
   * **Content Processing:**
   * 1. **Word Count Calculation**: Splits content by whitespace and filters empty strings
   * 2. **Content Assignment**: Updates section content with provided text
   * 3. **Status Determination**: Sets status to 'complete' if content exists, 'draft' if empty
   * 4. **Method Tracking**: Records 'manual' method to track content creation approach
   * 5. **State Update**: Immutably updates sections array preserving other sections
   * 
   * **Status Logic:**
   * The function applies intelligent status determination:
   * - **'complete'**: When content.trim() returns truthy (has meaningful content)
   * - **'draft'**: When content.trim() is falsy (empty or whitespace-only)
   * 
   * **Word Count Algorithm:**
   * Uses robust word counting by:
   * - Splitting content on any whitespace characters (/\s+/ regex)
   * - Filtering out empty strings to avoid counting extra spaces
   * - Providing accurate count for content planning and progress tracking
   * 
   * **State Management:**
   * Updates sections array using immutable pattern:
   * - Maps over existing sections array
   * - Updates only the target section at specified index
   * - Preserves all other section data (title, turnId, etc.)
   * - Maintains React state consistency for proper re-rendering
   * 
   * **Method Tracking Benefits:**
   * Setting method to 'manual' enables:
   * - Analytics tracking of content creation approaches
   * - UI differentiation between manual and AI-generated content
   * - User workflow pattern analysis
   * - Content quality comparison between creation methods
   * 
   * @function handleManualEdit
   * @param {number} sectionIndex - Zero-based index of the section to edit in the sections array
   * @param {string} content - New content text provided by user input (can be empty string)
   * @returns {void} No return value - function performs state updates through setSections
   * 
   * @description
   * **Parameter Details:**
   * - **sectionIndex**: Must be valid array index (0 to sections.length-1) identifying
   *   which section to update. Invalid indices are handled gracefully by React's
   *   array mapping without throwing errors.
   * - **content**: Raw text content from user input, including potential leading/trailing
   *   whitespace. Function handles trimming for status determination while preserving
   *   original content for user editing experience.
   * 
   * **UI Integration:**
   * This function is typically called from:
   * - Textarea onChange events for direct content editing
   * - Rich text editor content change handlers
   * - Form input validation and processing
   * - Real-time content synchronization systems
   * 
   * **Performance Considerations:**
   * The function performs minimal processing (word counting and string operations)
   * making it suitable for real-time editing scenarios like onChange events without
   * causing performance issues or input lag.
   * 
   * **Workflow Integration:**
   * Manual editing integrates seamlessly with other section creation methods:
   * - Preserves section structure and metadata
   * - Maintains compatibility with AI-generated content workflow
   * - Supports mixed content creation approaches within same document
   * - Enables user refinement of AI-generated sections
   * 
   * @example
   * ```typescript
   * // User types in textarea for section 1
   * handleManualEdit(1, "This is my introduction paragraph with several words.")
   * 
   * // Results in section update:
   * // sections[1] = {
   * //   ...previousSectionData,
   * //   content: "This is my introduction paragraph with several words.",
   * //   wordCount: 9,
   * //   status: 'complete',
   * //   method: 'manual'
   * // }
   * 
   * // User clears content
   * handleManualEdit(1, "   ")
   * 
   * // Results in section update:
   * // sections[1] = {
   * //   ...previousSectionData,
   * //   content: "   ",
   * //   wordCount: 0,
   * //   status: 'draft',
   * //   method: 'manual'
   * // }
   * ```
   */
  const handleManualEdit = (sectionIndex: number, content: string) => {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
    
    setSections(prev => prev.map((s, i) => 
      i === sectionIndex 
        ? { 
            ...s, 
            content,
            wordCount,
            status: content.trim() ? 'complete' : 'draft',
            method: 'manual'
          }
        : s
    ))
  }

  const getTotalWordCount = () => {
    return sections.reduce((total, section) => total + section.wordCount, 0)
  }

  const getCompletedSections = () => {
    return sections.filter(section => section.status === 'complete').length
  }

  /**
   * Records user feedback vote on a specific section's AI-generated content
   * 
   * This asynchronous function handles user satisfaction voting for individual blog sections,
   * allowing users to rate the quality and usefulness of AI-generated section content.
   * It integrates with Bilan analytics to track user satisfaction patterns and updates
   * the local section state to reflect the user's feedback for UI display purposes.
   * 
   * **Core Functionality:**
   * - Validates section existence and turnId availability before proceeding with vote
   * - Submits user rating to Bilan analytics with contextual feedback message
   * - Updates local sections state to reflect user vote for immediate UI feedback
   * - Provides standardized feedback messages based on positive/negative ratings
   * - Handles voting failures gracefully without disrupting the user workflow
   * 
   * **Voting Process:**
   * 1. **Section Validation**: Verify section exists at specified index and has valid turnId
   * 2. **Bilan Integration**: Submit vote with rating and contextual feedback message
   * 3. **State Update**: Update sections array to include userVote for UI display
   * 4. **Error Handling**: Log failures securely while maintaining workflow continuity
   * 
   * **Feedback Context:**
   * The function provides standardized feedback messages to give context to the rating:
   * - Positive rating (1): "Helpful section" - indicates content met user expectations
   * - Negative rating (-1): "Could be better" - indicates content needs improvement
   * 
   * **State Management:**
   * Updates the sections array by mapping over existing sections and updating only
   * the target section with the userVote property, preserving all other section data
   * and maintaining immutable state updates for React re-rendering.
   * 
   * **Analytics Integration:**
   * The vote is correlated with the original content generation turnId from Bilan,
   * enabling analysis of:
   * - User satisfaction patterns across different section types
   * - Content quality metrics for AI improvement
   * - User engagement and feedback frequency
   * - Section-specific performance insights
   * 
   * @async
   * @function handleVoteOnSection
   * @param {number} sectionIndex - Zero-based index of the section in the sections array to vote on
   * @param {1 | -1} rating - User satisfaction rating (1 for positive/helpful, -1 for negative/needs improvement)
   * @returns {Promise<void>} Promise that resolves when vote is recorded and state is updated
   * 
   * @throws {Error} Vote submission failures or state update errors are caught and logged securely
   * 
   * @description
   * **Security Considerations:**
   * Error logging is sanitized to prevent exposure of sensitive information such as
   * API credentials, user content, or internal system details while maintaining
   * debugging capability for development and troubleshooting purposes.
   * 
   * **Early Return Conditions:**
   * The function returns early without processing if:
   * - Section at specified index doesn't exist
   * - Section doesn't have a valid turnId (indicating no AI generation occurred)
   * 
   * **UI Integration:**
   * The userVote property added to section state enables:
   * - Visual indication of voted sections in the UI
   * - Prevention of duplicate voting on the same section
   * - User feedback confirmation and interaction history
   * 
   * @example
   * ```typescript
   * // User clicks thumbs up on section 2
   * await handleVoteOnSection(2, 1)
   * // Results in:
   * // - Bilan vote recorded with "Helpful section" message
   * // - sections[2].userVote set to 1
   * // - UI updates to show positive feedback
   * 
   * // User clicks thumbs down on section 0  
   * await handleVoteOnSection(0, -1)
   * // Results in:
   * // - Bilan vote recorded with "Could be better" message
   * // - sections[0].userVote set to -1
   * // - UI updates to show negative feedback
   * ```
   */
  const handleVoteOnSection = async (sectionIndex: number, rating: 1 | -1) => {
    const section = sections[sectionIndex]
    if (!section?.turnId) return
    
    try {
      await vote(section.turnId, rating, rating === 1 ? 'Helpful section' : 'Could be better')
      setSections(prev => prev.map((s, i) => 
        i === sectionIndex ? { ...s, userVote: rating } : s
      ))
    } catch (error) {
      // Sanitize error logging to prevent exposure of sensitive information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Failed to record vote:', errorMessage)
    }
  }

  const handleComplete = () => {
    const completedSections = sections.filter(s => s.status === 'complete')
    
    if (completedSections.length === 0) return

    const sectionData: SectionWritingData = {
      sections: sections.map(section => ({
        title: section.title,
        content: section.content,
        status: section.status,
        wordCount: section.wordCount,
        method: section.method,
        conversationId: section.conversationId
      })),
      totalWordCount: getTotalWordCount(),
      completedAt: Date.now()
    }

    onComplete(sectionData)
  }

  const renderSectionCard = (section: SectionState, index: number) => (
    <Card key={section.title} withBorder p="md" mb="md">
      <Group justify="space-between" mb="sm">
        <div>
          <Text fw={500} size="sm">
            {index + 1}. {section.title}
          </Text>
          <Text size="xs" c="dimmed">
            {outlineData?.sections[index]?.description}
          </Text>
        </div>
        <Group gap="xs">
          <Badge 
            size="xs" 
            color={section.status === 'complete' ? 'green' : 'gray'}
          >
            {section.status === 'complete' ? `${section.wordCount} words` : 'Draft'}
          </Badge>
          <Badge size="xs" variant="light">
            {section.method === 'ai-generated' ? 'AI' : 
             section.method === 'conversation' ? 'Chat' : 'Manual'}
          </Badge>
        </Group>
      </Group>

      {section.content ? (
        <Textarea
          value={section.content}
          onChange={(e) => handleManualEdit(index, e.target.value)}
          minRows={4}
          maxRows={12}
          mb="sm"
          styles={{
            input: { fontSize: '14px', lineHeight: 1.5 }
          }}
        />
      ) : (
        <Text size="sm" c="dimmed" mb="sm" style={{ minHeight: '60px' }}>
          Section content will appear here...
        </Text>
      )}

      <Group gap="sm">
        <Button
          size="xs"
          variant="light"
          onClick={() => handleGenerateSection(index)}
          loading={section.isGenerating}
          disabled={section.isGenerating}
        >
          Generate with AI
        </Button>
        <Button
          size="xs"
          variant="light"
          color="blue"
          onClick={() => handleStartConversation(index)}
          disabled={section.isGenerating}
        >
          Start Conversation
        </Button>
        {section.method === 'conversation' && section.conversationMessages && (
          <Button
            size="xs"
            variant="light"
            color="green"
            onClick={() => handleGenerateFromConversation(index)}
            loading={section.isGenerating}
          >
            Generate from Chat
          </Button>
        )}
      </Group>

      {/* Vote buttons for AI-generated content */}
      {section.turnId && section.status === 'complete' && (
        <Group gap="xs" mt="xs">
          <Text size="xs" c="dimmed">Rate this section:</Text>
          <Button
            size="xs"
            variant={section.userVote === 1 ? 'filled' : 'light'}
            color="green"
            onClick={() => handleVoteOnSection(index, 1)}
          >
            👍 Good
          </Button>
          <Button
            size="xs"
            variant={section.userVote === -1 ? 'filled' : 'light'}
            color="red"
            onClick={() => handleVoteOnSection(index, -1)}
          >
            👎 Not helpful
          </Button>
        </Group>
      )}
    </Card>
  )

  const completedCount = getCompletedSections()
  const totalCount = sections.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <Stack gap="lg">
      <div>
        <Title order={3} mb="xs">Section Writing</Title>
        <Text c="dimmed" size="sm">
          Write each section of your blog post. Choose between AI generation, conversational development, or manual writing.
        </Text>
      </div>

      {/* Progress Overview */}
      <Card withBorder p="md" bg="gray.0">
        <Group justify="space-between" mb="sm">
          <Text fw={500}>Writing Progress</Text>
          <Text size="sm" c="dimmed">
            {completedCount} of {totalCount} sections • {getTotalWordCount()} words total
          </Text>
        </Group>
        <Progress value={progress} size="lg" />
      </Card>

      {/* Sections */}
      <ScrollArea h={600}>
        <Stack gap="md">
          {sections.map((section, index) => renderSectionCard(section, index))}
        </Stack>
      </ScrollArea>

      {/* Conversation Modal */}
      <Modal
        opened={showConversationModal}
        onClose={() => setShowConversationModal(false)}
        title={`Writing: ${conversationalSectionIndex !== null ? sections[conversationalSectionIndex]?.title : ''}`}
        size="lg"
      >
        {conversationalSectionIndex !== null && (
          <Stack gap="md">
            <ScrollArea h={300}>
              <Stack gap="sm">
                {sections[conversationalSectionIndex]?.conversationMessages?.map((message, index) => (
                  <Card 
                    key={index}
                    p="sm"
                    withBorder={message.role === 'user'}
                    bg={message.role === 'user' ? 'blue.0' : 'gray.0'}
                  >
                    <Text size="sm" fw={500} mb="xs" c={message.role === 'user' ? 'blue' : 'dark'}>
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </Text>
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Text>
                  </Card>
                ))}
                
                {sections[conversationalSectionIndex]?.isGenerating && (
                  <Card p="sm" bg="gray.0">
                    <Text size="sm" fw={500} mb="xs" c="dark">AI Assistant</Text>
                    <Text size="sm" c="dimmed">Thinking...</Text>
                  </Card>
                )}
              </Stack>
            </ScrollArea>

            <Group gap="sm">
              <Textarea
                flex={1}
                placeholder="Continue the conversation about this section..."
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                disabled={sections[conversationalSectionIndex]?.isGenerating}
                minRows={2}
                maxRows={4}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || sections[conversationalSectionIndex]?.isGenerating}
                loading={sections[conversationalSectionIndex]?.isGenerating}
              >
                Send
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Action Buttons */}
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Complete at least some sections to continue
        </Text>
        
        <Button 
          onClick={handleComplete}
          disabled={completedCount === 0}
          size="md"
        >
          Complete Section Writing ({completedCount}/{totalCount})
        </Button>
      </Group>

      {completedCount === 0 && (
        <Alert color="yellow" title="Sections Required">
          Please write at least one section to continue to the next step.
        </Alert>
      )}
    </Stack>
  )
} 