/**
 * Content Refinement API Route
 * 
 * Handles content refinement requests through the workflow engine.
 */

import { NextRequest, NextResponse } from 'next/server'
import { processContentRefinement } from '../../../../lib/refinement-processor'
import { addIterationFeedback } from '../../../../lib/iteration-manager'
import { getContentSession } from '../../../../lib/content-session-manager'
import type { ContentType, SessionId, IterationId, UserFeedback } from '../../../../types'
import { createSessionId, createIterationId } from '../../../../types'

export interface RefineContentRequest {
  sessionId: string
  iterationId: string
  userFeedback: UserFeedback
  contentType: ContentType
  userBrief: string
}

export interface RefineContentResponse {
  success: boolean
  data?: {
    refinedIteration: {
      id: string
      content: string
      attemptNumber: number
      bilanTurnId: string
    }
    strategy: {
      type: string
      description: string
      confidenceScore: number
    }
    improvementHypothesis: string
    contextUsed: string[]
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<RefineContentResponse>> {
  try {
    // Parse and validate request body
    const body = await request.json() as RefineContentRequest
    
    // Validate required fields
    if (!body.sessionId || !body.iterationId || !body.userFeedback || !body.contentType || !body.userBrief) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: sessionId, iterationId, userFeedback, contentType, and userBrief are required'
        }
      }, { status: 400 })
    }

    // Validate user feedback
    if (!['accept', 'reject', 'refine'].includes(body.userFeedback.type)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_FEEDBACK_TYPE',
          message: 'Feedback type must be one of: accept, reject, refine'
        }
      }, { status: 400 })
    }

    // Get session and validate it exists
    const sessionId = createSessionId(body.sessionId)
    const session = getContentSession(sessionId)
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session with ID ${body.sessionId} not found`
        }
      }, { status: 404 })
    }

    // Find the iteration to refine
    const iterationId = createIterationId(body.iterationId)
    const iteration = session.iterations.find(iter => iter.id === iterationId)
    
    if (!iteration) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ITERATION_NOT_FOUND',
          message: `Iteration with ID ${body.iterationId} not found in session`
        }
      }, { status: 404 })
    }

    // Add feedback to the iteration
    await addIterationFeedback(sessionId, iterationId, body.userFeedback)

    // If feedback is 'accept', we don't need to refine
    if (body.userFeedback.type === 'accept') {
      return NextResponse.json({
        success: true,
        data: {
          refinedIteration: {
            id: iteration.id,
            content: iteration.generatedContent,
            attemptNumber: iteration.attemptNumber,
            bilanTurnId: iteration.bilanTurnId
          },
          strategy: {
            type: 'accept_current',
            description: 'Content accepted as-is',
            confidenceScore: 1.0
          },
          improvementHypothesis: 'No refinement needed - content accepted by user',
          contextUsed: ['user_acceptance']
        }
      })
    }

    // Process refinement for reject/refine feedback
    const refinementResult = await processContentRefinement({
      sessionId,
      iterationId,
      userFeedback: body.userFeedback,
      contentType: body.contentType,
      userBrief: body.userBrief,
      previousIterations: session.iterations
    })

    return NextResponse.json({
      success: true,
      data: {
        refinedIteration: {
          id: refinementResult.iteration.id,
          content: refinementResult.iteration.generatedContent,
          attemptNumber: refinementResult.iteration.attemptNumber,
          bilanTurnId: refinementResult.iteration.bilanTurnId
        },
        strategy: {
          type: refinementResult.strategy.type,
          description: refinementResult.strategy.description,
          confidenceScore: refinementResult.confidenceScore
        },
        improvementHypothesis: refinementResult.improvementHypothesis,
        contextUsed: refinementResult.contextUsed
      }
    })

  } catch (error) {
    console.error('Content refinement error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'REFINEMENT_FAILED',
        message: error instanceof Error ? error.message : 'Content refinement failed',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 })
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'GET method not supported. Use POST to refine content.'
    }
  }, { status: 405 })
} 