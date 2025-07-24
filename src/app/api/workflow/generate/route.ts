/**
 * Content Generation API Route
 * 
 * Handles content generation requests through the workflow engine.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { generateContentForType } from '../../../../lib/ai-client'
import { createContentSession, addContentIteration, getContentSession } from '../../../../lib/content-session-manager'
import { createIteration } from '../../../../lib/iteration-manager'
import type { ContentType, SessionId } from '../../../../types'
import { createSessionId } from '../../../../types'
import type { ApiErrorDetails } from '../../../../types/lint-types'

export interface GenerateContentRequest {
  contentType: ContentType
  userBrief: string
  sessionId?: string
  options?: {
    temperature?: number
    maxLength?: number
    tone?: 'formal' | 'casual' | 'professional' | 'friendly'
    length?: 'short' | 'medium' | 'long'
  }
}

export interface GenerateContentResponse {
  success: boolean
  data?: {
    sessionId: string
    iterationId: string
    content: string
    metadata: {
      generationTime: number
      attemptNumber: number
      contentLength: number
      bilanTurnId: string
    }
  }
  error?: {
    code: string
    message: string
    details?: ApiErrorDetails
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateContentResponse>> {
  try {
    // Parse and validate request body
    const body = await request.json() as GenerateContentRequest
    
    // Validate required fields
    if (!body.contentType || !body.userBrief) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: contentType and userBrief are required'
        }
      }, { status: 400 })
    }

    // Validate content type
    if (!['blog', 'email', 'social'].includes(body.contentType)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Content type must be one of: blog, email, social'
        }
      }, { status: 400 })
    }

    // Get or create session
    let sessionId: SessionId
    let session = body.sessionId ? getContentSession(createSessionId(body.sessionId)) : null
    
    if (!session) {
      // Create new session
      session = await createContentSession({
        contentType: body.contentType,
        userBrief: body.userBrief,
        metadata: {
          createdViaAPI: true,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      })
      sessionId = session.id
    } else {
      sessionId = session.id
    }

    const requestTime = Date.now()

    // Generate content using AI client
    const generationResponse = await generateContentForType(
      body.contentType,
      body.userBrief,
      {
        temperature: body.options?.temperature,
        maxLength: body.options?.maxLength
      }
    )

    const responseTime = Date.now()

    // Create iteration using iteration manager
    const iteration = await createIteration(
      {
        sessionId: sessionId,
        contentType: body.contentType,
        userBrief: body.userBrief,
        previousAttempts: session.iterations
      },
      body.userBrief, // Using user brief as prompt for now
      generationResponse.text,
      { requestTime, responseTime }
    )

    // Add iteration to session
    await addContentIteration(sessionId, {
      prompt: body.userBrief,
      generatedContent: generationResponse.text,
      bilanTurnId: iteration.bilanTurnId,
      timing: {
        requestTime,
        responseTime
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        sessionId: sessionId,
        iterationId: iteration.id,
        content: generationResponse.text,
        metadata: {
          generationTime: responseTime - requestTime,
          attemptNumber: iteration.attemptNumber,
          contentLength: generationResponse.text.length,
          bilanTurnId: iteration.bilanTurnId
        }
      }
    })

  } catch (error) {
    console.error('Content generation error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Content generation failed',
        details: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      }
    }, { status: 500 })
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'GET method not supported. Use POST to generate content.'
    }
  }, { status: 405 })
} 