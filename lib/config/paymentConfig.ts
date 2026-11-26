/**
 * FoodLo Central Payment & UPI Configuration
 * Primary Merchant UPI for Ajay Kalal / FoodLo Platform
 * Dynamic sync with Admin Control Center
 */
import { getDynamicConfig } from '@/lib/services/configService'

export interface PaymentConfig {
  merchantName: string
  platformBrand: string
  upiId: string
  qrImageUrl: string
  supportPhone: string
  supportWhatsApp: string
}

export function getPaymentConfig(): PaymentConfig {
  if (typeof window === 'undefined') {
    return {
      merchantName: 'Ajay Kalal',
      platformBrand: 'FoodLo Platform',
      upiId: 'paytm.s2hlgrh@pty',
      qrImageUrl: '/images/paytm-qr.jpg',
      supportPhone: '+919351956481',
      supportWhatsApp: '919351956481',
    }
  }
  const dynamic = getDynamicConfig()
  return {
    merchantName: dynamic.merchantName || 'Ajay Kalal',
    platformBrand: 'FoodLo Platform',
    upiId: dynamic.paymentUpiId || 'paytm.s2hlgrh@pty',
    qrImageUrl: dynamic.qrImageUrl || '/images/paytm-qr.jpg',
    supportPhone: dynamic.supportPhone || '+919351956481',
    supportWhatsApp: dynamic.supportWhatsApp || '919351956481',
  }
}

export const SAGA_PAYMENT_CONFIG = new Proxy(
  {
    merchantName: 'Ajay Kalal',
    platformBrand: 'FoodLo Platform',
    upiId: 'paytm.s2hlgrh@pty',
    qrImageUrl: '/images/paytm-qr.jpg',
    supportPhone: '+919351956481',
    supportWhatsApp: '919351956481',
  },
  {
    get(_target, prop: keyof PaymentConfig) {
      return getPaymentConfig()[prop]
    },
  }
)

export const FOODLO_PAYMENT_CONFIG = SAGA_PAYMENT_CONFIG

/**
 * Generate standard NPCI UPI Deep Link for mobile 1-tap checkout
 * Supported across Google Pay, PhonePe, Paytm, CRED, BHIM, etc.
 */
export function createUpiPaymentIntent(params: {
  amountInr: number
  orderNumber: string
  note?: string
}): string {
  const { amountInr, orderNumber, note } = params
  const config = getPaymentConfig()
  const cleanNote = note || `Order ${orderNumber} - FoodLo`
  const encodedName = encodeURIComponent(config.merchantName)
  const encodedNote = encodeURIComponent(cleanNote)

  return `upi://pay?pa=${config.upiId}&pn=${encodedName}&am=${amountInr.toFixed(
    2
  )}&cu=INR&tn=${encodedNote}`
}
