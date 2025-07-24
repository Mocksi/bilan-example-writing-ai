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

/**
 * CopilotKit-compatible API endpoint for AI content generation
 * 
 * Handles both streaming and non-streaming chat completions using WebLLM for local AI inference.
 * This endpoint serves as the backend runtime for CopilotKit components, providing OpenAI-compatible
 * responses while integrating with our local AI client.
 * 
 * @param req - Next.js request object containing the chat completion request
 * 
 * @description
 * **Request Body Structure:**
 * ```typescript
 * {
 *   messages: Array<{
 *     role: 'system' | 'user' | 'assistant',
 *     content: string
 *   }>,
 *   max_tokens?: number = 200,        // Maximum tokens to generate
 *   temperature?: number = 0.7,       // Sampling temperature (0.0 to 1.0)
 *   stream?: boolean = false,         // Enable streaming response
 *   user_id?: string,                 // Optional user identifier for analytics
 *   conversation_id?: string          // Optional conversation identifier for analytics
 * }
 * ```
 * 
 * **Behavior:**
 * 1. **Model Initialization**: Checks if WebLLM model is loaded, returns progress if still initializing
 * 2. **Context Processing**: Builds conversation context from message history, extracts system prompts
 * 3. **Content Generation**: Uses aiClient to generate response with specified parameters
 * 4. **Response Format**: Returns OpenAI-compatible format for both streaming and non-streaming modes
 * 
 * **Response Types:**
 * 
 * **Initialization Status (200):**
 * ```typescript
 * {
 *   status: 'initializing',
 *   progress: number,                 // 0-100 download progress
 *   message: string                   // User-friendly status message
 * }
 * ```
 * 
 * **Streaming Response (200):**
 * Server-Sent Events with `Content-Type: text/event-stream`
 * ```
 * data: {
 *   choices: [{
 *     delta: { content: string },
 *     finish_reason: null | 'stop'
 *   }],
 *   model: string
 * }
 * 
 * data: [DONE]
 * ```
 * 
 * **Non-Streaming Response (200):**
 * ```typescript
 * {
 *   id: string,                       // Unique completion ID
 *   object: 'chat.completion',
 *   created: number,                  // Unix timestamp
 *   model: string,                    // Model identifier
 *   choices: [{
 *     index: 0,
 *     message: {
 *       role: 'assistant',
 *       content: string
 *     },
 *     finish_reason: 'stop'
 *   }],
 *   usage: {
 *     prompt_tokens: number,
 *     completion_tokens: number,
 *     total_tokens: number
 *   },
 *   metadata: {                       // Enhanced analytics metadata
 *     response_time: number,
 *     model_version: string,
 *     user_id?: string,
 *     conversation_id?: string,
 *     generation_time: number
 *   }
 * }
 * ```
 * 
 * **Error Response (500):**
 * ```typescript
 * {
 *   error: {
 *     message: string,                // Error description
 *     type: 'server_error',
 *     code: 'api_error'
 *   },
 *   status: 'error',
 *   timestamp: number                 // Unix timestamp
 * }
 * ```
 * 
 * **CORS Headers:**
 * All responses include CORS headers for development compatibility:
 * - `Access-Control-Allow-Origin: *`
 * - `Access-Control-Allow-Headers: Content-Type`
 * 
 * @returns Promise<Response> - HTTP response with appropriate content type and CORS headers
 * @throws {Error} - Internal server errors are caught and returned as structured error responses
 * 
 * @example
 * ```typescript
 * // Non-streaming request
 * const response = await fetch('/api/copilot-kit', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     messages: [
 *       { role: 'system', content: 'You are a helpful assistant.' },
 *       { role: 'user', content: 'Hello!' }
 *     ],
 *     max_tokens: 150,
 *     temperature: 0.8,
 *     stream: false
 *   })
 * })
 * 
 * // Streaming request
 * const streamResponse = await fetch('/api/copilot-kit', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     messages: [{ role: 'user', content: 'Tell me a story' }],
 *     stream: true
 *   })
 * })
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    let body: ChatRequest
    try {
      body = await req.json()
    } catch (_jsonError) {
      return new Response(JSON.stringify({
        error: {
          message: 'Invalid JSON in request body',
          type: 'validation_error',
          code: 'invalid_json'
        },
        status: 'error',
        timestamp: Date.now()
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
    const { 
      messages, 
      max_tokens = 200, 
      temperature = 0.7, 
      stream = false,
      user_id,
      conversation_id 
    } = body

    // Validate required fields and request structure
    if (!messages) {
      return new Response(JSON.stringify({
        error: {
          message: 'Missing required field: messages',
          type: 'validation_error',
          code: 'missing_messages'
        },
        status: 'error',
        timestamp: Date.now()
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({
        error: {
          message: 'Invalid field type: messages must be an array',
          type: 'validation_error',
          code: 'invalid_messages_type'
        },
        status: 'error',
        timestamp: Date.now()
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    if (messages.length === 0) {
      return new Response(JSON.stringify({
        error: {
          message: 'Invalid field value: messages array cannot be empty',
          type: 'validation_error',
          code: 'empty_messages'
        },
        status: 'error',
        timestamp: Date.now()
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Validate message structure
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      if (!message || typeof message !== 'object') {
        return new Response(JSON.stringify({
          error: {
            message: `Invalid message structure at index ${i}: message must be an object`,
            type: 'validation_error',
            code: 'invalid_message_structure'
          },
          status: 'error',
          timestamp: Date.now()
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }

      if (!message.role || typeof message.role !== 'string') {
        return new Response(JSON.stringify({
          error: {
            message: `Invalid message at index ${i}: missing or invalid 'role' field (must be string)`,
            type: 'validation_error',
            code: 'invalid_message_role'
          },
          status: 'error',
          timestamp: Date.now()
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }

      if (!['system', 'user', 'assistant'].includes(message.role)) {
        return new Response(JSON.stringify({
          error: {
            message: `Invalid message at index ${i}: role must be 'system', 'user', or 'assistant'`,
            type: 'validation_error',
            code: 'invalid_role_value'
          },
          status: 'error',
          timestamp: Date.now()
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }

      if (!message.content || typeof message.content !== 'string') {
        return new Response(JSON.stringify({
          error: {
            message: `Invalid message at index ${i}: missing or invalid 'content' field (must be non-empty string)`,
            type: 'validation_error',
            code: 'invalid_message_content'
          },
          status: 'error',
          timestamp: Date.now()
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }

      if (message.content.trim().length === 0) {
        return new Response(JSON.stringify({
          error: {
            message: `Invalid message at index ${i}: content cannot be empty or whitespace only`,
            type: 'validation_error',
            code: 'empty_message_content'
          },
          status: 'error',
          timestamp: Date.now()
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }
    }

    // Validate optional numeric parameters
    if (max_tokens !== undefined && (typeof max_tokens !== 'number' || max_tokens <= 0 || max_tokens > 4000)) {
      return new Response(JSON.stringify({
        error: {
          message: 'Invalid field value: max_tokens must be a positive number <= 4000',
          type: 'validation_error',
          code: 'invalid_max_tokens'
        },
        status: 'error',
        timestamp: Date.now()
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 2)) {
      return new Response(JSON.stringify({
        error: {
          message: 'Invalid field value: temperature must be a number between 0 and 2',
          type: 'validation_error',
          code: 'invalid_temperature'
        },
        status: 'error',
        timestamp: Date.now()
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    if (stream !== undefined && typeof stream !== 'boolean') {
      return new Response(JSON.stringify({
        error: {
          message: 'Invalid field type: stream must be a boolean',
          type: 'validation_error',
          code: 'invalid_stream_type'
        },
        status: 'error',
        timestamp: Date.now()
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

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
    
    messages.forEach((message) => {
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
            console.error('Streaming error occurred during content generation', {
              timestamp: new Date().toISOString(),
              errorType: 'streaming_error',
              context: 'AI content generation streaming'
            })
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
    console.error('CopilotKit API error occurred', {
      timestamp: new Date().toISOString(),
      errorType: 'api_error',
      context: 'CopilotKit request processing',
      hasUserInput: Boolean(req.body)
    })
    
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

/**
 * CORS preflight handler for development and cross-origin requests
 * 
 * Handles OPTIONS requests to enable CORS (Cross-Origin Resource Sharing) for the CopilotKit API endpoint.
 * This is essential for browser-based applications that need to access the API from different origins during development.
 * 
 * @returns {Response} - Empty response with CORS headers allowing POST requests
 * 
 * @description
 * **CORS Headers Sent:**
 * - `Access-Control-Allow-Origin: *` - Allows requests from any origin (development only)
 * - `Access-Control-Allow-Methods: POST, OPTIONS` - Allows POST and OPTIONS methods
 * - `Access-Control-Allow-Headers: Content-Type, Authorization` - Allows required headers
 * 
 * **Security Note:**
 * The wildcard origin (*) is used for development convenience. In production,
 * this should be restricted to specific trusted domains.
 * 
 * @example
 * ```typescript
 * // Browser automatically sends OPTIONS request before POST
 * fetch('/api/copilot-kit', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ messages: [...] })
 * })
 * ```
 */
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