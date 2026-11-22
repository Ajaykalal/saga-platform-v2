'use client'

export interface PromoCoupon {
  id: string
  code: string
  discountType: 'flat' | 'percentage'
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount?: number
  description: string
  cafeId?: string | null // null for all cafes
  cafeName?: string
  isActive: boolean
  usageCount: number
  createdBy: 'admin' | 'cafe_owner'
  createdAt: string
}

export const SEED_COUPONS: PromoCoupon[] = [
  {
    id: 'coupon-foodlo-50',
    code: 'FOODLO50',
    discountType: 'flat',
    discountValue: 50,
    minOrderAmount: 250,
    description: 'Flat ₹50 OFF on fresh local food & cafe orders above ₹250',
    cafeId: null,
    cafeName: 'All Network Cafes',
    isActive: true,
    usageCount: 142,
    createdBy: 'admin',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'coupon-saga-50',
    code: 'SAGA50',
    discountType: 'flat',
    discountValue: 50,
    minOrderAmount: 250,
    description: 'Flat ₹50 OFF on fresh orders above ₹250',
    cafeId: null,
    cafeName: 'All Network Cafes',
    isActive: true,
    usageCount: 142,
    createdBy: 'admin',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'coupon-campus-20',
    code: 'CAMPUS20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 200,
    maxDiscountAmount: 80,
    description: '20% OFF (Up to ₹80) Student Campus Special',
    cafeId: null,
    cafeName: 'All Network Cafes',
    isActive: true,
    usageCount: 289,
    createdBy: 'admin',
    createdAt: '2026-01-15T12:00:00Z',
  },
  {
    id: 'coupon-welcome-20',
    code: 'WELCOME20',
    discountType: 'flat',
    discountValue: 40,
    minOrderAmount: 200,
    description: 'Flat ₹40 OFF on your fresh cafe feast',
    cafeId: null,
    cafeName: 'All Network Cafes',
    isActive: true,
    usageCount: 95,
    createdBy: 'admin',
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'coupon-kmg-100',
    code: 'KORAMANGALA100',
    discountType: 'flat',
    discountValue: 100,
    minOrderAmount: 500,
    description: 'Flat ₹100 OFF on orders above ₹500 at Saga Koramangala',
    cafeId: 'c1111111-1111-4111-b111-111111111111',
    cafeName: 'Saga Cafe - Koramangala',
    isActive: true,
    usageCount: 38,
    createdBy: 'cafe_owner',
    createdAt: '2026-02-15T14:30:00Z',
  },
]

export const PROMO_STORAGE_KEY = 'saga_promo_coupons_v1'
export const SAGA_PROMO_EVENT = 'saga:promo:updated'

/**
 * Retrieve current active promo coupons
 */
export function getStoredCoupons(): PromoCoupon[] {
  if (typeof window === 'undefined') return SEED_COUPONS
  try {
    const raw = localStorage.getItem(PROMO_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(SEED_COUPONS))
      return SEED_COUPONS
    }
    return JSON.parse(raw) as PromoCoupon[]
  } catch {
    return SEED_COUPONS
  }
}

/**
 * Persist coupons list and broadcast update
 */
export function saveCoupons(coupons: PromoCoupon[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(coupons))
    window.dispatchEvent(new CustomEvent(SAGA_PROMO_EVENT, { detail: { coupons } }))
  } catch {
    // ignore
  }
}

export interface CouponValidationResult {
  valid: boolean
  discountAmount: number
  message: string
  coupon?: PromoCoupon
}

/**
 * Validate and calculate discount for a coupon code
 */
export function validateAndApplyCoupon(
  code: string,
  subtotal: number,
  cafeId?: string
): CouponValidationResult {
  const cleanCode = code.trim().toUpperCase()
  if (!cleanCode) {
    return { valid: false, discountAmount: 0, message: 'Please enter a coupon code.' }
  }

  const coupons = getStoredCoupons()
  const coupon = coupons.find((c) => c.code.toUpperCase() === cleanCode)

  if (!coupon) {
    return { valid: false, discountAmount: 0, message: `Coupon "${cleanCode}" is invalid.` }
  }

  if (!coupon.isActive) {
    return { valid: false, discountAmount: 0, message: `Coupon "${cleanCode}" has expired or is inactive.` }
  }

  if (coupon.cafeId && cafeId && coupon.cafeId !== cafeId) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Coupon "${cleanCode}" is only valid at ${coupon.cafeName || 'its specific cafe'}.`,
    }
  }

  if (subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Add ₹${coupon.minOrderAmount - subtotal} more to apply ${cleanCode} (Min order ₹${coupon.minOrderAmount}).`,
    }
  }

  // Calculate discount
  let discount = 0
  if (coupon.discountType === 'flat') {
    discount = coupon.discountValue
  } else {
    // Percentage discount
    discount = Math.round((subtotal * coupon.discountValue) / 100)
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount
    }
  }

  // Ensure discount does not exceed subtotal
  discount = Math.min(discount, subtotal)

  return {
    valid: true,
    discountAmount: discount,
    message: `🎉 Coupon applied: You saved ₹${discount}!`,
    coupon,
  }
}

/**
 * Increment usage counter for a coupon upon successful checkout
 */
export function recordCouponUsage(code: string): void {
  const coupons = getStoredCoupons()
  const cleanCode = code.trim().toUpperCase()
  const updated = coupons.map((c) =>
    c.code.toUpperCase() === cleanCode ? { ...c, usageCount: c.usageCount + 1 } : c
  )
  saveCoupons(updated)
}

/**
 * Create a new coupon (from Admin or Cafe Owner)
 */
export function createCoupon(payload: {
  code: string
  discountType: 'flat' | 'percentage'
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount?: number
  description: string
  cafeId?: string | null
  cafeName?: string
  createdBy: 'admin' | 'cafe_owner'
}): PromoCoupon {
  const coupons = getStoredCoupons()
  const newCoupon: PromoCoupon = {
    id: 'coupon-' + Date.now(),
    code: payload.code.trim().toUpperCase(),
    discountType: payload.discountType,
    discountValue: Number(payload.discountValue),
    minOrderAmount: Number(payload.minOrderAmount),
    maxDiscountAmount: payload.maxDiscountAmount ? Number(payload.maxDiscountAmount) : undefined,
    description: payload.description.trim(),
    cafeId: payload.cafeId || null,
    cafeName: payload.cafeName || 'All Network Cafes',
    isActive: true,
    usageCount: 0,
    createdBy: payload.createdBy,
    createdAt: new Date().toISOString(),
  }

  const updated = [newCoupon, ...coupons]
  saveCoupons(updated)
  return newCoupon
}

/**
 * Toggle a coupon active / inactive
 */
export function toggleCoupon(id: string): PromoCoupon | null {
  const coupons = getStoredCoupons()
  let target: PromoCoupon | null = null
  const updated = coupons.map((c) => {
    if (c.id === id) {
      target = { ...c, isActive: !c.isActive }
      return target
    }
    return c
  })
  saveCoupons(updated)
  return target
}

/**
 * Delete a coupon
 */
export function deleteCoupon(id: string): boolean {
  const coupons = getStoredCoupons()
  const filtered = coupons.filter((c) => c.id !== id)
  if (filtered.length !== coupons.length) {
    saveCoupons(filtered)
    return true
  }
  return false
}
