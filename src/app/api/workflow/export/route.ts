/**
 * Content Export API Route
 * 
 * Handles content export requests in various formats.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getContentSession } from '../../../../lib/content-session-manager'
import { exportContentSession, createContentSummary } from '../../../../lib/content-export'
import type { ExportFormat, ExportTemplate } from '../../../../lib/content-export'
import { createSessionId } from '../../../../types'

interface ExportRequest {
  sessionId: string
  format?: ExportFormat
  template?: ExportTemplate
  includeMetadata?: boolean
  includeHistory?: boolean
  includeAnalytics?: boolean
}

interface ExportResponse {
  success: boolean
  data?: {
    content: string
    filename: string
    mimeType: string
    size: number
    metadata: any
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ExportResponse>> {
  try {
    // Parse and validate request body
    const body = await request.json() as ExportRequest
    
    // Validate required fields
    if (!body.sessionId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: sessionId'
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

    // Validate export format if provided
    const validFormats: ExportFormat[] = ['markdown', 'plain_text', 'html', 'json', 'pdf_ready', 'csv', 'docx_compatible']
    if (body.format && !validFormats.includes(body.format)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: `Format must be one of: ${validFormats.join(', ')}`
        }
      }, { status: 400 })
    }

    // Validate template if provided
    const validTemplates: ExportTemplate[] = ['minimal', 'standard', 'detailed', 'presentation', 'analysis_report', 'archive']
    if (body.template && !validTemplates.includes(body.template)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE',
          message: `Template must be one of: ${validTemplates.join(', ')}`
        }
      }, { status: 400 })
    }

    // Export session
    const exportResult = await exportContentSession(session, {
      format: body.format || 'markdown',
      template: body.template || 'standard',
      includeMetadata: body.includeMetadata ?? true,
      includeHistory: body.includeHistory ?? false,
      includeAnalytics: body.includeAnalytics ?? false
    })

    return NextResponse.json({
      success: true,
      data: exportResult
    })

  } catch (error) {
    console.error('Export error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Export failed',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Handle summary export via query parameters
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const action = url.searchParams.get('action')

    if (action === 'summary' && sessionId) {
      const session = getContentSession(createSessionId(sessionId))
      
      if (!session) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: `Session with ID ${sessionId} not found`
          }
        }, { status: 404 })
      }

      const summary = await createContentSummary(session)
      
      return NextResponse.json({
        success: true,
        data: summary
      })
    }

    // Return API documentation for GET requests
    return NextResponse.json({
      message: 'Content Export API',
      endpoints: {
        'POST /api/workflow/export': {
          description: 'Export a content session in various formats',
          parameters: {
            sessionId: 'Required - Session ID to export',
            format: 'Optional - Export format (markdown, html, json, etc.)',
            template: 'Optional - Export template (minimal, standard, detailed, etc.)',
            includeMetadata: 'Optional - Include session metadata',
            includeHistory: 'Optional - Include iteration history',
            includeAnalytics: 'Optional - Include analytics data'
          }
        },
        'GET /api/workflow/export?action=summary&sessionId=<id>': {
          description: 'Get a summary of a content session',
          parameters: {
            sessionId: 'Required - Session ID to summarize',
            action: 'Required - Must be "summary"'
          }
        }
      },
      supportedFormats: ['markdown', 'plain_text', 'html', 'json', 'pdf_ready', 'csv', 'docx_compatible'],
      supportedTemplates: ['minimal', 'standard', 'detailed', 'presentation', 'analysis_report', 'archive']
    })

  } catch (error) {
    console.error('Export GET error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Request failed'
      }
    }, { status: 500 })
  }
} 