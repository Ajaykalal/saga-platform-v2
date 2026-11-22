'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, UtensilsCrossed, ShoppingBag, ReceiptText, User } from 'lucide-react'
import { useCart } from '@/lib/context/CartContext'
import { useAuth } from '@/lib/context/AuthContext'

export default function BottomNav() {
  const pathname = usePathname()
  const { totalItems, openCart, activeCafe } = useCart()
  const { user } = useAuth()

  const isHome = pathname === '/'
  const isMenu = pathname.startsWith('/cafe/')
  const isOrders = pathname.startsWith('/orders')
  const isLogin = pathname === '/login' || pathname === '/merchant' || pathname === '/rider' || pathname === '/admin'

  // Target for Menu tab: current cafe or default to Koramangala
  const menuHref = activeCafe ? `/cafe/${activeCafe.slug}` : '/cafe/saga-koramangala'

  // Target for Profile tab
  const profileHref = user
    ? user.role === 'cafe_owner'
      ? '/merchant'
      : user.role === 'rider'
      ? '/rider'
      : user.role === 'admin'
      ? '/admin'
      : '/login'
    : '/login'

  return (
    <nav className="fixed bottom-0 left-0 w-full z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0px_-4px_20px_rgba(0,0,0,0.04)] px-2 py-2">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all tap-feedback ${
            isHome
              ? 'bg-emerald-600 text-white shadow-xs font-semibold'
              : 'text-gray-500 hover:text-emerald-600'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px] mt-0.5">Home</span>
        </Link>

        {/* Menu */}
        <Link
          href={menuHref}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all tap-feedback ${
            isMenu
              ? 'bg-emerald-600 text-white shadow-xs font-semibold'
              : 'text-gray-500 hover:text-emerald-600'
          }`}
        >
          <UtensilsCrossed className="w-5 h-5" />
          <span className="text-[11px] mt-0.5">Menu</span>
        </Link>

        {/* Cart */}
        <button
          onClick={openCart}
          className="relative flex flex-col items-center justify-center py-1 px-3 rounded-full text-gray-500 hover:text-emerald-600 transition-all tap-feedback cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5">Cart</span>
        </button>

        {/* Orders */}
        <Link
          href="/orders"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all tap-feedback ${
            isOrders
              ? 'bg-emerald-600 text-white shadow-xs font-semibold'
              : 'text-gray-500 hover:text-emerald-600'
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[11px] mt-0.5">Orders</span>
        </Link>

        {/* Profile / Switch Role */}
        <Link
          href={profileHref}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all tap-feedback ${
            isLogin
              ? 'bg-emerald-600 text-white shadow-xs font-semibold'
              : 'text-gray-500 hover:text-emerald-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[11px] mt-0.5">
            {user ? (user.role === 'customer' ? 'Profile' : 'Portal') : 'Login'}
          </span>
        </Link>
      </div>
    </nav>
  )
}
