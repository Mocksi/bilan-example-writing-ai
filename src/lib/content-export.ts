/**
 * Content Export and Sharing Utilities
 * 
 * Provides comprehensive export functionality for content sessions,
 * including multiple formats, session summaries, and sharing capabilities.
 */

import type { 
  ContentSession, 
  ContentIteration, 
  SessionId,
  ContentType
} from '../types'
import { getContentSessionStats } from './content-session-manager'
import { analyzeSessionProgress, type ComparisonAnalysis } from './content-comparison'

export interface ExportOptions {
  format: ExportFormat
  includeMetadata?: boolean
  includeHistory?: boolean
  includeAnalytics?: boolean
  selectedIterations?: string[]
  template?: ExportTemplate
}

export type ExportFormat = 
  | 'markdown'
  | 'plain_text'
  | 'html'
  | 'json'
  | 'pdf_ready'
  | 'csv'
  | 'docx_compatible'

export type ExportTemplate = 
  | 'minimal'
  | 'standard'
  | 'detailed'
  | 'presentation'
  | 'analysis_report'
  | 'archive'

// Arrays for validation - single source of truth
export const VALID_EXPORT_FORMATS: ExportFormat[] = [
  'markdown',
  'plain_text', 
  'html',
  'json',
  'pdf_ready',
  'csv',
  'docx_compatible'
] as const

export const VALID_EXPORT_TEMPLATES: ExportTemplate[] = [
  'minimal',
  'standard',
  'detailed', 
  'presentation',
  'analysis_report',
  'archive'
] as const

export interface ExportResult {
  content: string
  filename: string
  mimeType: string
  size: number
  metadata: ExportMetadata
}

export interface ExportMetadata {
  exportedAt: number
  exportFormat: ExportFormat
  template: ExportTemplate
  sessionInfo: {
    sessionId: string
    contentType: ContentType
    createdAt: number
    iterationCount: number
  }
  includesHistory: boolean
  includesAnalytics: boolean
}

export interface ShareableLink {
  url: string
  shareCode: string
  expiresAt?: number
  permissions: SharePermissions
  accessCount: number
}

export interface SharePermissions {
  canView: boolean
  canCopy: boolean
  canDownload: boolean
  canComment: boolean
  requiresPassword?: boolean
}

export interface SessionSummary {
  sessionId: SessionId
  title: string
  contentType: ContentType
  createdAt: number
  status: string
  finalContent: string
  iterationCount: number
  timeSpent: number
  keyInsights: string[]
  userSatisfaction: number
}

export interface ArchiveBundle {
  sessions: ContentSession[]
  analysis: ComparisonAnalysis[]
  metadata: {
    exportedAt: number
    version: string
    totalSessions: number
    dateRange: { start: number; end: number }
  }
}

/**
 * In-memory storage for server-side shared sessions
 */
const serverSharedSessions = new Map<string, ContentSession>()

/**
 * Content Export Service Class
 */
export class ContentExportService {
  private readonly version = '1.0.0'
  private shareLinks = new Map<string, ShareableLink>()

  /**
   * Export a single content session
   */
  async exportSession(
    session: ContentSession,
    options: ExportOptions = { format: 'markdown' }
  ): Promise<ExportResult> {
    const template = options.template || 'standard'
    const format = options.format

    let content = ''
    let mimeType = 'text/plain'
    
    switch (format) {
      case 'markdown':
        content = await this.generateMarkdownExport(session, template, options)
        mimeType = 'text/markdown'
        break
      case 'html':
        content = await this.generateHTMLExport(session, template, options)
        mimeType = 'text/html'
        break
      case 'json':
        content = await this.generateJSONExport(session, options)
        mimeType = 'application/json'
        break
      case 'plain_text':
        content = await this.generatePlainTextExport(session, template, options)
        mimeType = 'text/plain'
        break
      case 'pdf_ready':
        content = await this.generatePDFReadyExport(session, template, options)
        mimeType = 'text/html'
        break
      case 'csv':
        content = await this.generateCSVExport(session, options)
        mimeType = 'text/csv'
        break
      case 'docx_compatible':
        content = await this.generateDocxCompatibleExport(session, template, options)
        mimeType = 'text/html'
        break
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }

    const filename = this.generateFilename(session, format, template)
    const size = Buffer.byteLength(content, 'utf8')

    const metadata: ExportMetadata = {
      exportedAt: Date.now(),
      exportFormat: format,
      template,
      sessionInfo: {
        sessionId: session.id,
        contentType: session.contentType,
        createdAt: session.startTime,
        iterationCount: session.iterations.length
      },
      includesHistory: options.includeHistory || false,
      includesAnalytics: options.includeAnalytics || false
    }

    return {
      content,
      filename,
      mimeType,
      size,
      metadata
    }
  }

  /**
   * Export multiple sessions as an archive
   */
  async exportSessionArchive(
    sessions: ContentSession[],
    options: ExportOptions = { format: 'json' }
  ): Promise<ExportResult> {
    const analysisResults = await Promise.all(
      sessions.map(session => 
        analyzeSessionProgress(session.id, session.iterations)
      )
    )

    const archive: ArchiveBundle = {
      sessions,
      analysis: analysisResults,
      metadata: {
        exportedAt: Date.now(),
        version: this.version,
        totalSessions: sessions.length,
        dateRange: {
          start: Math.min(...sessions.map(s => s.startTime)),
          end: Math.max(...sessions.map(s => s.endTime || s.startTime))
        }
      }
    }

    const content = JSON.stringify(archive, null, 2)
    const filename = `content_sessions_archive_${new Date().toISOString().split('T')[0]}.json`

    return {
      content,
      filename,
      mimeType: 'application/json',
      size: Buffer.byteLength(content, 'utf8'),
      metadata: {
        exportedAt: Date.now(),
        exportFormat: options.format,
        template: options.template || 'archive',
        sessionInfo: {
          sessionId: 'multiple',
          contentType: 'mixed' as ContentType,
          createdAt: archive.metadata.dateRange.start,
          iterationCount: sessions.reduce((sum, s) => sum + s.iterations.length, 0)
        },
        includesHistory: true,
        includesAnalytics: true
      }
    }
  }

  /**
   * Create a session summary
   */
  async createSessionSummary(session: ContentSession): Promise<SessionSummary> {
    const stats = getContentSessionStats(session.id)
    const analysis = await analyzeSessionProgress(session.id, session.iterations)
    
    // Get final content (best iteration or latest)
    const finalContent = analysis.bestIteration.generatedContent
    
    // Extract key insights
    const keyInsights = analysis.improvementInsights
      .filter(insight => insight.confidence > 0.7)
      .map(insight => insight.description)
      .slice(0, 3)

    // Calculate user satisfaction
    const userSatisfaction = this.calculateOverallSatisfaction(session.iterations)

    return {
      sessionId: session.id,
      title: this.generateSessionTitle(session),
      contentType: session.contentType,
      createdAt: session.startTime,
      status: session.status,
      finalContent,
      iterationCount: session.iterations.length,
      timeSpent: stats?.sessionDuration || 0,
      keyInsights,
      userSatisfaction
    }
  }

  /**
   * Create a shareable link for a session
   */
  async createShareableLink(
    session: ContentSession,
    permissions: SharePermissions,
    expirationHours?: number
  ): Promise<ShareableLink> {
    const shareCode = this.generateShareCode()
    const expiresAt = expirationHours 
      ? Date.now() + (expirationHours * 60 * 60 * 1000)
      : undefined

    const shareableLink: ShareableLink = {
      url: `${this.getBaseURL()}/shared/${shareCode}`,
      shareCode,
      expiresAt,
      permissions,
      accessCount: 0
    }

    this.shareLinks.set(shareCode, shareableLink)
    
    // Store session data associated with share code
    this.storeSharedSession(shareCode, session)

    return shareableLink
  }

  /**
   * Generate different export formats
   */
  private async generateMarkdownExport(
    session: ContentSession,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<string> {
    const sections: string[] = []

    // Header
    sections.push(`# ${this.generateSessionTitle(session)}\n`)
    sections.push(`**Created:** ${new Date(session.startTime).toLocaleDateString()}\n`)
    sections.push(`**Status:** ${session.status}\n`)

    if (options.includeMetadata) {
      sections.push('## Session Information\n')
      sections.push(`- **Session ID:** ${session.id}\n`)
      sections.push(`- **Content Type:** ${session.contentType}\n`)
      sections.push(`- **Total Iterations:** ${session.iterations.length}\n`)
      
      if (session.endTime) {
        const duration = session.endTime - session.startTime
        sections.push(`- **Duration:** ${Math.round(duration / 1000 / 60)} minutes\n`)
      }
      sections.push('\n')
    }

    // User Brief
    sections.push('## Brief\n')
    sections.push(session.userBrief + '\n')

    // Iterations
    for (const [_index, iteration] of session.iterations.entries()) {
      const attemptLabel = template === 'minimal' ? `Attempt ${iteration.attemptNumber}` : 
                          `Iteration ${iteration.attemptNumber}`
      
      sections.push(`## ${attemptLabel}\n`)
      sections.push(iteration.generatedContent)
      
      if (iteration.userFeedback && template !== 'minimal') {
        sections.push('\n### User Feedback\n')
        sections.push(`**Type:** ${iteration.userFeedback.type}\n`)
        
        if (iteration.userFeedback.rating) {
          sections.push(`**Rating:** ${iteration.userFeedback.rating > 0 ? '👍' : '👎'}\n`)
        }
        
        if (iteration.userFeedback.refinementRequest) {
          sections.push(`**Request:** ${iteration.userFeedback.refinementRequest}\n`)
        }
      }
      
      sections.push('\n')
    }

    return sections.join('\n')
  }

  private async generateHTMLExport(
    session: ContentSession,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<string> {
    const markdown = await this.generateMarkdownExport(session, template, options)
    
    // Simple markdown to HTML conversion
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.generateSessionTitle(session)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { color: #666; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; }
        .metadata { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .iteration { border: 1px solid #eee; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .feedback { background: #fff3cd; padding: 10px; border-radius: 3px; margin-top: 10px; }
    </style>
</head>
<body>`

    // Convert markdown to HTML (simplified)
    html += this.convertMarkdownToHTML(markdown)
    
    html += `</body></html>`
    
    return html
  }

  private async generateJSONExport(
    session: ContentSession,
    options: ExportOptions
  ): Promise<string> {
    const exportData = {
      session: {
        id: session.id,
        contentType: session.contentType,
        userBrief: session.userBrief,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        iterations: session.iterations.map(iteration => ({
          id: iteration.id,
          attemptNumber: iteration.attemptNumber,
          generatedContent: iteration.generatedContent,
          userFeedback: iteration.userFeedback,
          timing: iteration.timing
        }))
      },
      metadata: {
        exportedAt: Date.now(),
        includeHistory: options.includeHistory,
        includeAnalytics: options.includeAnalytics
      }
    }

    return JSON.stringify(exportData, null, 2)
  }

  private async generatePlainTextExport(
    session: ContentSession,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<string> {
    let text = ''

    // Header
    text += `${this.generateSessionTitle(session)}\n`
    text += '='.repeat(this.generateSessionTitle(session).length) + '\n\n'

    if (options.includeMetadata) {
      text += `Content Type: ${session.contentType}\n`
      text += `Created: ${new Date(session.startTime).toLocaleString()}\n`
      text += `Status: ${session.status}\n`
      text += `Iterations: ${session.iterations.length}\n\n`
    }

    // User brief
    text += `Brief:\n${session.userBrief}\n\n`

    if (template === 'minimal') {
      const finalIteration = session.iterations[session.iterations.length - 1]
      text += `Final Content:\n\n${finalIteration.generatedContent}\n\n`
    } else {
      const analysis = await analyzeSessionProgress(session.id, session.iterations)
      
      text += `Final Content:\n\n${analysis.bestIteration.generatedContent}\n\n`
      
      if (options.includeHistory) {
        text += `Iteration History:\n\n`
        for (const iteration of session.iterations) {
          text += `--- Attempt ${iteration.attemptNumber} ---\n`
          text += `${iteration.generatedContent}\n`
          
          if (iteration.userFeedback) {
            text += `\nUser Feedback: ${iteration.userFeedback.type}`
            if (iteration.userFeedback.refinementRequest) {
              text += ` - "${iteration.userFeedback.refinementRequest}"`
            }
            text += '\n'
          }
          text += '\n'
        }
      }
    }

    return text
  }

  private async generatePDFReadyExport(
    session: ContentSession,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<string> {
    // Generate HTML optimized for PDF conversion
    const html = await this.generateHTMLExport(session, template, options)
    
    // Add PDF-specific styles
    const pdfStyles = `
      <style>
        @media print {
          body { font-size: 12pt; }
          .no-print { display: none; }
          .page-break { page-break-before: always; }
        }
      </style>
    `
    
    return html.replace('<style>', pdfStyles + '<style>')
  }

  private async generateCSVExport(
    session: ContentSession,
    _options: ExportOptions
  ): Promise<string> {
    const rows: string[] = []
    
    // CSV field escaping function (RFC 4180 compliant)
    const escapeCSVField = (field: string | number): string => {
      const str = String(field)
      // Enclose in double quotes and escape internal quotes by doubling them
      return `"${str.replace(/"/g, '""')}"`
    }
    
    // Header
    rows.push([
      'Attempt',
      'Content', 
      'User Feedback Type',
      'Rating',
      'Refinement Request',
      'Response Time'
    ].map(escapeCSVField).join(','))
    
    // Data rows
    for (const iteration of session.iterations) {
      const attemptNumber = escapeCSVField(iteration.attemptNumber)
      const content = escapeCSVField(iteration.generatedContent)
      const feedbackType = escapeCSVField(iteration.userFeedback?.type || '')
      const rating = escapeCSVField(iteration.userFeedback?.rating || '')
      const refinementRequest = escapeCSVField(iteration.userFeedback?.refinementRequest || '')
      const responseTime = escapeCSVField(iteration.timing.responseTime - iteration.timing.requestTime)
      
      rows.push(`${attemptNumber},${content},${feedbackType},${rating},${refinementRequest},${responseTime}`)
    }
    
    return rows.join('\n')
  }

  private async generateDocxCompatibleExport(
    session: ContentSession,
    template: ExportTemplate,
    options: ExportOptions
  ): Promise<string> {
    // Generate HTML compatible with Word import
    const html = await this.generateHTMLExport(session, template, options)
    
    // Add Word-compatible namespaces and styles
    return html.replace('<html lang="en">', '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">')
  }

  /**
   * Helper methods
   */
  private generateSessionTitle(session: ContentSession): string {
    const contentTypeTitle = session.contentType.charAt(0).toUpperCase() + session.contentType.slice(1)
    const briefPreview = session.userBrief.length > 50 
      ? session.userBrief.substring(0, 47) + '...'
      : session.userBrief
    
    return `${contentTypeTitle}: ${briefPreview}`
  }

  private generateFilename(
    session: ContentSession,
    format: ExportFormat,
    template: ExportTemplate
  ): string {
    const date = new Date().toISOString().split('T')[0]
    const contentType = session.contentType
    const extension = this.getFileExtension(format)
    const templateSuffix = template !== 'standard' ? `_${template}` : ''
    
    return `${contentType}_content_${date}${templateSuffix}.${extension}`
  }

  private getFileExtension(format: ExportFormat): string {
    const extensions: Record<ExportFormat, string> = {
      markdown: 'md',
      plain_text: 'txt',
      html: 'html',
      json: 'json',
      pdf_ready: 'html',
      csv: 'csv',
      docx_compatible: 'html'
    }
    
    return extensions[format] || 'txt'
  }

  private generateShareCode(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  private getBaseURL(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return 'http://localhost:3000' // Default for server-side
  }

  private storeSharedSession(shareCode: string, session: ContentSession): void {
    // Detect environment and use appropriate storage
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      // Browser environment - use localStorage
      try {
        localStorage.setItem(`shared_${shareCode}`, JSON.stringify(session))
      } catch (error) {
        console.info('localStorage not available, falling back to in-memory storage:', error)
        serverSharedSessions.set(shareCode, session)
      }
    } else {
      // Server environment - use in-memory Map
      serverSharedSessions.set(shareCode, session)
    }
  }

  private calculateOverallSatisfaction(iterations: ContentIteration[]): number {
    const feedbacks = iterations
      .map(iter => iter.userFeedback)
      .filter((feedback): feedback is NonNullable<typeof feedback> => feedback !== undefined)

    if (feedbacks.length === 0) return 0.5

    let totalScore = 0
    for (const feedback of feedbacks) {
      let score = 0.5
      
      if (feedback.type === 'accept') score = 0.8
      else if (feedback.type === 'reject') score = 0.2
      else if (feedback.type === 'refine') score = 0.4
      
      if (feedback.rating === 1) score += 0.2
      else if (feedback.rating === -1) score -= 0.2
      
      if (feedback.acceptanceLevel === 'as_is') score = 1.0
      else if (feedback.acceptanceLevel === 'inspiration') score = 0.3
      
      totalScore += Math.min(Math.max(score, 0), 1)
    }

    return totalScore / feedbacks.length
  }

  private convertMarkdownToHTML(markdown: string): string {
    // Very simplified markdown to HTML conversion
    return markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.)/gm, '<p>$1')
      .replace(/(.*)$/gm, '$1</p>')
      .replace(/<p><h/g, '<h')
      .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
      .replace(/<p><ul>/g, '<ul>')
      .replace(/<\/ul><\/p>/g, '</ul>')
      .replace(/<p><hr><\/p>/g, '<hr>')
  }

  /**
   * Get shared session by code
   */
  getSharedSession(shareCode: string): ContentSession | null {
    // Detect environment and use appropriate storage
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      // Browser environment - try localStorage first
      try {
        const stored = localStorage.getItem(`shared_${shareCode}`)
        return stored ? JSON.parse(stored) : null
      } catch (error) {
        console.info('localStorage error, falling back to in-memory storage:', error)
        // Fall back to in-memory storage
        return serverSharedSessions.get(shareCode) || null
      }
    } else {
      // Server environment - use in-memory Map
      return serverSharedSessions.get(shareCode) || null
    }
  }

  /**
   * Update share link access count
   */
  incrementShareAccess(shareCode: string): void {
    const shareLink = this.shareLinks.get(shareCode)
    if (shareLink) {
      shareLink.accessCount++
      this.shareLinks.set(shareCode, shareLink)
    }
  }

  /**
   * Check if share link is valid
   */
  isShareLinkValid(shareCode: string): boolean {
    const shareLink = this.shareLinks.get(shareCode)
    if (!shareLink) return false
    
    if (shareLink.expiresAt && Date.now() > shareLink.expiresAt) {
      this.shareLinks.delete(shareCode)
      return false
    }
    
    return true
  }
}

// Export a default instance
export const contentExportService = new ContentExportService()

/**
 * Convenience functions
 */
export const exportContentSession = (session: ContentSession, options?: ExportOptions) =>
  contentExportService.exportSession(session, options)

export const createContentSummary = (session: ContentSession) =>
  contentExportService.createSessionSummary(session)

export const createShareLink = (session: ContentSession, permissions: SharePermissions, expirationHours?: number) =>
  contentExportService.createShareableLink(session, permissions, expirationHours)

export const exportSessionArchive = (sessions: ContentSession[], options?: ExportOptions) =>
  contentExportService.exportSessionArchive(sessions, options) 