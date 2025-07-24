import { NextRequest, NextResponse } from 'next/server'
import { aiClient } from '../../../../lib/ai-client'
import { trackTurn } from '../../../../lib/bilan'

export interface QuickActionRequest {
  action: string
  input: string
  userId?: string
}

export interface QuickActionResponse {
  result: string
  turnId: string
  error?: string
}

/**
 * Quick Action API Route
 * 
 * Handles standalone AI actions (quick turns) using WebLLM for local inference.
 * Each request represents a single turn in the Bilan tracking model without
 * conversation or journey context.
 * 
 * Supported actions:
 * - summarize: Create concise summaries
 * - grammar: Fix grammar and improve clarity  
 * - translate: Translate to different languages
 * - brainstorm: Generate creative ideas
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuickActionRequest = await request.json()
    const { action, input, userId = 'demo-user' } = body

    // Validate required fields
    if (!action || !input?.trim()) {
      return NextResponse.json(
        { error: 'Action and input are required' },
        { status: 400 }
      )
    }

    // Validate action type
    const validActions = ['summarize', 'grammar', 'translate', 'brainstorm']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // Build action-specific prompt
    const prompt = buildPromptForAction(action, input.trim())

    // Process with AI and track as standalone turn
    const { result, turnId } = await trackTurn(
      prompt,
      async () => {
        // Generate content using WebLLM
        const response = await aiClient.generateContent(prompt, {
          maxLength: getMaxLengthForAction(action),
          temperature: getTemperatureForAction(action)
        })
        return response.text
      },
      {
        // Standalone turn metadata (no conversation or journey context)
        action_type: action,
        input_length: input.length,
        user_id: userId,
        standalone: true
      }
    )

    return NextResponse.json({
      result,
      turnId
    } satisfies QuickActionResponse)

  } catch (error) {
    console.error('Quick action processing failed:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to process quick action' 
      },
      { status: 500 }
    )
  }
}

/**
 * Build action-specific prompts for different quick actions
 */
function buildPromptForAction(action: string, input: string): string {
  const prompts = {
    summarize: `Please create a concise summary of the following text. Focus on the main points and key information:

${input}

Summary:`,

    grammar: `Please correct the grammar, spelling, and improve the clarity of the following text while maintaining its original meaning and tone:

${input}

Corrected text:`,

    translate: `Please translate the following text. If no target language is specified, translate to English. If the text already appears to be in English, provide a natural and polished version:

${input}

Translation:`,

    brainstorm: `Please generate creative and practical ideas based on the following prompt. Provide diverse suggestions that could be useful:

${input}

Ideas:`
  }

  return prompts[action as keyof typeof prompts] || `Please help with: ${input}`
}

/**
 * Get optimal max length for different action types
 */
function getMaxLengthForAction(action: string): number {
  const lengths = {
    summarize: 300,   // Summaries should be concise
    grammar: 500,     // Grammar fixes can be longer
    translate: 400,   // Translations vary
    brainstorm: 600   // Ideas can be more extensive
  }

  return lengths[action as keyof typeof lengths] || 300
}

/**
 * Get optimal temperature for different action types
 */
function getTemperatureForAction(action: string): number {
  const temperatures = {
    summarize: 0.3,   // More focused for summaries
    grammar: 0.2,     // Very focused for grammar
    translate: 0.1,   // Most focused for translation
    brainstorm: 0.8   // More creative for brainstorming
  }

  return temperatures[action as keyof typeof temperatures] || 0.5
} 