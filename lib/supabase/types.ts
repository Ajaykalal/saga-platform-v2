export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'customer' | 'cafe_owner' | 'rider' | 'admin' | 'platform'
export type KycStatus = 'pending' | 'approved' | 'rejected'
export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type TransactionType =
  | 'merchant_credit'
  | 'merchant_payout'
  | 'settlement_release'
  | 'rider_earning'
  | 'rider_payout'
  | 'commission_deduction'
  | 'refund'
export type TransactionStatus =
  | 'held'
  | 'available'
  | 'settled'
  | 'withdrawn'
  | 'cancelled'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  email?: string | null
  phone: string
  whatsapp_number: string
  is_phone_verified: boolean
  is_whatsapp_verified: boolean
  is_online?: boolean
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

export interface Cafe {
  id: string
  owner_id?: string | null
  name: string
  slug: string
  tagline?: string | null
  description?: string | null
  address: string
  city: string
  latitude?: number | null
  longitude?: number | null
  banner_url?: string | null
  logo_url?: string | null
  rating: number
  rating_count: number
  delivery_time_min: number
  min_order_amount_inr: number
  kyc_status: KycStatus
  commission_rate: number
  is_open: boolean
  fssai_number?: string | null
  gstin_number?: string | null
  fssai_doc_url?: string | null
  gstin_doc_url?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  cafe_id: string
  name: string
  description?: string | null
  price_inr: number
  category: string
  image_url: string
  is_veg: boolean
  is_available: boolean
  preparation_time_min: number
  tags: string[]
  created_at: string
  updated_at: string
}

export interface OrderItemPayload {
  menu_item_id: string
  name: string
  price_inr: number
  quantity: number
  image_url?: string
  is_veg?: boolean
  instructions?: string
}

export interface DeliveryAddressPayload {
  recipient_name: string
  phone: string
  street: string
  building?: string
  landmark?: string
  city: string
  postal_code: string
  type?: 'home' | 'work' | 'hostel' | 'other'
  flat_house_no?: string
  building_name?: string
  area_street?: string
  distance_km?: number
  label?: string
}

export interface UserAddress {
  id: string
  user_id?: string
  label: 'Home' | 'Work' | 'Hostel' | 'Other'
  recipient_name: string
  phone: string
  flat_house_no: string
  building_name: string
  area_street: string
  landmark?: string
  city: string
  postal_code: string
  distance_km: number
  is_default: boolean
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  customer_id: string
  cafe_id: string
  rider_id?: string | null
  items: OrderItemPayload[]
  subtotal_inr: number
  delivery_fee_inr: number
  platform_fee_inr: number
  total_amount_inr: number
  status: OrderStatus
  delivery_address: DeliveryAddressPayload
  special_instructions?: string | null
  payment_status: PaymentStatus
  payment_method: string
  payment_order_id?: string | null
  payment_session_id?: string | null
  payment_utr?: string | null
  payment_collected_by?: 'online' | 'rider_cash' | 'rider_upi' | null
  delivery_otp?: string | null
  pickup_photo_url?: string | null
  delivery_photo_url?: string | null
  pickup_timestamp?: string | null
  delivery_timestamp?: string | null
  estimated_delivery_minutes?: number
  coupon_code?: string | null
  discount_amount_inr?: number | null
  customer_rating?: {
    food_rating: number
    rider_rating: number
    tip_inr: number
    review?: string
    submitted_at: string
  } | null
  created_at: string
  updated_at: string
}

export interface Wallet {
  id: string
  user_id: string
  role: UserRole
  cafe_id?: string | null
  balance_inr: number
  on_hold_balance_inr: number
  total_earned_inr: number
  total_withdrawn_inr: number
  created_at: string
  updated_at: string
}

export interface WalletTransaction {
  id: string
  wallet_id: string
  order_id?: string | null
  amount_inr: number
  type: TransactionType
  status: TransactionStatus
  settlement_hold_until?: string | null
  settled_at?: string | null
  description?: string | null
  metadata?: Record<string, Json> | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & Pick<Profile, 'id' | 'role' | 'full_name' | 'phone'>
        Update: Partial<Profile>
      }
      cafes: {
        Row: Cafe
        Insert: Partial<Cafe> & Pick<Cafe, 'name' | 'slug' | 'address'>
        Update: Partial<Cafe>
      }
      menu_items: {
        Row: MenuItem
        Insert: Partial<MenuItem> & Pick<MenuItem, 'cafe_id' | 'name' | 'price_inr' | 'category' | 'image_url'>
        Update: Partial<MenuItem>
      }
      orders: {
        Row: Order
        Insert: Partial<Order> & Pick<Order, 'customer_id' | 'cafe_id' | 'items' | 'subtotal_inr' | 'total_amount_inr' | 'delivery_address'>
        Update: Partial<Order>
      }
      wallets: {
        Row: Wallet
        Insert: Partial<Wallet> & Pick<Wallet, 'user_id' | 'role'>
        Update: Partial<Wallet>
      }
      wallet_transactions: {
        Row: WalletTransaction
        Insert: Partial<WalletTransaction> & Pick<WalletTransaction, 'wallet_id' | 'amount_inr' | 'type'>
        Update: Partial<WalletTransaction>
      }
      addresses: {
        Row: UserAddress
        Insert: Partial<UserAddress> & Pick<UserAddress, 'recipient_name' | 'phone' | 'area_street'>
        Update: Partial<UserAddress>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      kyc_status: KycStatus
      order_status: OrderStatus
      payment_status: PaymentStatus
      transaction_type: TransactionType
      transaction_status: TransactionStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
