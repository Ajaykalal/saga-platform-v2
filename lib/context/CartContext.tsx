'use client'

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import type { MenuItem, UserAddress } from '@/lib/supabase/types'
import {
  getActiveAddress,
  setActiveAddress as persistActiveAddress,
  calculateDeliveryFee,
  MIN_ORDER_VALUE_INR,
  SAGA_ADDRESS_EVENT,
  DeliveryCalculation,
} from '@/lib/services/addressService'

export interface CartItem {
  id: string
  cafeId: string
  cafeName: string
  cafeSlug: string
  name: string
  price: number
  quantity: number
  imageUrl: string
  isVeg: boolean
  category: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: MenuItem, cafe: { id: string; name: string; slug: string }) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, delta: number) => void
  clearCart: () => void
  getItemQuantity: (itemId: string) => number
  totalItems: number
  subtotal: number
  deliveryFee: number
  platformFee: number
  grandTotal: number
  specialInstructions: string
  setSpecialInstructions: (val: string) => void
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
  openCart: () => void
  closeCart: () => void
  activeCafe: { id: string; name: string; slug: string } | null
  // User Address & Distance-based delivery
  activeAddress: UserAddress
  switchAddress: (addressId: string) => void
  refreshAddress: () => void
  deliveryInfo: DeliveryCalculation
  isDeliverable: boolean
  minOrderValue: number
  isBelowMinimumOrder: boolean
  amountNeededForMinimum: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'saga_cart_v1'
const CART_INSTRUCTIONS_KEY = 'saga_cart_instructions_v1'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [specialInstructions, setSpecialInstructions] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    try {
      return localStorage.getItem(CART_INSTRUCTIONS_KEY) || ''
    } catch {
      return ''
    }
  })

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false)
  const [activeAddress, setActiveAddressState] = useState<UserAddress>(() => getActiveAddress())

  // Refresh active address on mount & storage/custom events
  const refreshAddress = useCallback(() => {
    setActiveAddressState(getActiveAddress())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleAddressEvent = (event: Event) => {
      const custom = event as CustomEvent<{ activeAddress?: UserAddress }>
      if (custom.detail?.activeAddress) {
        setActiveAddressState(custom.detail.activeAddress)
      } else {
        refreshAddress()
      }
    }
    window.addEventListener(SAGA_ADDRESS_EVENT, handleAddressEvent)
    window.addEventListener('storage', handleAddressEvent)
    return () => {
      window.removeEventListener(SAGA_ADDRESS_EVENT, handleAddressEvent)
      window.removeEventListener('storage', handleAddressEvent)
    }
  }, [refreshAddress])

  const switchAddress = useCallback((addressId: string) => {
    const updated = persistActiveAddress(addressId)
    if (updated) {
      setActiveAddressState(updated)
    }
  }, [])

  // Persist cart changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
      localStorage.setItem(CART_INSTRUCTIONS_KEY, specialInstructions)
    } catch {
      // ignore storage quota errors
    }
  }, [items, specialInstructions])

  const activeCafe = useMemo(() => {
    if (items.length === 0) return null
    return {
      id: items[0].cafeId,
      name: items[0].cafeName,
      slug: items[0].cafeSlug,
    }
  }, [items])

  const totalItems = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity, 0)
  }, [items])

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0)
  }, [items])

  // Distance-based delivery fee computation
  const deliveryInfo = useMemo(() => {
    const distanceKm = activeAddress?.distance_km ?? 2.8
    return calculateDeliveryFee(distanceKm)
  }, [activeAddress?.distance_km])

  const deliveryFee = useMemo(() => {
    if (items.length === 0) return 0
    return deliveryInfo.fee
  }, [deliveryInfo.fee, items.length])

  const platformFee = useMemo(() => {
    return items.length > 0 ? 5 : 0
  }, [items.length])

  const grandTotal = useMemo(() => {
    if (items.length === 0) return 0
    return subtotal + deliveryFee + platformFee
  }, [subtotal, deliveryFee, platformFee, items.length])

  // Minimum Order Value Rules
  const minOrderValue = MIN_ORDER_VALUE_INR
  const isBelowMinimumOrder = useMemo(() => {
    return subtotal > 0 && subtotal < MIN_ORDER_VALUE_INR
  }, [subtotal])

  const amountNeededForMinimum = useMemo(() => {
    return Math.max(0, MIN_ORDER_VALUE_INR - subtotal)
  }, [subtotal])

  const addItem = (item: MenuItem, cafe: { id: string; name: string; slug: string }) => {
    setItems((prev) => {
      if (prev.length > 0 && prev[0].cafeId !== cafe.id) {
        const confirmSwitch = window.confirm(
          `Your cart contains items from ${prev[0].cafeName}. Discard cart and start a new order from ${cafe.name}?`
        )
        if (!confirmSwitch) return prev

        return [
          {
            id: item.id,
            cafeId: cafe.id,
            cafeName: cafe.name,
            cafeSlug: cafe.slug,
            name: item.name,
            price: Number(item.price_inr),
            quantity: 1,
            imageUrl: item.image_url,
            isVeg: item.is_veg,
            category: item.category,
          },
        ]
      }

      const existingIndex = prev.findIndex((i) => i.id === item.id)
      if (existingIndex > -1) {
        const next = [...prev]
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        }
        return next
      }

      return [
        ...prev,
        {
          id: item.id,
          cafeId: cafe.id,
          cafeName: cafe.name,
          cafeSlug: cafe.slug,
          name: item.name,
          price: Number(item.price_inr),
          quantity: 1,
          imageUrl: item.image_url,
          isVeg: item.is_veg,
          category: item.category,
        },
      ]
    })
  }

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta
            return nextQty > 0 ? { ...item, quantity: nextQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    })
  }

  const clearCart = () => {
    setItems([])
    setSpecialInstructions('')
  }

  const getItemQuantity = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    return item ? item.quantity : 0
  }

  const openCart = () => setIsCartOpen(true)
  const closeCart = () => setIsCartOpen(false)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemQuantity,
        totalItems,
        subtotal,
        deliveryFee,
        platformFee,
        grandTotal,
        specialInstructions,
        setSpecialInstructions,
        isCartOpen,
        setIsCartOpen,
        openCart,
        closeCart,
        activeCafe,
        activeAddress,
        switchAddress,
        refreshAddress,
        deliveryInfo,
        isDeliverable: deliveryInfo.isDeliverable,
        minOrderValue,
        isBelowMinimumOrder,
        amountNeededForMinimum,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
