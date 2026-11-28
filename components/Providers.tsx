'use client'

import React, { useEffect } from 'react'
import { AuthProvider } from '@/lib/context/AuthContext'
import { CartProvider } from '@/lib/context/CartContext'
import CartDrawer from '@/components/CartDrawer'
import FloatingCartBar from '@/components/FloatingCartBar'
import ActiveOrderBottomPill from '@/components/ActiveOrderBottomPill'
import BottomNav from '@/components/BottomNav'
import InstallPwaPrompt from '@/components/InstallPwaPrompt'

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('[FoodLo SW] Service worker registration failed:', err)
        })
      })
    }
  }, [])

  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <FloatingCartBar />
        <ActiveOrderBottomPill />
        <CartDrawer />
        <BottomNav />
        <InstallPwaPrompt />
      </CartProvider>
    </AuthProvider>
  )
}
