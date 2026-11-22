import type { Order, OrderStatus, Wallet, WalletTransaction } from '@/lib/supabase/types'
import { createBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { getDynamicConfig } from '@/lib/services/configService'
import {
  SEED_ORDERS,
  SEED_CAFES,
  SEED_WALLETS,
  SEED_WALLET_TRANSACTIONS,
} from '@/lib/data/mockData'

const ORDERS_STORAGE_KEY = 'saga_platform_orders_v3'
const WALLETS_STORAGE_KEY = 'saga_platform_wallets_v3'
const TRANSACTIONS_STORAGE_KEY = 'saga_platform_transactions_v3'

// Event name for reactive cross-component synchronization
export const SAGA_ORDERS_EVENT = 'saga:orders-updated'

let realtimeChannelInitialized = false

/**
 * Initializes real-time two-way synchronization with Supabase cloud
 * Falls back silently and gracefully if Supabase credentials are not configured.
 */
export async function initSupabaseRealtimeSync(): Promise<void> {
  if (typeof window === 'undefined' || realtimeChannelInitialized || !isSupabaseConfigured()) {
    return
  }
  realtimeChannelInitialized = true

  try {
    const supabase = createBrowserClient()

    // 1. Initial cloud hydration
    try {
      const { data: remoteOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (remoteOrders && remoteOrders.length > 0) {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(remoteOrders))
        window.dispatchEvent(
          new CustomEvent(SAGA_ORDERS_EVENT, { detail: { orders: remoteOrders } })
        )
      }
    } catch {
      // Fallback
    }

    try {
      const { data: remoteWallets } = await supabase.from('wallets').select('*')
      if (remoteWallets && remoteWallets.length > 0) {
        localStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(remoteWallets))
        window.dispatchEvent(new CustomEvent(SAGA_ORDERS_EVENT))
      }
    } catch {
      // Fallback
    }

    // 2. Realtime WebSocket subscription
    supabase
      .channel('saga-realtime-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const current = getStoredOrders()
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            if (!current.some((o) => o.id === newOrder.id)) {
              const updated = [newOrder, ...current]
              localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated))
              window.dispatchEvent(
                new CustomEvent(SAGA_ORDERS_EVENT, { detail: { orders: updated } })
              )
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order
            const updated = current.map((o) =>
              o.id === updatedOrder.id ? updatedOrder : o
            )
            localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated))
            window.dispatchEvent(
              new CustomEvent(SAGA_ORDERS_EVENT, { detail: { orders: updated } })
            )
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets' },
        (payload) => {
          const currentWallets = getStoredWallets()
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newWallet = payload.new as Wallet
            const updated = currentWallets.map((w) =>
              w.id === newWallet.id ? newWallet : w
            )
            localStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(updated))
            window.dispatchEvent(new CustomEvent(SAGA_ORDERS_EVENT))
          }
        }
      )
      .subscribe()
  } catch (err) {
    console.warn('[SAGA] Realtime initialization skipped:', err)
  }
}

interface UpsertableTable {
  upsert: (values: Record<string, unknown>) => Promise<unknown>
}

export async function syncOrderToSupabase(order: Order): Promise<void> {
  if (!isSupabaseConfigured() || typeof window === 'undefined') return
  try {
    const supabase = createBrowserClient()
    const payload: Record<string, unknown> = {
      id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      cafe_id: order.cafe_id,
      rider_id: order.rider_id || null,
      items: order.items,
      subtotal_inr: order.subtotal_inr,
      delivery_fee_inr: order.delivery_fee_inr,
      platform_fee_inr: order.platform_fee_inr,
      total_amount_inr: order.total_amount_inr,
      status: order.status,
      delivery_address: order.delivery_address,
      special_instructions: order.special_instructions || null,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      payment_order_id: order.payment_order_id || null,
      payment_session_id: order.payment_session_id || null,
      payment_utr: order.payment_utr || null,
      payment_collected_by: order.payment_collected_by || null,
      delivery_otp: order.delivery_otp || null,
      pickup_photo_url: order.pickup_photo_url || null,
      delivery_photo_url: order.delivery_photo_url || null,
      pickup_timestamp: order.pickup_timestamp || null,
      delivery_timestamp: order.delivery_timestamp || null,
      estimated_delivery_minutes: order.estimated_delivery_minutes || 25,
      created_at: order.created_at,
      updated_at: order.updated_at,
    }
    await (supabase.from('orders') as unknown as UpsertableTable).upsert(payload)
  } catch (err) {
    console.warn('[SAGA] Supabase order sync failed, cached locally:', err)
  }
}

export async function syncWalletToSupabase(wallet: Wallet): Promise<void> {
  if (!isSupabaseConfigured() || typeof window === 'undefined') return
  try {
    const supabase = createBrowserClient()
    const payload: Record<string, unknown> = {
      id: wallet.id,
      user_id: wallet.user_id,
      role: wallet.role,
      cafe_id: wallet.cafe_id || null,
      balance_inr: wallet.balance_inr,
      on_hold_balance_inr: wallet.on_hold_balance_inr,
      total_earned_inr: wallet.total_earned_inr,
      total_withdrawn_inr: wallet.total_withdrawn_inr || 0,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    }
    await (supabase.from('wallets') as unknown as UpsertableTable).upsert(payload)
  } catch (err) {
    console.warn('[SAGA] Supabase wallet sync failed, cached locally:', err)
  }
}

export async function syncTransactionToSupabase(tx: WalletTransaction): Promise<void> {
  if (!isSupabaseConfigured() || typeof window === 'undefined') return
  try {
    const supabase = createBrowserClient()
    const payload: Record<string, unknown> = {
      id: tx.id,
      wallet_id: tx.wallet_id,
      order_id: tx.order_id || null,
      amount_inr: tx.amount_inr,
      type: tx.type,
      status: tx.status,
      settlement_hold_until: tx.settlement_hold_until || null,
      settled_at: tx.settled_at || null,
      description: tx.description || null,
      metadata: tx.metadata || {},
      created_at: tx.created_at,
      updated_at: tx.updated_at,
    }
    await (supabase.from('wallet_transactions') as unknown as UpsertableTable).upsert(payload)
  } catch (err) {
    console.warn('[SAGA] Supabase transaction sync failed, cached locally:', err)
  }
}

/**
 * Retrieve current orders (localStorage fallback to SEED_ORDERS)
 */
export function getStoredOrders(): Order[] {
  if (typeof window === 'undefined') return SEED_ORDERS
  initSupabaseRealtimeSync()
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(SEED_ORDERS))
      return SEED_ORDERS
    }
    return JSON.parse(raw) as Order[]
  } catch {
    return SEED_ORDERS
  }
}

/**
 * Retrieve current wallets
 */
export function getStoredWallets(): Wallet[] {
  if (typeof window === 'undefined') return SEED_WALLETS
  try {
    const raw = localStorage.getItem(WALLETS_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(SEED_WALLETS))
      return SEED_WALLETS
    }
    return JSON.parse(raw) as Wallet[]
  } catch {
    return SEED_WALLETS
  }
}

/**
 * Retrieve wallet transactions
 */
export function getStoredTransactions(): WalletTransaction[] {
  if (typeof window === 'undefined') return SEED_WALLET_TRANSACTIONS
  try {
    const raw = localStorage.getItem(TRANSACTIONS_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(SEED_WALLET_TRANSACTIONS))
      return SEED_WALLET_TRANSACTIONS
    }
    return JSON.parse(raw) as WalletTransaction[]
  } catch {
    return SEED_WALLET_TRANSACTIONS
  }
}

/**
 * Save updated orders and dispatch notification
 */
export function saveOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
    window.dispatchEvent(new CustomEvent(SAGA_ORDERS_EVENT, { detail: { orders } }))
    if (orders[0]) {
      syncOrderToSupabase(orders[0])
    }
  } catch {
    // Ignore
  }
}

/**
 * Save updated wallets
 */
export function saveWallets(wallets: Wallet[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(wallets))
    wallets.forEach((w) => syncWalletToSupabase(w))
  } catch {
    // Ignore
  }
}

/**
 * Save updated transactions
 */
export function saveTransactions(txs: WalletTransaction[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(txs))
    if (txs[0]) {
      syncTransactionToSupabase(txs[0])
    }
  } catch {
    // Ignore
  }
}

/**
 * Find single order by ID or order_number
 */
export function getOrderById(idOrNumber: string): Order | undefined {
  const all = getStoredOrders()
  return all.find(
    (o) =>
      o.id.toLowerCase() === idOrNumber.toLowerCase() ||
      o.order_number.toLowerCase() === idOrNumber.toLowerCase() ||
      o.order_number.toLowerCase() === `saga-${idOrNumber.toLowerCase()}`
  )
}

export interface CreateOrderPayload {
  cafe_id: string
  customer_id?: string
  items: Order['items']
  subtotal_inr: number
  delivery_fee_inr: number
  platform_fee_inr: number
  total_amount_inr: number
  delivery_address: Order['delivery_address']
  special_instructions?: string
  payment_method: 'upi_direct' | 'cashfree_upi' | 'cod' | 'card'
  payment_order_id?: string
  payment_session_id?: string
  payment_utr?: string
  payment_collected_by?: 'online' | 'rider_cash' | 'rider_upi' | null
}

/**
 * Place a new order with automated 4-digit OTP and initial status
 */
export function createNewOrder(payload: CreateOrderPayload): Order {
  const currentOrders = getStoredOrders()
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const newOrderNumber = `SAGA-${randomSuffix}`
  const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000))

  const newOrder: Order = {
    id: `e${randomSuffix}000-0000-4000-c000-${randomSuffix}00000000`,
    order_number: newOrderNumber,
    customer_id: payload.customer_id || '88888888-8888-4888-a888-888888888888',
    cafe_id: payload.cafe_id,
    rider_id: null,
    items: payload.items,
    subtotal_inr: payload.subtotal_inr,
    delivery_fee_inr: payload.delivery_fee_inr,
    platform_fee_inr: payload.platform_fee_inr,
    total_amount_inr: payload.total_amount_inr,
    status: 'placed',
    delivery_address: payload.delivery_address,
    special_instructions: payload.special_instructions || null,
    payment_status: payload.payment_method === 'cod' ? 'pending' : 'paid',
    payment_method: payload.payment_method,
    payment_order_id: payload.payment_order_id || null,
    payment_session_id: payload.payment_session_id || null,
    payment_utr: payload.payment_utr || null,
    payment_collected_by: payload.payment_collected_by || (payload.payment_method === 'cod' ? null : 'online'),
    delivery_otp: deliveryOtp,
    estimated_delivery_minutes: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const updatedOrders = [newOrder, ...currentOrders]
  saveOrders(updatedOrders)

  return newOrder
}

/**
 * Automate status update & triggers:
 * When status transitions to 'delivered':
 *  1. Calculates Cafe Platform Commission (15%)
 *  2. Credits Cafe Owner wallet in 3-day (72h) Escrow hold
 *  3. Credits Rider wallet immediately (₹55 payout)
 *  4. Logs immutable wallet transactions
 */
export function updateOrderStatusAndAutomate(
  orderId: string,
  newStatus: OrderStatus,
  options?: {
    riderId?: string
    pickupPhotoUrl?: string
    deliveryPhotoUrl?: string
    paymentCollectedBy?: 'online' | 'rider_cash' | 'rider_upi'
    paymentUtr?: string
  }
): Order | null {
  const orders = getStoredOrders()
  const targetIndex = orders.findIndex((o) => o.id === orderId)
  if (targetIndex === -1) return null

  const order = orders[targetIndex]
  const updatedOrder: Order = {
    ...order,
    status: newStatus,
    rider_id: options?.riderId !== undefined ? options.riderId : order.rider_id,
    pickup_photo_url: options?.pickupPhotoUrl || order.pickup_photo_url,
    pickup_timestamp: options?.pickupPhotoUrl ? new Date().toISOString() : order.pickup_timestamp,
    delivery_photo_url: options?.deliveryPhotoUrl || order.delivery_photo_url,
    delivery_timestamp: options?.deliveryPhotoUrl ? new Date().toISOString() : order.delivery_timestamp,
    payment_collected_by: options?.paymentCollectedBy || order.payment_collected_by,
    payment_utr: options?.paymentUtr || order.payment_utr,
    payment_status: newStatus === 'delivered' ? 'paid' : order.payment_status,
    updated_at: new Date().toISOString(),
  }

  orders[targetIndex] = updatedOrder
  saveOrders(orders)

  // Trigger automated settlement on 'delivered'
  if (newStatus === 'delivered') {
    handleAutomatedSettlementOnDelivered(updatedOrder)
  }

  return updatedOrder
}

/**
 * Handles wallet credits and 3-day hold logic
 */
function handleAutomatedSettlementOnDelivered(order: Order) {
  const wallets = getStoredWallets()
  const txs = getStoredTransactions()

  const cafe = SEED_CAFES.find((c) => c.id === order.cafe_id)
  const commissionRate = cafe?.commission_rate || 15.0

  // 1. Merchant Net Sales calculation
  const platformCommissionInr = Number(((order.subtotal_inr * commissionRate) / 100).toFixed(2))
  const merchantNetInr = Number((order.subtotal_inr - platformCommissionInr).toFixed(2))

  // 3-Day (72-hour) Escrow Hold Timestamp
  const holdUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  // Find or create Merchant Wallet
  const merchantWalletIndex = wallets.findIndex((w) => w.cafe_id === order.cafe_id)
  if (merchantWalletIndex !== -1) {
    const mw = wallets[merchantWalletIndex]
    wallets[merchantWalletIndex] = {
      ...mw,
      on_hold_balance_inr: Number((mw.on_hold_balance_inr + merchantNetInr).toFixed(2)),
      total_earned_inr: Number((mw.total_earned_inr + merchantNetInr).toFixed(2)),
      updated_at: new Date().toISOString(),
    }
  }

  // Find or create Rider Wallet (assign to default student rider if none assigned)
  const riderId = order.rider_id || '66666666-6666-4666-a666-666666666666'
  const config = getDynamicConfig()
  const riderPayoutInr = config.riderPayoutPerOrderInr || 55.0 // Dynamic student campus courier fee
  const riderWalletIndex = wallets.findIndex((w) => w.user_id === riderId)
  if (riderWalletIndex !== -1) {
    const rw = wallets[riderWalletIndex]
    wallets[riderWalletIndex] = {
      ...rw,
      balance_inr: Number((rw.balance_inr + riderPayoutInr).toFixed(2)),
      total_earned_inr: Number((rw.total_earned_inr + riderPayoutInr).toFixed(2)),
      updated_at: new Date().toISOString(),
    }
  }

  saveWallets(wallets)

  // Create Merchant Escrow Transaction
  const merchantTx: WalletTransaction = {
    id: `tx-m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    wallet_id: merchantWalletIndex !== -1 ? wallets[merchantWalletIndex].id : 'merchant-wallet',
    order_id: order.id,
    amount_inr: merchantNetInr,
    type: 'merchant_credit',
    status: 'held',
    settlement_hold_until: holdUntil,
    description: `Net earnings from order #${order.order_number} (15% platform take-rate ₹${platformCommissionInr} deducted. 3-day hold applied).`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Create Rider Earning Transaction
  const riderTx: WalletTransaction = {
    id: `tx-r-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    wallet_id: riderWalletIndex !== -1 ? wallets[riderWalletIndex].id : 'rider-wallet',
    order_id: order.id,
    amount_inr: riderPayoutInr,
    type: 'rider_earning',
    status: 'available',
    description: `Student courier delivery payout for order #${order.order_number}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  saveTransactions([merchantTx, riderTx, ...txs])
}
