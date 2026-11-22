import { NextRequest, NextResponse } from 'next/server'

interface CashfreeOrderRequest {
  order_id: string
  order_amount: number
  order_currency?: string
  customer_id: string
  customer_phone: string
  customer_name: string
  customer_email?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CashfreeOrderRequest = await request.json()

    const {
      order_id,
      order_amount,
      order_currency = 'INR',
      customer_id,
      customer_phone,
      customer_name,
      customer_email = 'customer@sagacafe.in',
    } = body

    if (!order_id || !order_amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: order_id and order_amount' },
        { status: 400 }
      )
    }

    const appId = process.env.CASHFREE_APP_ID || process.env.NEXT_PUBLIC_CASHFREE_APP_ID
    const secretKey = process.env.CASHFREE_SECRET_KEY
    const isProduction = process.env.CASHFREE_ENV === 'production'

    // If live Cashfree API credentials exist, invoke official Cashfree PG API
    if (appId && secretKey && !appId.includes('placeholder')) {
      const baseUrl = isProduction
        ? 'https://api.cashfree.com/pg/orders'
        : 'https://sandbox.cashfree.com/pg/orders'

      const cfPayload = {
        order_id,
        order_amount,
        order_currency,
        customer_details: {
          customer_id: customer_id || `cust_${Date.now()}`,
          customer_name: customer_name || 'Saga Guest',
          customer_email,
          customer_phone: customer_phone.replace(/\D/g, '').slice(-10) || '9900012345',
        },
        order_meta: {
          return_url: `${request.nextUrl.origin}/orders/${order_id}?payment=completed`,
          notify_url: `${request.nextUrl.origin}/api/payments/webhook`,
        },
      }

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cfPayload),
      })

      const data = await response.json()

      if (!response.ok) {
        return NextResponse.json(
          {
            error: data.message || 'Cashfree payment gateway order creation failed',
            details: data,
          },
          { status: response.status }
        )
      }

      return NextResponse.json({
        success: true,
        order_id: data.order_id,
        cf_order_id: data.cf_order_id,
        payment_session_id: data.payment_session_id,
        order_status: data.order_status,
        environment: isProduction ? 'production' : 'sandbox',
      })
    }

    // Graceful Fallback / Instant Mock Mode for local testing and zero-friction development
    const mockPaymentSessionId = `session_cf_saga_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    return NextResponse.json({
      success: true,
      order_id,
      cf_order_id: `cf_demo_${Date.now()}`,
      payment_session_id: mockPaymentSessionId,
      order_status: 'ACTIVE',
      environment: 'sandbox_simulation',
      note: 'Operating in automated Cashfree sandbox mode. Set CASHFREE_APP_ID & CASHFREE_SECRET_KEY in .env.local for live PG processing.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
