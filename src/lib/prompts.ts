/**
 * Prompt engineering system
 * 
 * Provides advanced prompt templates and context injection utilities
 * for optimized content generation across different content types.
 */

import type { ContentType } from '../types'

export interface PromptContext {
  contentType: ContentType
  userBrief: string
  tone?: 'formal' | 'casual' | 'professional' | 'friendly'
  length?: 'short' | 'medium' | 'long'
  audience?: string
  purpose?: string
  previousAttempts?: Array<{
    content: string
    feedback?: string
    rating?: number
  }>
  refinementRequest?: string
}

export interface PromptTemplate {
  systemPrompt: string
  userPromptTemplate: string
  constraints: string[]
  examples?: string[]
}

export interface PromptResult {
  fullPrompt: string
  metadata: {
    template: string
    contextUsed: string[]
    estimatedTokens: number
  }
}

/**
 * Advanced prompt engineering class
 */
export class PromptEngineer {
  private templates: Record<ContentType, PromptTemplate> = {
    blog: {
      systemPrompt: `You are an expert blog writer with years of experience creating engaging, informative content. Your writing style is clear, conversational, and authoritative. You understand how to structure content for maximum reader engagement and SEO optimization.`,
      userPromptTemplate: `Create a blog post about: {userBrief}

Requirements:
- Write an engaging headline (if appropriate)
- Start with a compelling hook that draws readers in
- Use clear, conversational language that's easy to understand
- Include practical insights and actionable advice
- Structure with logical flow and smooth transitions
- End with a strong conclusion that reinforces key points
{toneGuidance}
{lengthGuidance}
{audienceGuidance}
{contextGuidance}

Please write the blog post now:`,
      constraints: [
        'Must have clear introduction, body, and conclusion',
        'Use subheadings for better readability',
        'Include practical, actionable advice',
        'Maintain consistent tone throughout'
      ],
      examples: [
        'How to Build Better Habits: A Science-Based Approach',
        'The Future of Remote Work: Trends and Predictions',
        '5 Essential Tools Every Developer Should Know'
      ]
    },

    email: {
      systemPrompt: `You are an expert email writer who crafts professional, effective emails that get results. You understand email etiquette, know how to be concise while being complete, and can adapt your tone to match the context and relationship.`,
      userPromptTemplate: `Write a professional email about: {userBrief}

Requirements:
- Use appropriate subject line (if needed)
- Get to the point quickly and respectfully
- Use proper email structure and formatting
- Include clear call-to-action when appropriate
- Be concise but complete
- Maintain professional yet approachable tone
{toneGuidance}
{lengthGuidance}
{audienceGuidance}
{contextGuidance}

Please write the email now:`,
      constraints: [
        'Must be concise and to the point',
        'Include clear subject line when appropriate',
        'Use proper email formatting',
        'Include specific call-to-action if needed'
      ],
      examples: [
        'Follow-up after networking event',
        'Project status update to stakeholders',
        'Customer support response'
      ]
    },

    social: {
      systemPrompt: `You are an expert social media content creator who knows how to craft engaging posts that drive interaction. You understand platform-specific best practices, trending formats, and how to capture attention in crowded feeds.`,
      userPromptTemplate: `Create a social media post about: {userBrief}

Requirements:
- Capture attention with the opening line
- Use engaging, conversational language
- Include relevant hashtags when appropriate
- Encourage interaction and engagement
- Fit platform constraints and best practices
- Have a clear message or call-to-action
{toneGuidance}
{lengthGuidance}
{audienceGuidance}
{contextGuidance}

Please create the social media post now:`,
      constraints: [
        'Must be engaging from the first line',
        'Include relevant hashtags',
        'Encourage user interaction',
        'Respect character limits'
      ],
      examples: [
        'Product launch announcement',
        'Behind-the-scenes company culture',
        'Industry insight or tip'
      ]
    }
  }

  /**
   * Generate an optimized prompt based on context
   */
  buildPrompt(context: PromptContext): PromptResult {
    const template = this.templates[context.contentType]
    const contextUsed: string[] = []
    
    const prompt = template.systemPrompt + '\n\n'
    
    // Build the user prompt with context injection
    let userPrompt = template.userPromptTemplate.replace('{userBrief}', context.userBrief)
    
    // Add tone guidance
    if (context.tone) {
      const toneGuidance = this.buildToneGuidance(context.tone, context.contentType)
      userPrompt = userPrompt.replace('{toneGuidance}', `\n\nTone: ${toneGuidance}`)
      contextUsed.push('tone')
    } else {
      userPrompt = userPrompt.replace('{toneGuidance}', '')
    }
    
    // Add length guidance
    if (context.length) {
      const lengthGuidance = this.buildLengthGuidance(context.length, context.contentType)
      userPrompt = userPrompt.replace('{lengthGuidance}', `\n\nLength: ${lengthGuidance}`)
      contextUsed.push('length')
    } else {
      userPrompt = userPrompt.replace('{lengthGuidance}', '')
    }
    
    // Add audience guidance
    if (context.audience) {
      const audienceGuidance = `\n\nTarget Audience: Write for ${context.audience}. Adjust language, examples, and complexity accordingly.`
      userPrompt = userPrompt.replace('{audienceGuidance}', audienceGuidance)
      contextUsed.push('audience')
    } else {
      userPrompt = userPrompt.replace('{audienceGuidance}', '')
    }
    
    // Add context from previous attempts
    const contextGuidance = this.buildContextGuidance(context)
    userPrompt = userPrompt.replace('{contextGuidance}', contextGuidance)
    if (contextGuidance) {
      contextUsed.push('previousAttempts')
    }
    
    const fullPrompt = prompt + userPrompt
    
    return {
      fullPrompt,
      metadata: {
        template: context.contentType,
        contextUsed,
        estimatedTokens: this.estimateTokens(fullPrompt)
      }
    }
  }

  /**
   * Build a refinement prompt for improving existing content
   */
  buildRefinementPrompt(
    originalContent: string,
    feedback: string,
    contentType: ContentType,
    context?: Partial<PromptContext>
  ): PromptResult {
    const template = this.templates[contentType]
    const contextUsed: string[] = ['originalContent', 'feedback']
    
    let prompt = template.systemPrompt + '\n\n'
    prompt += `Please refine the following ${contentType} content based on the user's feedback.\n\n`
    prompt += `Original content:\n${originalContent}\n\n`
    prompt += `User feedback: ${feedback}\n\n`
    
    // Add additional context if provided
    if (context?.tone) {
      prompt += `Tone: ${this.buildToneGuidance(context.tone, contentType)}\n\n`
      contextUsed.push('tone')
    }
    
    if (context?.audience) {
      prompt += `Target Audience: ${context.audience}\n\n`
      contextUsed.push('audience')
    }
    
    prompt += 'Please provide an improved version that addresses the feedback while maintaining the core message:'
    
    return {
      fullPrompt: prompt,
      metadata: {
        template: `${contentType}-refinement`,
        contextUsed,
        estimatedTokens: this.estimateTokens(prompt)
      }
    }
  }

  /**
   * Build tone-specific guidance
   */
  private buildToneGuidance(tone: string, contentType: ContentType): string {
    const toneMap: Record<string, Record<ContentType, string>> = {
      formal: {
        blog: 'Use professional language, avoid contractions, maintain authoritative voice',
        email: 'Use formal business language, proper salutations, respectful tone',
        social: 'Professional but approachable, avoid slang, maintain credibility'
      },
      casual: {
        blog: 'Use conversational language, contractions welcome, friendly and approachable',
        email: 'Friendly but respectful, conversational tone, warm greeting',
        social: 'Relaxed and friendly, use casual language, be personable'
      },
      professional: {
        blog: 'Expert authority, industry terminology, confident and knowledgeable',
        email: 'Business-appropriate, competent tone, clear and direct',
        social: 'Industry expertise, thought leadership, professional insights'
      },
      friendly: {
        blog: 'Warm and welcoming, personal anecdotes, encouraging tone',
        email: 'Warm and personable, show genuine interest, helpful attitude',
        social: 'Approachable and warm, encourage community, be supportive'
      }
    }
    
    return toneMap[tone]?.[contentType] || `Write in a ${tone} tone appropriate for ${contentType} content`
  }

  /**
   * Build length-specific guidance
   */
  private buildLengthGuidance(length: string, contentType: ContentType): string {
    const lengthMap: Record<string, Record<ContentType, string>> = {
      short: {
        blog: 'Keep it concise (300-500 words). Focus on key points, avoid unnecessary details.',
        email: 'Brief and to the point (50-100 words). Essential information only.',
        social: 'Short and punchy (50-100 characters). Maximum impact, minimum words.'
      },
      medium: {
        blog: 'Standard length (800-1200 words). Develop ideas fully with examples.',
        email: 'Comprehensive but focused (150-250 words). Include necessary details.',
        social: 'Standard post length (100-200 characters). Good balance of info and engagement.'
      },
      long: {
        blog: 'In-depth coverage (1500-2500 words). Thorough exploration with examples and analysis.',
        email: 'Detailed explanation (300-500 words). Include background and full context.',
        social: 'Extended post (200-300 characters). Tell a story or provide detailed insight.'
      }
    }
    
    return lengthMap[length]?.[contentType] || `Write a ${length} ${contentType} piece`
  }

  /**
   * Build context guidance from previous attempts
   */
  private buildContextGuidance(context: PromptContext): string {
    let guidance = ''
    
    if (context.previousAttempts && context.previousAttempts.length > 0) {
      guidance += '\n\nPrevious attempts and feedback:'
      
      context.previousAttempts.slice(-2).forEach((attempt, index) => {
        guidance += `\n\nAttempt ${index + 1}: ${attempt.content.substring(0, 200)}...`
        if (attempt.feedback) {
          guidance += `\nFeedback: ${attempt.feedback}`
        }
        if (attempt.rating !== undefined) {
          guidance += `\nRating: ${attempt.rating > 0 ? 'Positive' : 'Negative'}`
        }
      })
      
      guidance += '\n\nPlease create a new version that addresses the previous feedback and improves upon the earlier attempts.'
    }
    
    if (context.refinementRequest) {
      guidance += `\n\nSpecific refinement request: ${context.refinementRequest}`
    }
    
    return guidance
  }

  /**
   * Estimate token count for a prompt
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): ContentType[] {
    return Object.keys(this.templates) as ContentType[]
  }

  /**
   * Get template information
   */
  getTemplateInfo(contentType: ContentType): PromptTemplate | undefined {
    return this.templates[contentType]
  }

  /**
   * Validate prompt context
   */
  validateContext(context: PromptContext): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!context.userBrief || context.userBrief.trim().length === 0) {
      errors.push('User brief is required')
    }
    
    if (!this.templates[context.contentType]) {
      errors.push(`Invalid content type: ${context.contentType}`)
    }
    
    if (context.tone && !['formal', 'casual', 'professional', 'friendly'].includes(context.tone)) {
      errors.push(`Invalid tone: ${context.tone}`)
    }
    
    if (context.length && !['short', 'medium', 'long'].includes(context.length)) {
      errors.push(`Invalid length: ${context.length}`)
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Export a default instance
export const promptEngineer = new PromptEngineer()

/**
 * Convenience function to build a prompt
 */
export const buildPrompt = (context: PromptContext): PromptResult =>
  promptEngineer.buildPrompt(context)

/**
 * Convenience function to build a refinement prompt
 */
export const buildRefinementPrompt = (
  originalContent: string,
  feedback: string,
  contentType: ContentType,
  context?: Partial<PromptContext>
): PromptResult =>
  promptEngineer.buildRefinementPrompt(originalContent, feedback, contentType, context)

/**
 * Convenience function to validate context
 */
export const validatePromptContext = (context: PromptContext) =>
  promptEngineer.validateContext(context) 