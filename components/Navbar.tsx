'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Utensils,
  MapPin,
  ShoppingBag,
  Clock,
  User,
  Shield,
  Store,
  Bike,
  ChevronDown,
} from 'lucide-react'
import { useCart } from '@/lib/context/CartContext'
import { useAuth } from '@/lib/context/AuthContext'
import AddressModal from '@/components/AddressModal'

interface NavbarProps {
  cafeName?: string
  deliveryTime?: number
  isOpen?: boolean
  showBack?: boolean
}

export default function Navbar({
  cafeName,
  deliveryTime = 25,
  isOpen = true,
  showBack = false,
}: NavbarProps) {
  const { totalItems, grandTotal, openCart, activeAddress } = useCart()
  const { user } = useAuth()
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)

  // Determine portal link based on user role
  const portalInfo = React.useMemo(() => {
    if (!user) return { href: '/login', label: 'Login', icon: User }
    if (user.role === 'cafe_owner') return { href: '/merchant', label: 'Merchant POS', icon: Store }
    if (user.role === 'rider') return { href: '/rider', label: 'Rider App', icon: Bike }
    if (user.role === 'admin') return { href: '/admin', label: 'Admin Panel', icon: Shield }
    return { href: '/login', label: 'Profile', icon: User }
  }, [user])

  const PortalIcon = portalInfo.icon

  return (
    <header className="sticky top-0 left-0 w-full z-40 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-xs transition-all">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand or Back */}
        <div className="flex items-center gap-3">
          {showBack && (
            <Link
              href="/"
              className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors tap-feedback"
              aria-label="Back to storefront"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
          )}

          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:bg-emerald-700 transition-colors">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-gray-900 leading-tight">
                {cafeName ? cafeName : 'FoodLo'}
              </span>
              <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-500" />
                Bengaluru • Multi-Storefront
              </span>
            </div>
          </Link>
        </div>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Delivery Address Pill */}
          <button
            type="button"
            onClick={() => setIsAddressModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition-all text-xs font-semibold cursor-pointer max-w-[150px] sm:max-w-[210px] truncate"
            title="Change Delivery Address"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              <strong className="text-slate-900">{activeAddress?.label || 'Deliver'}:</strong>{' '}
              {activeAddress?.area_street?.split(',')[0] || 'Koramangala'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {/* Operating Status Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">
              {isOpen ? 'Open Now' : 'Closed'}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              {deliveryTime} min
            </span>
          </div>

          {/* Role Portal / Profile Link */}
          <Link
            href={portalInfo.href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 transition-all text-xs font-bold tap-feedback"
          >
            <PortalIcon className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">{portalInfo.label}</span>
          </Link>

          {/* Cart Trigger */}
          <button
            onClick={openCart}
            className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 transition-all tap-feedback cursor-pointer"
            aria-label="View Cart"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-scaleIn">
                  {totalItems}
                </span>
              )}
            </div>
            {totalItems > 0 ? (
              <span className="text-xs font-bold text-gray-900 hidden sm:inline">
                ₹{grandTotal}
              </span>
            ) : (
              <span className="text-xs font-semibold text-gray-700 hidden sm:inline">
                Cart
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Delivery Address Management Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />
    </header>
  )
}
