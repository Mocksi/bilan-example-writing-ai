'use client'

import { aiClient } from './ai-client'
import { trackTurn, startConversation, endConversation } from './bilan'
import { createUserId, type UserId } from '../types'

/**
 * Client-side CopilotKit runtime using WebLLM
 * 
 * This runtime runs entirely in the browser, using WebLLM for local AI inference
 * without any server-side API calls. It integrates with Bilan for analytics tracking.
 */

interface CopilotMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface CopilotRequest {
  messages: CopilotMessage[]
  stream?: boolean
}

interface CopilotResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: 'assistant'
      content: string
    }
    finish_reason: 'stop'
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

let conversationId: string | null = null
let userId: UserId | null = null

/**
 * Initialize the WebLLM CopilotKit runtime
 */
export async function initializeWebLLMRuntime() {
  // Generate user ID for analytics
  if (!userId) {
    userId = createUserId(`user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`)
  }

  // Ensure WebLLM client is initialized
  const status = aiClient.getStatus()
  if (!status.isInitialized && !status.isLoading) {
    console.log('🤖 Initializing WebLLM for CopilotKit runtime...')
    await aiClient.initialize()
  }

  console.log('🤖 WebLLM CopilotKit runtime ready')
}

/**
 * Handle chat completions using WebLLM
 */
export async function handleChatCompletion(request: CopilotRequest): Promise<CopilotResponse> {
  console.log('🤖 WebLLM Runtime - Processing chat completion:', {
    messageCount: request.messages.length,
    stream: request.stream
  })

  // Ensure runtime is initialized
  await initializeWebLLMRuntime()

  // Start conversation if this is the first message
  if (!conversationId && userId) {
    conversationId = await startConversation({
      topic: 'chat_conversation',
      userIntent: 'chat_interface',
      source: 'copilotkit_chat'
    })
    console.log('🤖 Started conversation:', conversationId)
  }

  // Build conversation context
  let conversationContext = ''
  let systemPrompt = ''
  
  request.messages.forEach((message) => {
    if (message.role === 'system') {
      systemPrompt = message.content
    } else if (message.role === 'user') {
      conversationContext += `User: ${message.content}\n`
    } else if (message.role === 'assistant') {
      conversationContext += `Assistant: ${message.content}\n`
    }
  })

  // Get the last user message
  const userMessages = request.messages.filter((m) => m.role === 'user')
  const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''

  // Build enhanced prompt
  const enhancedPrompt = [
    systemPrompt && `System: ${systemPrompt}`,
    conversationContext && `Context:\n${conversationContext}`,
    `Current request: ${lastUserMessage}`
  ].filter(Boolean).join('\n\n')

  console.log('🤖 Generating response with WebLLM...')
  const startTime = Date.now()

  try {
    // Use Bilan trackTurn to wrap the AI generation
    const { result, turnId } = await trackTurn(
      lastUserMessage,
      async () => {
        const response = await aiClient.generateContent(enhancedPrompt, {
          maxLength: 200,
          temperature: 0.7,
          topP: 0.9
        })
        return response.text
      },
      {
        // Core SDK fields
        model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
        modelUsed: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
        provider: 'webllm',
        context: 'copilot_chat',
        
        // Conversation metadata
        conversation_id: conversationId || undefined,
        session_type: 'conversation',
        feature: 'chat_interface',
        
        // User interaction context
        user_intent: 'chat_conversation',
        content_type: 'general',
        
        // Timing for dashboard
        request_timestamp: startTime,
        
        // Additional metadata
        model_version: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
        message_count: request.messages.length,
        is_continuation: request.messages.length > 1
      }
    )

    const responseTime = Date.now() - startTime

    console.log('🤖 WebLLM response generated:', {
      responseLength: result.length,
      responseTime,
      turnId
    })

    // Return OpenAI-compatible response
    const completionResponse: CopilotResponse = {
      id: `chatcmpl-${turnId}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: result
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: enhancedPrompt.length,
        completion_tokens: result.length,
        total_tokens: enhancedPrompt.length + result.length
      }
    }

    return completionResponse
  } catch (error) {
    console.error('🤖 WebLLM Runtime - Error generating response:', error)
    throw error
  }
}

/**
 * End the current conversation
 */
export async function endCurrentConversation() {
  if (conversationId) {
    console.log('🤖 Ending conversation:', conversationId)
    await endConversation(conversationId, 'completed')
    conversationId = null
  }
}

/**
 * Get the current runtime status
 */
export function getRuntimeStatus() {
  const aiStatus = aiClient.getStatus()
  return {
    isReady: aiStatus.isInitialized,
    isLoading: aiStatus.isLoading,
    model: aiStatus.model,
    conversationId,
    userId: userId?.toString(),
    error: aiStatus.error
  }
} 