/**
 * Session Management API Route
 * 
 * Handles session retrieval, updates, and analysis.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { 
  getContentSession, 
  updateContentSession, 
  getContentSessionStats
} from '../../../../../lib/content-session-manager'
import { analyzeSessionProgress } from '../../../../../lib/content-comparison'
import type { SessionStatus } from '../../../../../types'
import { createSessionId } from '../../../../../types'
import type { ApiErrorDetails, MetadataRecord } from '../../../../../types/lint-types'

interface SessionResponse {
  success: boolean
  data?: unknown
  error?: {
    code: string
    message: string
    details?: ApiErrorDetails
  }
}

interface UpdateSessionRequest {
  status?: SessionStatus
  userBrief?: string
  metadata?: MetadataRecord
}

interface RouteParams {
  params: {
    sessionId: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SessionResponse>> {
  try {
    const sessionId = createSessionId(params.sessionId)
    const session = getContentSession(sessionId)
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session with ID ${params.sessionId} not found`
        }
      }, { status: 404 })
    }

    // Get query parameters for additional data
    const url = new URL(request.url)
    const includeStats = url.searchParams.get('includeStats') === 'true'
    const includeAnalysis = url.searchParams.get('includeAnalysis') === 'true'

    const responseData: any = {
      session
    }

    if (includeStats) {
      responseData.stats = getContentSessionStats(sessionId)
    }

    if (includeAnalysis && session.iterations.length > 0) {
      responseData.analysis = await analyzeSessionProgress(sessionId, session.iterations)
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Session retrieval error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SESSION_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve session',
        details: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      }
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SessionResponse>> {
  try {
    const sessionId = createSessionId(params.sessionId)
    const body = await request.json() as UpdateSessionRequest

    // Validate session exists
    const existingSession = getContentSession(sessionId)
    if (!existingSession) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session with ID ${params.sessionId} not found`
        }
      }, { status: 404 })
    }

    // Validate status if provided
    if (body.status && !['active', 'completed', 'abandoned'].includes(body.status)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be one of: active, completed, abandoned'
        }
      }, { status: 400 })
    }

    // Update session
    const updatedSession = await updateContentSession(sessionId, body)
    
    if (!updatedSession) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SESSION_UPDATE_FAILED',
          message: 'Failed to update session'
        }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        session: updatedSession
      }
    })

  } catch (error) {
    console.error('Session update error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SESSION_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update session',
        details: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      }
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SessionResponse>> {
  try {
    const sessionId = createSessionId(params.sessionId)
    
    // Validate session exists
    const existingSession = getContentSession(sessionId)
    if (!existingSession) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session with ID ${params.sessionId} not found`
        }
      }, { status: 404 })
    }

    // Mark session as abandoned instead of actually deleting
    const abandonedSession = await updateContentSession(sessionId, { status: 'abandoned' })
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Session marked as abandoned',
        session: abandonedSession
      }
    })

  } catch (error) {
    console.error('Session deletion error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SESSION_DELETION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete session',
        details: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      }
    }, { status: 500 })
  }
} 