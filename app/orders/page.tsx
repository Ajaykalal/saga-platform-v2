'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import {
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  RotateCw,
  ShoppingBag,
  Navigation,
  Sparkles,
  Store,
  Bike,
} from 'lucide-react'
import { getStoredOrders, SAGA_ORDERS_EVENT } from '@/lib/services/orderService'
import { SEED_CAFES } from '@/lib/data/mockData'
import { useCart } from '@/lib/context/CartContext'
import type { Order } from '@/lib/supabase/types'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(() => getStoredOrders())
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered'>('all')
  const { addItem, openCart } = useCart()

  useEffect(() => {
    // Reactively listen to live updates across tabs or status changes
    const handleUpdate = () => {
      setOrders(getStoredOrders())
    }

    window.addEventListener(SAGA_ORDERS_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      window.removeEventListener(SAGA_ORDERS_EVENT, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  // Partition into Active vs Completed
  const activeOrders = orders.filter((o) =>
    ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(o.status)
  )

  const deliveredOrders = orders.filter((o) => o.status === 'delivered')

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') {
      return ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(o.status)
    }
    if (filter === 'delivered') {
      return o.status === 'delivered'
    }
    return true
  })

  const handleRepeatOrder = (order: Order) => {
    const cafe = SEED_CAFES.find((c) => c.id === order.cafe_id)
    if (cafe) {
      order.items.forEach((item) => {
        addItem(
          {
            id: item.menu_item_id,
            cafe_id: order.cafe_id,
            name: item.name,
            description: '',
            price_inr: item.price_inr,
            category: 'Popular',
            image_url: item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
            is_veg: item.is_veg ?? true,
            is_available: true,
            preparation_time_min: 15,
            tags: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          cafe
        )
      })
      openCart()
    }
  }

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'placed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Placed
          </span>
        )
      case 'preparing':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" /> Kitchen Preparing
          </span>
        )
      case 'ready_for_pickup':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" /> Ready for Pickup
          </span>
        )
      case 'out_for_delivery':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
            <Bike className="w-3 h-3 text-blue-600" /> Out for Delivery
          </span>
        )
      case 'delivered':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Delivered
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-28">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Title & Page Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Your Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track live kitchen prep, student courier arrival, and past cafe orders.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            Active & In-Transit ({activeOrders.length})
          </button>
          <button
            onClick={() => setFilter('delivered')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'delivered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            Delivered ({deliveredOrders.length})
          </button>
        </div>

        {/* Active Orders Highlight Card (if any) */}
        {filter !== 'delivered' && activeOrders.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Active Orders ({activeOrders.length})
              </span>
            </div>

            {activeOrders.map((order) => {
              const cafe = SEED_CAFES.find((c) => c.id === order.cafe_id)
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border-2 border-emerald-500/40 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-400">
                          #{order.order_number}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <h3 className="font-black text-slate-900 text-lg mt-1">
                        {cafe?.name || 'FoodLo Cafe'}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        {cafe?.address || 'Sagwara'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-700">
                        ₹{order.total_amount_inr}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} items
                      </span>
                    </div>
                  </div>

                  {/* Delivery Handover OTP */}
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 flex items-center justify-between text-xs mb-4">
                    <span className="text-emerald-900 font-medium">
                      Student Rider Delivery OTP:
                    </span>
                    <span className="font-mono font-black text-sm bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 text-emerald-800">
                      {order.delivery_otp || '4829'}
                    </span>
                  </div>

                  {/* Track Live Button */}
                  <Link
                    href={`/orders/${order.id}`}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Track Live Order & Rider ETA</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}

        {/* Orders List Container */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-black text-slate-900 text-base mb-1">
                No orders found
              </h3>
              <p className="text-slate-500 text-xs max-w-xs mx-auto mb-5">
                Craving artisanal wood-fired pizza or single-origin cold brew? Place your first order now!
              </p>
              <Link
                href="/"
                className="px-6 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 transition-colors inline-block"
              >
                Browse FoodLo Cafes
              </Link>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const cafe = SEED_CAFES.find((c) => c.id === order.cafe_id)
              const firstItem = order.items[0]
              const itemsCount = order.items.reduce((s, i) => s + i.quantity, 0)
              const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-sm transition-all"
                >
                  <div className="p-4 flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden relative shrink-0">
                      <Image
                        src={
                          firstItem?.image_url ||
                          cafe?.banner_url ||
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
                        }
                        alt={firstItem?.name || 'Order Item'}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {dateStr}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-sm mt-1 leading-snug">
                          {cafe?.name || 'Saga Cafe'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'} • #{order.order_number}
                        </p>
                      </div>

                      <div className="flex items-baseline justify-between mt-2">
                        <span className="font-black text-slate-900 text-sm">
                          ₹{order.total_amount_inr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="bg-slate-50/70 px-4 py-2.5 flex justify-between items-center border-t border-slate-100 text-xs">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>View Live Timeline</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      onClick={() => handleRepeatOrder(order)}
                      className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer tap-feedback"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Repeat Order</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
