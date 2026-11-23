'use client'

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { Store, X } from 'lucide-react'
import type { MenuItem, UserAddress } from '@/lib/supabase/types'
import {
  getActiveAddress,
  setActiveAddress as persistActiveAddress,
  calculateDeliveryFee,
  MIN_ORDER_VALUE_INR,
  SAGA_ADDRESS_EVENT,
  DeliveryCalculation,
} from '@/lib/services/addressService'
import {
  getDynamicConfig,
  SAGA_CONFIG_EVENT,
  type DynamicPlatformConfig,
} from '@/lib/services/configService'
import {
  validateAndApplyCoupon,
  type PromoCoupon,
  type CouponValidationResult,
} from '@/lib/services/promoService'

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
  // Promo / Coupon Engine
  appliedCoupon: PromoCoupon | null
  discountAmount: number
  couponFeedback: { text: string; isError: boolean } | null
  applyPromoCode: (code: string) => CouponValidationResult
  removePromoCode: () => void
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
  const [platformConfig, setPlatformConfig] = useState<DynamicPlatformConfig>(() => getDynamicConfig())
  const [appliedCoupon, setAppliedCoupon] = useState<PromoCoupon | null>(null)
  const [couponFeedback, setCouponFeedback] = useState<{ text: string; isError: boolean } | null>(null)

  // Multi-cafe switch conflict modal state
  const [conflictModalData, setConflictModalData] = useState<{
    pendingItem: MenuItem
    pendingCafe: { id: string; name: string; slug: string }
    currentCafeName: string
  } | null>(null)

  // Dynamic configuration listener
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleConfigEvent = () => {
      setPlatformConfig(getDynamicConfig())
    }
    window.addEventListener(SAGA_CONFIG_EVENT, handleConfigEvent)
    window.addEventListener('storage', handleConfigEvent)
    return () => {
      window.removeEventListener(SAGA_CONFIG_EVENT, handleConfigEvent)
      window.removeEventListener('storage', handleConfigEvent)
    }
  }, [])

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
    return items.length > 0 ? (platformConfig.platformFeeInr || 5) : 0
  }, [items.length, platformConfig.platformFeeInr])

  // Promo Discount Calculation
  const discountAmount = useMemo(() => {
    if (!appliedCoupon || subtotal <= 0) return 0
    if (subtotal < appliedCoupon.minOrderAmount) {
      return 0
    }
    if (appliedCoupon.discountType === 'flat') {
      return Math.min(appliedCoupon.discountValue, subtotal)
    }
    // Percentage discount
    const pct = Math.round((subtotal * appliedCoupon.discountValue) / 100)
    const capped = appliedCoupon.maxDiscountAmount ? Math.min(pct, appliedCoupon.maxDiscountAmount) : pct
    return Math.min(capped, subtotal)
  }, [appliedCoupon, subtotal])

  const grandTotal = useMemo(() => {
    if (items.length === 0) return 0
    return Math.max(0, subtotal - discountAmount + deliveryFee + platformFee)
  }, [subtotal, discountAmount, deliveryFee, platformFee, items.length])

  // Minimum Order Value Rules (Dynamic from Admin Configuration)
  const minOrderValue = platformConfig.minOrderAmountInr || MIN_ORDER_VALUE_INR
  const isBelowMinimumOrder = useMemo(() => {
    return subtotal > 0 && subtotal < minOrderValue
  }, [subtotal, minOrderValue])

  const amountNeededForMinimum = useMemo(() => {
    return Math.max(0, minOrderValue - subtotal)
  }, [subtotal, minOrderValue])

  const addItem = (item: MenuItem, cafe: { id: string; name: string; slug: string }) => {
    // If cart contains items from a different cafe, trigger customer-friendly conflict modal
    if (items.length > 0 && items[0].cafeId !== cafe.id) {
      setConflictModalData({
        pendingItem: item,
        pendingCafe: cafe,
        currentCafeName: items[0].cafeName,
      })
      return
    }

    setItems((prev) => {
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

  const handleConfirmSwitch = () => {
    if (!conflictModalData) return
    const { pendingItem, pendingCafe } = conflictModalData
    setItems([
      {
        id: pendingItem.id,
        cafeId: pendingCafe.id,
        cafeName: pendingCafe.name,
        cafeSlug: pendingCafe.slug,
        name: pendingItem.name,
        price: Number(pendingItem.price_inr),
        quantity: 1,
        imageUrl: pendingItem.image_url,
        isVeg: pendingItem.is_veg,
        category: pendingItem.category,
      },
    ])
    setConflictModalData(null)
  }

  const handleCancelSwitch = () => {
    setConflictModalData(null)
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
    setAppliedCoupon(null)
    setCouponFeedback(null)
  }

  const applyPromoCode = useCallback(
    (code: string): CouponValidationResult => {
      const result = validateAndApplyCoupon(code, subtotal, activeCafe?.id)
      if (result.valid && result.coupon) {
        setAppliedCoupon(result.coupon)
        setCouponFeedback({ text: result.message, isError: false })
      } else {
        setCouponFeedback({ text: result.message, isError: true })
      }
      return result
    },
    [subtotal, activeCafe?.id]
  )

  const removePromoCode = useCallback(() => {
    setAppliedCoupon(null)
    setCouponFeedback(null)
  }, [])

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
        appliedCoupon,
        discountAmount,
        couponFeedback,
        applyPromoCode,
        removePromoCode,
      }}
    >
      {children}

      {/* Multi-Cafe Switch Modal (Replacing browser confirm with customer-friendly Option C copy) */}
      {conflictModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 text-center animate-scaleIn relative overflow-hidden">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={handleCancelSwitch}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mb-3 shadow-xs">
              <Store className="w-7 h-7" />
            </div>

            {/* Heading matching user Option C */}
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              One cafe per order
            </h3>

            {/* Message matching user Option C */}
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Food delivery works from one cafe at a time. To add food from{' '}
              <span className="font-extrabold text-slate-900">
                {conflictModalData.pendingCafe.name}
              </span>
              , please clear your current cart.
            </p>

            {/* Cart comparison snapshot */}
            <div className="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-left space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Current cart:
                </span>
                <span className="font-bold text-slate-800 truncate max-w-[130px]">
                  {conflictModalData.currentCafeName}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  New dish:
                </span>
                <span className="font-bold text-emerald-700 truncate max-w-[130px]">
                  {conflictModalData.pendingItem.name}
                </span>
              </div>
            </div>

            {/* Action Buttons matching user Option C */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCancelSwitch}
                className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer tap-feedback"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitch}
                className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md transition-colors cursor-pointer tap-feedback"
              >
                Clear Cart &amp; Add
              </button>
            </div>
          </div>
        </div>
      )}
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
