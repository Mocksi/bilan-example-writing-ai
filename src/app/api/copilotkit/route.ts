import type { NextRequest } from 'next/server'
import { aiClient } from '../../../lib/ai-client'

/**
 * CopilotKit API route with WebLLM backend and streaming support
 * 
 * Enhanced implementation with:
 * - Streaming response support for better UX
 * - Progress tracking during model loading  
 * - Real-time turn tracking integration
 * - Better error handling and status reporting
 */

interface StreamingMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  messages: StreamingMessage[]
  max_tokens?: number
  temperature?: number
  stream?: boolean
  user_id?: string
  conversation_id?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json()
    const { 
      messages, 
      max_tokens = 200, 
      temperature = 0.7, 
      stream = false,
      user_id,
      conversation_id 
    } = body

    // Initialize AI client with progress tracking
    const clientStatus = aiClient.getStatus()
    if (!clientStatus.isInitialized) {
      // Return initialization progress for better UX
      if (clientStatus.isLoading) {
        return new Response(JSON.stringify({
          status: 'initializing',
          progress: clientStatus.downloadProgress || 0,
          message: 'Loading AI model... This may take a moment on first use.'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      // Start initialization
      await aiClient.initialize()
    }

    // Build conversation context from message history
    let conversationContext = ''
    let systemPrompt = ''
    
    messages.forEach((message, index) => {
      if (message.role === 'system') {
        systemPrompt = message.content
      } else if (message.role === 'user') {
        conversationContext += `User: ${message.content}\n`
      } else if (message.role === 'assistant') {
        conversationContext += `Assistant: ${message.content}\n`
      }
    })

    // Get the last user message for generation
    const userMessages = messages.filter((m) => m.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''

    // Build enhanced prompt with context
    const enhancedPrompt = [
      systemPrompt && `System: ${systemPrompt}`,
      conversationContext && `Context:\n${conversationContext}`,
      `Current request: ${lastUserMessage}`
    ].filter(Boolean).join('\n\n')

    const startTime = Date.now()

    if (stream) {
      // Streaming response implementation
      const encoder = new TextEncoder()
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Generate response using our AI client
            const response = await aiClient.generateContent(enhancedPrompt, {
              maxLength: max_tokens,
              temperature,
              topP: 0.9
            })

            // Simulate streaming by chunking the response
            const text = response.text
            const chunkSize = Math.max(1, Math.floor(text.length / 20)) // ~20 chunks
            
            for (let i = 0; i < text.length; i += chunkSize) {
              const chunk = text.slice(i, i + chunkSize)
              const streamChunk = {
                choices: [{
                  delta: {
                    content: chunk
                  },
                  finish_reason: i + chunkSize >= text.length ? 'stop' : null
                }],
                model: response.metadata.model
              }
              
              const sseData = `data: ${JSON.stringify(streamChunk)}\n\n`
              controller.enqueue(encoder.encode(sseData))
              
              // Small delay to simulate real streaming
              await new Promise(resolve => setTimeout(resolve, 50))
            }
            
            // Send final completion chunk
            const finalChunk = `data: ${JSON.stringify({ 
              choices: [{ 
                delta: {}, 
                finish_reason: 'stop' 
              }],
              usage: {
                prompt_tokens: response.metadata.promptTokens || 0,
                completion_tokens: response.metadata.tokenCount || 0,
                total_tokens: (response.metadata.promptTokens || 0) + (response.metadata.tokenCount || 0)
              },
              model: response.metadata.model,
              response_time: Date.now() - startTime
            })}\n\n`
            
            controller.enqueue(encoder.encode(finalChunk))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            console.error('Streaming error:', error)
            const errorChunk = `data: ${JSON.stringify({
              error: {
                message: 'Content generation failed',
                type: 'server_error'
              }
            })}\n\n`
            controller.enqueue(encoder.encode(errorChunk))
            controller.close()
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    } else {
      // Non-streaming response
      const response = await aiClient.generateContent(enhancedPrompt, {
        maxLength: max_tokens,
        temperature,
        topP: 0.9
      })

      const responseTime = Date.now() - startTime

      // Return OpenAI-compatible response with enhanced metadata
      const completionResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.metadata.model,
        choices: [{
          index: 0,
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
        // Enhanced metadata for analytics
        metadata: {
          response_time: responseTime,
          model_version: response.metadata.model,
          user_id,
          conversation_id,
          generation_time: response.metadata.generationTime
        }
      }

      return new Response(JSON.stringify(completionResponse), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    }
  } catch (error) {
    console.error('CopilotKit API error:', error)
    
    // Enhanced error response with helpful debugging info
    const errorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        type: 'server_error',
        code: 'api_error'
      },
      status: 'error',
      timestamp: Date.now()
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

// Add CORS support for development
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
} 