'use client'

import type { Order } from '@/lib/supabase/types'
import { SEED_CAFES } from '@/lib/data/mockData'
import { getDynamicConfig } from '@/lib/services/configService'

/**
 * Clean and format CSV cell value with RFC 4180 escaping
 */
function formatCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""'
  const stringVal = String(val)
  // Escape internal double quotes with double double-quotes
  const escaped = stringVal.replace(/"/g, '""')
  return `"${escaped}"`
}

/**
 * Generate and trigger download of Daily Sales & Tax Reconciliation CSV
 * @param orders Array of orders to include in reconciliation
 * @param cafeFilter Optional cafe name filter to customize export
 */
export function exportDailySalesCsv(orders: Order[], cafeFilter?: string): void {
  if (typeof window === 'undefined') return

  const config = getDynamicConfig()
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]

  // Filter orders if specific cafe is requested
  const filteredOrders = cafeFilter && cafeFilter !== 'all'
    ? orders.filter((o) => {
        const cafe = SEED_CAFES.find((c) => c.id === o.cafe_id)
        return cafe?.name.toLowerCase().includes(cafeFilter.toLowerCase()) || o.cafe_id === cafeFilter
      })
    : orders

  const headers = [
    'Date (IST)',
    'Time (IST)',
    'Order ID',
    'Order Number',
    'Cafe Name',
    'Customer Name',
    'Customer Phone',
    'Delivery Address',
    'Dishes Ordered (Qty x Name)',
    'Food Subtotal (INR)',
    'Coupon Code',
    'Discount (INR)',
    'Delivery Fee (INR)',
    'Platform Fee (INR)',
    'Gross Total (INR)',
    'Payment Method',
    'Payment Status',
    'Cafe Commission Rate (%)',
    'Platform Commission (INR)',
    'Net Cafe Payout (INR)',
    'Rider Courier Fee (INR)',
    'Delivery Status',
    'Delivery Handover OTP',
    'Settlement Status',
  ]

  const rows: string[][] = [headers]

  filteredOrders.forEach((o) => {
    const cafe = SEED_CAFES.find((c) => c.id === o.cafe_id)
    const commissionRate = cafe?.commission_rate || config.defaultCommissionRate || 15.0

    // Commission & Net Payout Math
    const commissionInr = Number(((o.subtotal_inr * commissionRate) / 100).toFixed(2))
    const netCafePayout = Number((o.subtotal_inr - commissionInr).toFixed(2))
    const riderFee = config.riderPayoutPerOrderInr || 55.0

    // Dish summary
    const dishesStr = (o.items || [])
      .map((item) => `${item.quantity}x ${item.name}`)
      .join(' | ')

    // Order dates
    const createdDate = new Date(o.created_at)
    const orderDateIST = createdDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const orderTimeIST = createdDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })

    const fullAddress = [
      o.delivery_address.building,
      o.delivery_address.street,
      o.delivery_address.city,
      o.delivery_address.postal_code,
    ]
      .filter(Boolean)
      .join(', ')

    const settlementStatus =
      o.status === 'delivered'
        ? o.payment_method === 'cod'
          ? 'COD Cash Verified (Escrow Credited)'
          : '3-Day Escrow Hold (Automated Release)'
        : o.status === 'cancelled'
        ? 'Cancelled / Void'
        : 'Pending Delivery Handover'

    rows.push([
      orderDateIST,
      orderTimeIST,
      o.id,
      o.order_number,
      cafe?.name || 'Saga Network Cafe',
      o.delivery_address.recipient_name || 'Customer',
      o.delivery_address.phone || '9876543210',
      fullAddress,
      dishesStr,
      String(o.subtotal_inr.toFixed(2)),
      o.coupon_code || 'NONE',
      String(Number(o.discount_amount_inr || 0).toFixed(2)),
      String(o.delivery_fee_inr.toFixed(2)),
      String(Number(o.platform_fee_inr || 5).toFixed(2)),
      String(o.total_amount_inr.toFixed(2)),
      o.payment_method.toUpperCase(),
      o.payment_status.toUpperCase(),
      `${commissionRate}%`,
      String(commissionInr.toFixed(2)),
      String(netCafePayout.toFixed(2)),
      String(riderFee.toFixed(2)),
      o.status.toUpperCase(),
      o.delivery_otp || 'N/A',
      settlementStatus,
    ])
  })

  // Format into CSV lines
  const csvContent = rows
    .map((row) => row.map(formatCsvCell).join(','))
    .join('\r\n')

  // Create Blob & trigger automatic browser download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const cleanFilterName = (cafeFilter && cafeFilter !== 'all' ? cafeFilter : 'All_Cafes')
    .replace(/[^a-zA-Z0-9]/g, '_')
  link.setAttribute('href', url)
  link.setAttribute('download', `SAGA_Sales_Reconciliation_${cleanFilterName}_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
