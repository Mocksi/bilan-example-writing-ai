import { NextRequest, NextResponse } from 'next/server'
import { track } from '../../../lib/bilan'

/**
 * API endpoint for tracking events via sendBeacon
 * 
 * This is used for reliable event tracking during page unload,
 * particularly for journey abandonment tracking.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    if (!body.event_type || !body.properties) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Track the event
    await track(body.event_type, body.properties)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Track API error:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
} 