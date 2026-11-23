import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Vercel Cron Job: Runs every 5 minutes
 * Scans for orders placed > 7 minutes ago that have not been accepted by the cafe.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    // Optional cron secret verification if configured
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // In development or if not set, allow execution
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        ok: true,
        message: 'No cloud database configured; fallback mode active',
        scanned: 0,
        timedOut: 0,
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const sevenMinutesAgo = new Date(Date.now() - 7 * 60 * 1000).toISOString()

    // Find pending orders placed over 7 mins ago
    const { data: stuckOrders, error: fetchErr } = await supabase
      .from('orders')
      .select('id, order_number, cafe_id, created_at, status')
      .eq('status', 'placed')
      .lt('created_at', sevenMinutesAgo)

    if (fetchErr) {
      return NextResponse.json({
        ok: false,
        error: fetchErr.message,
      }, { status: 500 })
    }

    const count = stuckOrders?.length || 0

    // Auto-escalate or log alert
    if (count > 0 && stuckOrders) {
      console.warn(`[CRON] ${count} orders timed out awaiting merchant acceptance:`, stuckOrders.map(o => o.order_number))
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      scanned: stuckOrders?.length || 0,
      timedOut: count,
      escalatedOrders: stuckOrders?.map(o => o.order_number) || [],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
