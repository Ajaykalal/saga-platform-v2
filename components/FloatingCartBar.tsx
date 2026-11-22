'use client'

import React from 'react'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '@/lib/context/CartContext'

export default function FloatingCartBar() {
  const { totalItems, grandTotal, openCart, activeCafe, isBelowMinimumOrder, amountNeededForMinimum } = useCart()

  if (totalItems === 0) return null

  return (
    <div className="fixed bottom-20 left-0 right-0 z-30 px-4 sm:px-6 pointer-events-none transition-all duration-300">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div
          onClick={openCart}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl p-3.5 sm:px-5 flex items-center justify-between shadow-[0px_10px_30px_rgba(16,185,129,0.3)] cursor-pointer tap-feedback border border-emerald-500/40 transition-all"
        >
          {/* Left item details */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
              <span className="absolute -top-1.5 -right-1.5 bg-white text-emerald-700 text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {totalItems}
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs text-emerald-100 font-medium line-clamp-1">
                {isBelowMinimumOrder ? (
                  <span className="text-amber-200 font-bold">
                    Add ₹{amountNeededForMinimum.toFixed(0)} for Min ₹200 order
                  </span>
                ) : (
                  `${activeCafe?.name || 'FoodLo'} • ${totalItems} ${totalItems === 1 ? 'item' : 'items'}`
                )}
              </span>
              <span className="text-base font-extrabold tracking-tight">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-1.5 bg-white text-emerald-700 font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl shadow-xs">
            <span>{isBelowMinimumOrder ? 'Checkout' : 'View Cart'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  )
}
