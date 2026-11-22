'use client'

import React from 'react'
import { AuthProvider } from '@/lib/context/AuthContext'
import { CartProvider } from '@/lib/context/CartContext'
import CartDrawer from '@/components/CartDrawer'
import FloatingCartBar from '@/components/FloatingCartBar'
import BottomNav from '@/components/BottomNav'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <FloatingCartBar />
        <CartDrawer />
        <BottomNav />
      </CartProvider>
    </AuthProvider>
  )
}
