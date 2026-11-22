/**
 * FoodLo Central Payment & UPI Configuration
 * Primary Merchant UPI for Ajay Kalal / FoodLo Platform
 */

export const SAGA_PAYMENT_CONFIG = {
  merchantName: 'Ajay Kalal',
  platformBrand: 'FoodLo Platform',
  upiId: 'paytm.s2hlgrh@pty',
  qrImageUrl: '/images/paytm-qr.jpg',
  supportPhone: '+919880011223',
  supportWhatsApp: '919900012345',
}

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
  const cleanNote = note || `Order ${orderNumber} - FoodLo`
  const encodedName = encodeURIComponent(SAGA_PAYMENT_CONFIG.merchantName)
  const encodedNote = encodeURIComponent(cleanNote)

  return `upi://pay?pa=${SAGA_PAYMENT_CONFIG.upiId}&pn=${encodedName}&am=${amountInr.toFixed(
    2
  )}&cu=INR&tn=${encodedNote}`
}
