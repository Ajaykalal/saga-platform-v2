'use client'

import { Cafe, MenuItem } from '@/lib/supabase/types'
import { SEED_CAFES, SEED_MENU_ITEMS } from '@/lib/data/mockData'
import { createBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'

export const FOODLO_CAFES_STORAGE_KEY = 'foodlo_cafes_v2'
export const FOODLO_MENU_STORAGE_KEY = 'foodlo_menu_items_v2'
export const FOODLO_CAFE_EVENT = 'foodlo:cafe-status-updated'
export const FOODLO_MENU_EVENT = 'foodlo:menu-status-updated'

/**
 * Get all cafes with live operating status from local storage, falling back to seed data
 */
export function getStoredCafes(): Cafe[] {
  if (typeof window === 'undefined') return SEED_CAFES
  try {
    const raw = localStorage.getItem(FOODLO_CAFES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Cafe[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingIds = new Set(parsed.map((c) => c.id))
        const missing = SEED_CAFES.filter((c) => !existingIds.has(c.id))
        if (missing.length > 0) {
          const merged = [...parsed, ...missing]
          localStorage.setItem(FOODLO_CAFES_STORAGE_KEY, JSON.stringify(merged))
          return merged
        }
        return parsed
      }
    }
  } catch (err) {
    console.error('[cafeService] Failed to parse stored cafes:', err)
  }
  return SEED_CAFES
}

/**
 * Get a single cafe by ID
 */
export function getCafeById(cafeId: string): Cafe | undefined {
  const cafes = getStoredCafes()
  return cafes.find((c) => c.id === cafeId)
}

/**
 * Get a single cafe by Slug
 */
export function getCafeBySlug(slug: string): Cafe | undefined {
  const cafes = getStoredCafes()
  return cafes.find((c) => c.slug === slug)
}

export async function syncCafeStatusToSupabase(cafeId: string, isOpen: boolean): Promise<void> {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) return
  try {
    const supabase = createBrowserClient()
    await (supabase.from('cafes') as unknown as { update: (vals: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> } })
      .update({ is_open: isOpen, updated_at: new Date().toISOString() })
      .eq('id', cafeId)
  } catch {
    // Graceful fallback
  }
}

export async function syncMenuItemAvailabilityToSupabase(itemId: string, isAvailable: boolean): Promise<void> {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) return
  try {
    const supabase = createBrowserClient()
    await (supabase.from('menu_items') as unknown as { update: (vals: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> } })
      .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
      .eq('id', itemId)
  } catch {
    // Graceful fallback
  }
}

/**
 * Toggle or update cafe open/closed status (instant broadcast across customer & merchant tabs)
 */
export function updateCafeStatus(cafeId: string, isOpen: boolean): Cafe {
  const cafes = getStoredCafes()
  const updated = cafes.map((cafe) => {
    if (cafe.id === cafeId) {
      return {
        ...cafe,
        is_open: isOpen,
        updated_at: new Date().toISOString(),
      }
    }
    return cafe
  })

  try {
    localStorage.setItem(FOODLO_CAFES_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(
      new CustomEvent(FOODLO_CAFE_EVENT, {
        detail: { cafeId, isOpen },
      })
    )
    syncCafeStatusToSupabase(cafeId, isOpen)
  } catch (err) {
    console.error('[cafeService] Failed to save cafe status:', err)
  }

  return updated.find((c) => c.id === cafeId) || SEED_CAFES[0]
}

/**
 * Update cafe properties (e.g. commission rate, KYC status, name) with storage & event sync
 */
export function updateCafeDetails(cafeId: string, updates: Partial<Cafe>): Cafe {
  const cafes = getStoredCafes()
  let targetCafe: Cafe | undefined

  const updated = cafes.map((cafe) => {
    if (cafe.id === cafeId) {
      targetCafe = {
        ...cafe,
        ...updates,
        updated_at: new Date().toISOString(),
      }
      return targetCafe
    }
    return cafe
  })

  try {
    localStorage.setItem(FOODLO_CAFES_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(
      new CustomEvent(FOODLO_CAFE_EVENT, {
        detail: { cafeId, updates },
      })
    )
  } catch (err) {
    console.error('[cafeService] Failed to save cafe updates:', err)
  }

  return targetCafe || updated.find((c) => c.id === cafeId) || SEED_CAFES[0]
}

/**
 * Get all menu items with live in-stock / out-of-stock availability
 */
export function getStoredMenuItems(cafeId?: string): MenuItem[] {
  let items = SEED_MENU_ITEMS
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(FOODLO_MENU_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as MenuItem[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((m) => m.id))
          const missing = SEED_MENU_ITEMS.filter((m) => !existingIds.has(m.id))
          if (missing.length > 0) {
            const merged = [...parsed, ...missing]
            localStorage.setItem(FOODLO_MENU_STORAGE_KEY, JSON.stringify(merged))
            items = merged
          } else {
            items = parsed
          }
        }
      }
    } catch (err) {
      console.error('[cafeService] Failed to parse menu items:', err)
    }
  }

  if (cafeId) {
    return items.filter((item) => item.cafe_id === cafeId)
  }
  return items
}

/**
 * Toggle menu item availability (In Stock vs Out of Stock)
 */
export function updateMenuItemAvailability(itemId: string, isAvailable: boolean): MenuItem | undefined {
  const items = getStoredMenuItems()
  let targetItem: MenuItem | undefined

  const updated = items.map((item) => {
    if (item.id === itemId) {
      targetItem = {
        ...item,
        is_available: isAvailable,
        updated_at: new Date().toISOString(),
      }
      return targetItem
    }
    return item
  })

  try {
    localStorage.setItem(FOODLO_MENU_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(
      new CustomEvent(FOODLO_MENU_EVENT, {
        detail: { itemId, isAvailable },
      })
    )
    syncMenuItemAvailabilityToSupabase(itemId, isAvailable)
  } catch (err) {
    console.error('[cafeService] Failed to save menu item availability:', err)
  }

  return targetItem
}

/**
 * Add a new dish to a cafe's menu
 */
export function addCustomMenuItem(newItem: MenuItem): MenuItem {
  const items = getStoredMenuItems()
  const updated = [newItem, ...items]

  try {
    localStorage.setItem(FOODLO_MENU_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(
      new CustomEvent(FOODLO_MENU_EVENT, {
        detail: { item: newItem, action: 'added' },
      })
    )
  } catch (err) {
    console.error('[cafeService] Failed to add menu item:', err)
  }

  return newItem
}

/**
 * Delete a dish from a cafe's menu
 */
export function deleteCustomMenuItem(itemId: string): void {
  const items = getStoredMenuItems()
  const updated = items.filter((i) => i.id !== itemId)

  try {
    localStorage.setItem(FOODLO_MENU_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(
      new CustomEvent(FOODLO_MENU_EVENT, {
        detail: { itemId, action: 'deleted' },
      })
    )
  } catch (err) {
    console.error('[cafeService] Failed to delete menu item:', err)
  }
}
