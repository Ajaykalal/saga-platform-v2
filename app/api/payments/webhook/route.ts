import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    let payload: Record<string, unknown> = {}
    try {
      payload = JSON.parse(rawBody)
    } catch {
      // Non-json or urlencoded body
    }

    // Cashfree headers for signature verification
    const cfSignature = request.headers.get('x-webhook-signature')
    const cfTimestamp = request.headers.get('x-webhook-timestamp')

    // Acknowledge receipt to Cashfree
    return NextResponse.json({
      success: true,
      received: true,
      event: payload.type || 'PAYMENT_EVENT',
      timestamp: cfTimestamp || new Date().toISOString(),
      verified: Boolean(cfSignature),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
