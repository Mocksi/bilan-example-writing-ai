import type { NextRequest } from 'next/server'
import { aiClient } from '../../../lib/ai-client'

/**
 * CopilotKit API route with WebLLM backend
 * 
 * This is a simplified implementation that will be enhanced in subsequent commits.
 * Currently provides basic OpenAI-compatible API for CopilotKit integration.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, max_tokens = 200, temperature = 0.7 } = body

    // Initialize AI client
    await aiClient.initialize()

    // Get the last user message
    const userMessages = messages.filter((m: { role: string }) => m.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''

    // Generate response
    const response = await aiClient.generateContent(lastUserMessage, {
      maxLength: max_tokens,
      temperature,
      topP: 0.9
    })

    // Return OpenAI-compatible response
    return new Response(JSON.stringify({
      choices: [{
        message: {
          role: 'assistant',
          content: response.text
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: response.metadata.promptTokens || 0,
        completion_tokens: response.metadata.tokenCount || 0,
        total_tokens: (response.metadata.promptTokens || 0) + (response.metadata.tokenCount || 0)
      },
      model: response.metadata.model
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('CopilotKit API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
} 