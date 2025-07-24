import { 
  CopilotRuntime, 
  copilotRuntimeNextJSAppRouterEndpoint,
  ServiceAdapter 
} from '@copilotkit/runtime'
import { NextRequest } from 'next/server'
import { aiClient } from '../../../lib/ai-client'

/**
 * CopilotKit API route with WebLLM backend
 * 
 * This route provides the backend for CopilotKit's chat interface,
 * using our existing WebLLM client for local AI inference.
 * 
 * The adapter translates between CopilotKit's expected OpenAI-compatible
 * format and our WebLLM implementation.
 */

class WebLLMServiceAdapter extends ServiceAdapter {
  async process(forwardedProps: any) {
    const { messages, ...options } = forwardedProps

    try {
      // Ensure AI client is initialized
      await aiClient.initialize()
      
      // Build conversation context from messages
      let prompt = ''
      messages.forEach((message: any) => {
        if (message.role === 'user') {
          prompt += `User: ${message.content}\n`
        } else if (message.role === 'assistant') {
          prompt += `Assistant: ${message.content}\n`
        } else if (message.role === 'system') {
          prompt = `${message.content}\n\n${prompt}`
        }
      })
      
      // Get the last user message for generation
      const userMessages = messages.filter((m: any) => m.role === 'user')
      const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''
      
      // Generate response using our AI client
      const response = await aiClient.generateContent(lastUserMessage, {
        maxLength: options.max_tokens || 200,
        temperature: options.temperature || 0.7,
        topP: options.top_p || 0.9
      })
      
      return {
        choices: [{
          message: {
            role: 'assistant' as const,
            content: response.text
          },
          finish_reason: 'stop' as const
        }],
        usage: {
          prompt_tokens: response.metadata.promptTokens || 0,
          completion_tokens: response.metadata.tokenCount || 0,
          total_tokens: (response.metadata.promptTokens || 0) + (response.metadata.tokenCount || 0)
        },
        model: response.metadata.model
      }
    } catch (error) {
      console.error('WebLLM service adapter error:', error)
      throw error
    }
  }
}

const runtime = new CopilotRuntime()
const serviceAdapter = new WebLLMServiceAdapter()

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit'
  })

  return handleRequest(req)
} 