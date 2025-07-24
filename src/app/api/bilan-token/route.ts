import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'

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
  // In demo mode, generate a simple JWT-style token
  // In production, this would integrate with your auth system
  
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
    const [payloadPart] = token.split('.')
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