import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { SEED_ORDERS } from '@/lib/data/mockData'
import OrderTrackingView from './OrderTrackingView'

interface PageProps {
  params: Promise<{ id: string }>
}

export function generateStaticParams() {
  return SEED_ORDERS.map((order) => ({
    id: order.id,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const order = SEED_ORDERS.find((o) => o.id === id)
  const orderNum = order ? `#${order.order_number}` : id

  return {
    title: `Order ${orderNum} - Live Tracking | SAGA Delivery`,
    description: `Track your live food order ${orderNum} with real-time kitchen and student courier arrival updates.`,
  }
}

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Connecting to SAGA Live Dispatch...</p>
        </div>
      }
    >
      <OrderTrackingView orderId={id} />
    </Suspense>
  )
}
