'use client'

import { getStoredOrders, saveOrders, getStoredWallets, saveWallets, getStoredTransactions, saveTransactions } from '@/lib/services/orderService'
import { SEED_CAFES, SEED_RIDERS } from '@/lib/data/mockData'
import type { WalletTransaction } from '@/lib/supabase/types'

export interface OrderRating {
  orderId: string
  orderNumber: string
  cafeId: string
  cafeName?: string
  riderId?: string | null
  riderName?: string
  foodRating: number // 1 to 5
  riderRating: number // 1 to 5
  riderTipInr: number // 0, 10, 20, 30, 50, etc.
  reviewText?: string
  createdAt: string
}

export const RATINGS_STORAGE_KEY = 'saga_order_ratings_v1'
export const SAGA_RATINGS_EVENT = 'saga:ratings:updated'

/**
 * Retrieve all submitted ratings
 */
export function getAllRatings(): OrderRating[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RATINGS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OrderRating[]) : []
  } catch {
    return []
  }
}

/**
 * Get rating for a specific order
 */
export function getOrderRating(orderId: string): OrderRating | null {
  const all = getAllRatings()
  return all.find((r) => r.orderId === orderId) || null
}

/**
 * Submit feedback for food and courier experience, with optional rider tip
 */
export function submitOrderRating(payload: {
  orderId: string
  orderNumber: string
  cafeId: string
  cafeName?: string
  riderId?: string | null
  riderName?: string
  foodRating: number
  riderRating: number
  riderTipInr?: number
  reviewText?: string
}): OrderRating {
  const allRatings = getAllRatings()
  const riderTip = Math.max(0, Number(payload.riderTipInr || 0))

  const newRating: OrderRating = {
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    cafeId: payload.cafeId,
    cafeName: payload.cafeName || 'Saga Cafe',
    riderId: payload.riderId || null,
    riderName: payload.riderName || 'Vikram Singh',
    foodRating: Math.min(5, Math.max(1, payload.foodRating)),
    riderRating: Math.min(5, Math.max(1, payload.riderRating)),
    riderTipInr: riderTip,
    reviewText: payload.reviewText?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }

  // 1. Save Rating to ratings store
  const existingIdx = allRatings.findIndex((r) => r.orderId === payload.orderId)
  let updatedRatings: OrderRating[]
  if (existingIdx !== -1) {
    updatedRatings = [...allRatings]
    updatedRatings[existingIdx] = newRating
  } else {
    updatedRatings = [newRating, ...allRatings]
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(updatedRatings))
      window.dispatchEvent(new CustomEvent(SAGA_RATINGS_EVENT, { detail: { rating: newRating } }))
    } catch {
      // ignore
    }
  }

  // 2. Update Cafe Rating dynamically
  try {
    const cafe = SEED_CAFES.find((c) => c.id === payload.cafeId)
    if (cafe) {
      const oldCount = cafe.rating_count || 120
      const oldRating = cafe.rating || 4.8
      const newAvg = Number((((oldRating * oldCount) + newRating.foodRating) / (oldCount + 1)).toFixed(1))
      cafe.rating = newAvg
      cafe.rating_count = oldCount + 1
    }
  } catch {
    // ignore
  }

  // 3. Update Rider Rating and credit Rider Tip (if any)
  const riderId = payload.riderId || '66666666-6666-4666-a666-666666666666'
  try {
    const rider = SEED_RIDERS.find((r) => r.id === riderId)
    if (rider) {
      const oldCount = rider.lifetimeDeliveries || 240
      const oldRating = rider.rating || 4.9
      const newRiderAvg = Number((((oldRating * oldCount) + newRating.riderRating) / (oldCount + 1)).toFixed(1))
      rider.rating = newRiderAvg
    }
  } catch {
    // ignore
  }

  // 4. Credit Rider Tip directly to Rider's Wallet
  if (riderTip > 0) {
    try {
      const wallets = getStoredWallets()
      const txs = getStoredTransactions()
      const riderWalletIdx = wallets.findIndex((w) => w.user_id === riderId || w.role === 'rider')

      if (riderWalletIdx !== -1) {
        const rw = wallets[riderWalletIdx]
        wallets[riderWalletIdx] = {
          ...rw,
          balance_inr: Number((rw.balance_inr + riderTip).toFixed(2)),
          total_earned_inr: Number((rw.total_earned_inr + riderTip).toFixed(2)),
          updated_at: new Date().toISOString(),
        }
        saveWallets(wallets)

        const tipTx: WalletTransaction = {
          id: `tx-tip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          wallet_id: rw.id,
          order_id: payload.orderId,
          amount_inr: riderTip,
          type: 'rider_earning',
          status: 'available',
          description: `Customer gratuity / tip for order #${payload.orderNumber}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        saveTransactions([tipTx, ...txs])
      }
    } catch {
      // ignore
    }
  }

  // 5. Update Order with customer rating snapshot
  try {
    const orders = getStoredOrders()
    const targetIdx = orders.findIndex((o) => o.id === payload.orderId)
    if (targetIdx !== -1) {
      orders[targetIdx].customer_rating = {
        food_rating: newRating.foodRating,
        rider_rating: newRating.riderRating,
        tip_inr: newRating.riderTipInr,
        review: newRating.reviewText,
        submitted_at: newRating.createdAt,
      }
      saveOrders(orders)
    }
  } catch {
    // ignore
  }

  return newRating
}
