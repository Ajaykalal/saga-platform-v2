'use client'

import { createBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'

export interface DynamicPlatformConfig {
  minOrderAmountInr: number
  platformFeeInr: number
  baseDeliveryFeeInr: number
  baseDeliveryRadiusKm: number
  extraFeePerKmInr: number
  maxDeliveryRadiusKm: number
  riderPayoutPerOrderInr: number
  riderCashLimitInr: number
  defaultCommissionRate: number
  allowMerchantCsvExport: boolean
  announcementBanner: {
    enabled: boolean
    message: string
    type: 'info' | 'warning' | 'alert' | 'celebration'
  }
}

export const DEFAULT_PLATFORM_CONFIG: DynamicPlatformConfig = {
  minOrderAmountInr: 200,
  platformFeeInr: 5,
  baseDeliveryFeeInr: 25,
  baseDeliveryRadiusKm: 5,
  extraFeePerKmInr: 6,
  maxDeliveryRadiusKm: 10,
  riderPayoutPerOrderInr: 55,
  riderCashLimitInr: 1500,
  defaultCommissionRate: 15,
  allowMerchantCsvExport: false,
  announcementBanner: {
    enabled: false,
    message: '🌧️ Monsoon Alert in Sagwara: Delivery may take 10–15 mins extra for rider safety.',
    type: 'warning',
  },
}

export const SAGA_CONFIG_STORAGE_KEY = 'saga_dynamic_config_v1'
export const SAGA_CONFIG_EVENT = 'saga:config:updated'

/**
 * Retrieve active dynamic configuration
 */
export function getDynamicConfig(): DynamicPlatformConfig {
  if (typeof window === 'undefined') return DEFAULT_PLATFORM_CONFIG
  try {
    const raw = localStorage.getItem(SAGA_CONFIG_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(SAGA_CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_PLATFORM_CONFIG))
      return DEFAULT_PLATFORM_CONFIG
    }
    const parsed = JSON.parse(raw) as Partial<DynamicPlatformConfig>
    return {
      ...DEFAULT_PLATFORM_CONFIG,
      ...parsed,
      announcementBanner: {
        ...DEFAULT_PLATFORM_CONFIG.announcementBanner,
        ...(parsed.announcementBanner || {}),
      },
    }
  } catch {
    return DEFAULT_PLATFORM_CONFIG
  }
}

interface UpsertableTable {
  upsert: (values: Record<string, unknown>) => Promise<unknown>
}

/**
 * Persist dynamic config and notify all listening components
 */
export function saveDynamicConfig(newConfig: DynamicPlatformConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SAGA_CONFIG_STORAGE_KEY, JSON.stringify(newConfig))
    window.dispatchEvent(new CustomEvent(SAGA_CONFIG_EVENT, { detail: { config: newConfig } }))

    // Optional Supabase cloud synchronization
    if (isSupabaseConfigured()) {
      try {
        const supabase = createBrowserClient()
        const payload: Record<string, unknown> = {
          id: 'global-platform-config',
          settings: newConfig,
          updated_at: new Date().toISOString(),
        }
        const table = supabase.from('platform_settings') as unknown as UpsertableTable
        table.upsert(payload).catch(() => {
          // Fallback gracefully if platform_settings table is not configured
        })
      } catch {
        // Fallback
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Reset config to platform defaults
 */
export function resetDynamicConfig(): DynamicPlatformConfig {
  saveDynamicConfig(DEFAULT_PLATFORM_CONFIG)
  return DEFAULT_PLATFORM_CONFIG
}
