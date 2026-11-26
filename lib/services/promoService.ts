'use client'

export interface PromoCoupon {
  id: string
  code: string
  discountType: 'flat' | 'percentage'
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount?: number
  description: string
  cafeId?: string | null // null for all network cafes
  cafeName?: string
  applicableCategory?: string | null // 'All' or specific category e.g. 'Pizza', 'Burger', 'Maggi', 'Beverages'
  validDays?: string[] | null // null or ['All Days'] or ['Weekends'] or ['Weekdays'] or ['Monday', 'Tuesday', etc.]
  expiryDate?: string | null
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
    applicableCategory: 'All',
    validDays: ['All Days'],
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
    applicableCategory: 'All',
    validDays: ['All Days'],
    isActive: true,
    usageCount: 289,
    createdBy: 'admin',
    createdAt: '2026-01-15T12:00:00Z',
  },
  {
    id: 'coupon-weekend-40',
    code: 'WEEKEND40',
    discountType: 'flat',
    discountValue: 40,
    minOrderAmount: 240,
    description: 'Flat ₹40 OFF Saturday & Sunday Weekend Special',
    cafeId: null,
    cafeName: 'All Network Cafes',
    applicableCategory: 'All',
    validDays: ['Weekends'],
    isActive: true,
    usageCount: 112,
    createdBy: 'admin',
    createdAt: '2026-02-01T12:00:00Z',
  },
  {
    id: 'coupon-pizza-50',
    code: 'PIZZA50',
    discountType: 'flat',
    discountValue: 50,
    minOrderAmount: 280,
    description: 'Flat ₹50 OFF on Wood-Fired & Fresh Dough Pizzas above ₹280',
    cafeId: null,
    cafeName: 'All Network Cafes',
    applicableCategory: 'Pizza',
    validDays: ['All Days'],
    isActive: true,
    usageCount: 78,
    createdBy: 'admin',
    createdAt: '2026-02-10T12:00:00Z',
  },
  {
    id: 'coupon-msv-100',
    code: 'MEESAAVI100',
    discountType: 'flat',
    discountValue: 100,
    minOrderAmount: 500,
    description: 'Flat ₹100 OFF on orders above ₹500 at Meesaavi Cafe and Restro',
    cafeId: 'c1111111-1111-4111-b111-111111111111',
    cafeName: 'Meesaavi Cafe and Restro',
    applicableCategory: 'All',
    validDays: ['All Days'],
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

export interface CartItemSnippet {
  name?: string
  category?: string
  price: number
  quantity: number
}

/**
 * Validate and calculate discount for a coupon code
 */
export function validateAndApplyCoupon(
  code: string,
  subtotal: number,
  cafeId?: string,
  cartItems?: CartItemSnippet[]
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

  // 1. Cafe Exclusivity Check
  if (coupon.cafeId && cafeId && coupon.cafeId !== cafeId) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Coupon "${cleanCode}" is only valid at ${coupon.cafeName || 'its specific cafe'}.`,
    }
  }

  // 2. Day-of-the-Week Check (e.g. Weekends, Weekdays, or specific day)
  if (coupon.validDays && coupon.validDays.length > 0 && !coupon.validDays.includes('All Days')) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const todayIndex = new Date().getDay()
    const todayName = dayNames[todayIndex]
    const isWeekend = todayIndex === 0 || todayIndex === 6
    const isWeekday = !isWeekend

    const isAllowedDay = coupon.validDays.some((day) => {
      if (day === 'Weekends' && isWeekend) return true
      if (day === 'Weekdays' && isWeekday) return true
      if (day.toLowerCase() === todayName.toLowerCase()) return true
      return false
    })

    if (!isAllowedDay) {
      const allowedStr = coupon.validDays.join(', ')
      return {
        valid: false,
        discountAmount: 0,
        message: `Coupon "${cleanCode}" is only valid on ${allowedStr} (Today is ${todayName}).`,
      }
    }
  }

  // 3. Category / Specific Meal Check (e.g. Pizza, Burger, Maggi, Beverages)
  if (
    coupon.applicableCategory &&
    coupon.applicableCategory !== 'All' &&
    cartItems &&
    cartItems.length > 0
  ) {
    const targetCategory = coupon.applicableCategory.toLowerCase()
    const hasCategoryItem = cartItems.some(
      (item) => item.category && item.category.toLowerCase().includes(targetCategory)
    )

    if (!hasCategoryItem) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Coupon "${cleanCode}" is only valid for "${coupon.applicableCategory}" items. Add a ${coupon.applicableCategory} to qualify!`,
      }
    }
  }

  // 4. Minimum Order Value Check
  if (subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Add ₹${coupon.minOrderAmount - subtotal} more to apply ${cleanCode} (Min order ₹${coupon.minOrderAmount}).`,
    }
  }

  // 5. Calculate discount
  let discount = 0
  if (coupon.discountType === 'flat') {
    discount = coupon.discountValue
  } else {
    discount = Math.round((subtotal * coupon.discountValue) / 100)
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount
    }
  }

  // Discount cannot exceed subtotal
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
  applicableCategory?: string | null
  validDays?: string[] | null
  expiryDate?: string | null
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
    applicableCategory: payload.applicableCategory || 'All',
    validDays: payload.validDays && payload.validDays.length > 0 ? payload.validDays : ['All Days'],
    expiryDate: payload.expiryDate || null,
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
