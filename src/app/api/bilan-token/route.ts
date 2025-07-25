import { NextRequest, NextResponse } from 'next/server'
import { env, getEnvVar } from '@/lib/env'

/**
 * Bilan Token Authentication API
 * 
 * Generates secure client tokens for Bilan SDK integration
 * Following .cursorrules for server-side token generation with client management
 */

interface TokenRequest {
  userId: string
  sessionId?: string
  metadata?: Record<string, any>
}

interface TokenResponse {
  token: string
  expiresAt: number
  config: {
    endpoint: string
    mode: 'local' | 'server'
    debug: boolean
  }
}

/**
 * Generate Bilan client token
 * POST /api/bilan-token
 * 
 * @param request - Next.js request object
 * @param request.body.userId - Required user identifier
 * @param request.body.sessionId - Optional session identifier
 * @param request.body.metadata - Optional metadata object
 * @returns {NextResponse<TokenResponse>} Token response with token, expiration, and config
 * @throws {400} When userId is missing
 * @throws {500} When token generation fails
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TokenRequest
    const { userId, sessionId, metadata = {} } = body

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Generate token with server-side security
    const token = await generateBilanToken(userId, sessionId, metadata)
    
    // Calculate expiration (24 hours from now)
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000)

    const response: TokenResponse = {
      token,
      expiresAt,
      config: {
        endpoint: env.BILAN_ENDPOINT || 'http://localhost:3002',
        mode: env.BILAN_MODE,
        debug: env.DEBUG
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Bilan token generation failed:', error)
    
    return NextResponse.json(
      { error: 'Token generation failed' },
      { status: 500 }
    )
  }
}

/**
 * Server-side token generation for Bilan SDK
 * Following template repository pattern for easy customization
 */
async function generateBilanToken(
  userId: string, 
  sessionId?: string, 
  metadata: Record<string, any> = {}
): Promise<string> {
  // ⚠️ SECURITY WARNING: This is a DEMO implementation only!
  
  // For server mode, return the raw API key that the server expects
  if (env.BILAN_MODE === 'server') {
    const apiKey = getEnvVar('NEXT_PUBLIC_BILAN_API_KEY')
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_BILAN_API_KEY is required for server mode')
    }
    console.log('🔑 Returning raw API key for server mode:', apiKey)
    return apiKey
  }
  
  // For local mode, generate a custom token (legacy behavior)
  const payload = {
    userId,
    sessionId,
    metadata,
    iat: Date.now(),
    exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    aud: 'bilan-sdk',
    iss: env.BILAN_ENDPOINT || 'localhost'
  }

  // For demo purposes, create a base64 encoded token
  // In production, use proper JWT signing with secret keys
  const tokenPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
  const signature = generateSignature(tokenPayload)
  
  return `${tokenPayload}.${signature}`
}

/**
 * Generate token signature for demo purposes
 * In production, use proper HMAC or RSA signing
 */
function generateSignature(payload: string): string {
  // Demo signature - in production use crypto.createHmac
  return Buffer.from(`demo-sig-${payload.slice(-10)}`).toString('base64')
}

/**
 * Validate Bilan token (for middleware usage)
 */
export function validateBilanToken(token: string): { valid: boolean; payload?: any } {
  try {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      return { valid: false }
    }
    
    const [payloadPart] = token.split('.')
    if (!payloadPart) {
      return { valid: false }
    }
    
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64').toString())
    
    // Check expiration
    if (payload.exp < Date.now()) {
      return { valid: false }
    }
    
    return { valid: true, payload }
  } catch {
    return { valid: false }
  }
} 