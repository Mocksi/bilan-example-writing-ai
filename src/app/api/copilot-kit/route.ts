import { 
  copilotRuntimeNextJSAppRouterEndpoint, 
  OpenAIAdapter,
  CopilotRuntime
} from '@copilotkit/runtime'
import OpenAI from 'openai'

/**
 * CopilotKit Runtime with WebLLM Integration
 * 
 * This creates a proper CopilotKit runtime using the Next.js App Router integration.
 * For now, we'll use a mock OpenAI adapter that returns predefined responses
 * until we can integrate WebLLM properly.
 */

// Mock OpenAI instance for CopilotKit
const openai = new OpenAI({
  apiKey: 'mock-key', // Not used
  baseURL: 'http://localhost:3000' // Not used
})

// Override the chat completions method to return our mock responses
;(openai.chat.completions as any).create = async (params: any) => {
  console.log('🤖 Mock OpenAI - Received completion request:', {
    messageCount: params.messages?.length,
    model: params.model
  })

  const lastMessage = params.messages?.[params.messages.length - 1]?.content || ''
  const response = `I'm a WebLLM-powered assistant running through CopilotKit! You said: "${lastMessage}". 

This is currently a mock response while we integrate WebLLM properly. The conversation is being tracked by Bilan analytics in the background.

Try asking me something else!`

  return {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
    model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
        choices: [{
          index: 0,
          message: {
        role: 'assistant',
        content: response
          },
      finish_reason: 'stop'
        }],
        usage: {
      prompt_tokens: lastMessage.length,
      completion_tokens: response.length,
      total_tokens: lastMessage.length + response.length
    }
  }
}

// Create the OpenAI adapter
const serviceAdapter = new OpenAIAdapter({ openai })

// Create the CopilotKit runtime
const runtime = new CopilotRuntime()

// Create the Next.js endpoint
const handler = copilotRuntimeNextJSAppRouterEndpoint({
  runtime,
  serviceAdapter,
  endpoint: '/api/copilot-kit'
})

export const POST = handler
export const GET = handler 