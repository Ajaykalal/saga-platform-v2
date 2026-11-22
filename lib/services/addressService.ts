'use client'

import type { UserAddress } from '@/lib/supabase/types'
import { createBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'

export const ADDRESS_STORAGE_KEY = 'saga_user_addresses_v1'
export const ACTIVE_ADDRESS_KEY = 'saga_active_address_id_v1'
export const SAGA_ADDRESS_EVENT = 'saga:address-updated'

// Platform Delivery Fee & Minimum Order Configuration
export const MIN_ORDER_VALUE_INR = 200
export const BASE_DISTANCE_KM = 5
export const BASE_DELIVERY_FEE_INR = 25
export const EXTRA_KM_RATE_INR = 6
export const MAX_DELIVERY_RANGE_KM = 10

export interface DeliveryCalculation {
  fee: number
  isDeliverable: boolean
  distanceKm: number
  breakdown: string
  extraKm: number
  extraFee: number
}

/**
 * Calculates delivery fee based on exact platform rule:
 * - Up to 5 km: Fixed ₹25 delivery charge
 * - Above 5 km up to 10 km: Fixed ₹25 (first 5 km) + ₹6 per additional km
 * - Beyond 10 km: Outside delivery range
 */
export function calculateDeliveryFee(distanceKm: number = 2.8): DeliveryCalculation {
  const dist = Math.max(0.1, Math.round(distanceKm * 10) / 10)

  if (dist > MAX_DELIVERY_RANGE_KM) {
    return {
      fee: 0,
      isDeliverable: false,
      distanceKm: dist,
      breakdown: `Location is ${dist.toFixed(1)} km away. Maximum delivery range is 10 km.`,
      extraKm: Math.max(0, dist - BASE_DISTANCE_KM),
      extraFee: 0,
    }
  }

  if (dist <= BASE_DISTANCE_KM) {
    return {
      fee: BASE_DELIVERY_FEE_INR,
      isDeliverable: true,
      distanceKm: dist,
      breakdown: `Fixed ₹${BASE_DELIVERY_FEE_INR} under 5 km (${dist.toFixed(1)} km)`,
      extraKm: 0,
      extraFee: 0,
    }
  }

  const extraKm = Math.round((dist - BASE_DISTANCE_KM) * 10) / 10
  const extraFee = Math.round(extraKm * EXTRA_KM_RATE_INR)
  const totalFee = BASE_DELIVERY_FEE_INR + extraFee

  return {
    fee: totalFee,
    isDeliverable: true,
    distanceKm: dist,
    breakdown: `₹${BASE_DELIVERY_FEE_INR} base (first 5 km) + ₹${extraFee} (${extraKm.toFixed(1)} km × ₹6/km)`,
    extraKm,
    extraFee,
  }
}

export const INITIAL_USER_ADDRESSES: UserAddress[] = [
  {
    id: 'addr-home-1',
    label: 'Home',
    recipient_name: 'Arjun Nair',
    phone: '+91 99000 12345',
    flat_house_no: 'Flat 302, 3rd Floor',
    building_name: 'Palm Grove Apartments',
    area_street: '12th Cross, 5th Block, Koramangala',
    landmark: 'Near Sony World Signal',
    city: 'Bengaluru',
    postal_code: '560095',
    distance_km: 2.8,
    is_default: true,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'addr-work-2',
    label: 'Work',
    recipient_name: 'Arjun Nair',
    phone: '+91 99000 12345',
    flat_house_no: '4th Floor, Tech Wing',
    building_name: 'WeWork Salarpuria Symbiosis',
    area_street: 'Bannerghatta Main Rd, Arekere',
    landmark: 'Opp. IIM Bangalore',
    city: 'Bengaluru',
    postal_code: '560076',
    distance_km: 6.5,
    is_default: false,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'addr-hostel-3',
    label: 'Hostel',
    recipient_name: 'Rohan Verma',
    phone: '+91 98800 54321',
    flat_house_no: 'Room 412, Block C',
    building_name: 'St. Joseph Student Living / PG',
    area_street: 'Hosur Main Road, Koramangala 1st Block',
    landmark: 'Behind Forum South Mall',
    city: 'Bengaluru',
    postal_code: '560029',
    distance_km: 3.6,
    is_default: false,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
]

export function getStoredAddresses(): UserAddress[] {
  if (typeof window === 'undefined') return INITIAL_USER_ADDRESSES
  try {
    const raw = localStorage.getItem(ADDRESS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as UserAddress[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fallback
  }
  // Initialize with seed addresses
  try {
    localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(INITIAL_USER_ADDRESSES))
  } catch {
    // ignore
  }
  return INITIAL_USER_ADDRESSES
}

export function getActiveAddress(): UserAddress {
  const addresses = getStoredAddresses()
  if (typeof window === 'undefined') return addresses[0]

  try {
    const activeId = localStorage.getItem(ACTIVE_ADDRESS_KEY)
    if (activeId) {
      const found = addresses.find((a) => a.id === activeId)
      if (found) return found
    }
  } catch {
    // fallback
  }

  // Fallback to default address or first address
  const defaultAddr = addresses.find((a) => a.is_default) || addresses[0]
  return defaultAddr
}

export function setActiveAddress(addressId: string): UserAddress | null {
  const addresses = getStoredAddresses()
  const found = addresses.find((a) => a.id === addressId)
  if (!found) return null

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ACTIVE_ADDRESS_KEY, addressId)
      window.dispatchEvent(
        new CustomEvent(SAGA_ADDRESS_EVENT, { detail: { activeAddress: found } })
      )
    } catch {
      // ignore
    }
  }
  return found
}

export function saveUserAddress(
  payload: Omit<UserAddress, 'id' | 'created_at'> & { id?: string }
): UserAddress {
  const addresses = getStoredAddresses()
  const isEditing = Boolean(payload.id)
  const id = payload.id || `addr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

  let updatedAddresses: UserAddress[]
  let savedAddress: UserAddress

  if (isEditing) {
    savedAddress = {
      ...payload,
      id,
      created_at: new Date().toISOString(),
    }
    updatedAddresses = addresses.map((a) => (a.id === id ? savedAddress : a))
  } else {
    savedAddress = {
      ...payload,
      id,
      created_at: new Date().toISOString(),
    }
    // If set as default, remove default from others
    if (payload.is_default) {
      updatedAddresses = [
        savedAddress,
        ...addresses.map((a) => ({ ...a, is_default: false })),
      ]
    } else {
      updatedAddresses = [savedAddress, ...addresses]
    }
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(updatedAddresses))
      localStorage.setItem(ACTIVE_ADDRESS_KEY, savedAddress.id)
      window.dispatchEvent(
        new CustomEvent(SAGA_ADDRESS_EVENT, { detail: { activeAddress: savedAddress } })
      )
    } catch {
      // ignore
    }
  }

  // Async sync to Supabase if available
  syncAddressToSupabase(savedAddress).catch(() => {})

  return savedAddress
}

export function deleteUserAddress(addressId: string): boolean {
  const addresses = getStoredAddresses()
  const filtered = addresses.filter((a) => a.id !== addressId)

  if (filtered.length === 0) {
    // Keep at least one address
    return false
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(filtered))
      const currentActiveId = localStorage.getItem(ACTIVE_ADDRESS_KEY)
      if (currentActiveId === addressId) {
        localStorage.setItem(ACTIVE_ADDRESS_KEY, filtered[0].id)
      }
      window.dispatchEvent(new CustomEvent(SAGA_ADDRESS_EVENT))
    } catch {
      // ignore
    }
  }
  return true
}

interface UpsertableTable {
  upsert: (values: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>
}

export async function syncAddressToSupabase(address: UserAddress): Promise<void> {
  if (!isSupabaseConfigured()) return
  try {
    const supabase = createBrowserClient()
    await (supabase.from('addresses') as unknown as UpsertableTable).upsert(
      {
        id: address.id,
        user_id: address.user_id,
        label: address.label,
        recipient_name: address.recipient_name,
        phone: address.phone,
        flat_house_no: address.flat_house_no,
        building_name: address.building_name,
        area_street: address.area_street,
        landmark: address.landmark,
        city: address.city,
        postal_code: address.postal_code,
        distance_km: address.distance_km,
        is_default: address.is_default,
        created_at: address.created_at,
      },
      { onConflict: 'id' }
    )
  } catch {
    // Fallback gracefully
  }
}
