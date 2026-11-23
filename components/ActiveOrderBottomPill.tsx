'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bike, ChefHat, Package, Clock, ChevronRight } from 'lucide-react'
import { useCart } from '@/lib/context/CartContext'
import { getStoredOrders, SAGA_ORDERS_EVENT } from '@/lib/services/orderService'
import type { Order } from '@/lib/supabase/types'

export default function ActiveOrderBottomPill() {
  const pathname = usePathname()
  const { totalItems } = useCart()
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)

  // Hide on portals and on the dedicated order tracking screen
  const isHidden =
    pathname.startsWith('/merchant') ||
    pathname.startsWith('/rider') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/orders/')

  useEffect(() => {
    const checkActiveOrders = () => {
      const orders = getStoredOrders()
      const found =
        orders.find((o) =>
          ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(
            o.status
          )
        ) || null
      setActiveOrder(found)
    }

    checkActiveOrders()
    window.addEventListener(SAGA_ORDERS_EVENT, checkActiveOrders)
    window.addEventListener('storage', checkActiveOrders)

    return () => {
      window.removeEventListener(SAGA_ORDERS_EVENT, checkActiveOrders)
      window.removeEventListener('storage', checkActiveOrders)
    }
  }, [])

  if (!activeOrder || isHidden) return null

  // Dynamic status text and icon
  const getStatusInfo = () => {
    switch (activeOrder.status) {
      case 'out_for_delivery':
        return {
          icon: Bike,
          statusBadge: 'Active Order',
          subText: '🚴 Out for Delivery • On the way',
        }
      case 'ready_for_pickup':
        return {
          icon: Package,
          statusBadge: 'Food Packed',
          subText: '📦 Ready & waiting for courier',
        }
      case 'preparing':
        return {
          icon: ChefHat,
          statusBadge: 'Kitchen',
          subText: '🔥 Cooking fresh in kitchen',
        }
      case 'placed':
      case 'confirmed':
      default:
        return {
          icon: Clock,
          statusBadge: 'Order Placed',
          subText: '⏳ Confirmed • Preparing shortly',
        }
    }
  }

  const { icon: StatusIcon, statusBadge, subText } = getStatusInfo()

  // Calculate vertical offset:
  // If cart bar is visible (totalItems > 0), float cleanly above cart bar (~bottom-36);
  // Otherwise sit directly above BottomNav (~56px high, so bottom-16 sm:bottom-18).
  const bottomPositionClass =
    totalItems > 0 ? 'bottom-36 sm:bottom-38' : 'bottom-16 sm:bottom-18'

  return (
    <div
      className={`fixed ${bottomPositionClass} left-0 right-0 z-35 px-3 sm:px-6 pointer-events-none transition-all duration-300 animate-slideIn`}
    >
      <div className="max-w-md mx-auto pointer-events-auto">
        <Link
          href={`/orders/${activeOrder.id}`}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl p-2.5 sm:p-3 px-3.5 sm:px-4 flex items-center justify-between shadow-[0px_8px_30px_rgba(16,185,129,0.35)] border border-emerald-500/60 backdrop-blur-md cursor-pointer tap-feedback transition-all group"
        >
          {/* Left: Icon & Order Status */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0">
              <StatusIcon className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-200" />
              </span>
            </div>

            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full shrink-0">
                  {statusBadge}
                </span>
                <span className="text-xs font-mono font-bold text-white truncate">
                  #{activeOrder.order_number}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-100 font-medium truncate mt-0.5">
                {subText}
              </p>
            </div>
          </div>

          {/* Right: Track Live CTA Pill */}
          <div className="flex items-center gap-1 bg-white text-emerald-800 font-extrabold text-xs px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shadow-xs group-hover:bg-emerald-50 transition-all shrink-0 ml-2">
            <span>Track Live</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  )
}
