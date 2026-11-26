import type { Order } from '@/lib/supabase/types'

/**
 * Format phone number to international E.164 without symbols (e.g. 919900012345)
 */
export function formatPhoneForWhatsApp(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  return digits
}

/**
 * Generate clickable wa.me direct WhatsApp link
 */
export function createWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = formatPhoneForWhatsApp(phone)
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

/**
 * Formats order confirmation message
 */
export function formatOrderConfirmedWhatsApp(order: Order, cafeName: string, origin = ''): string {
  const itemsText = order.items.map((i) => `• ${i.quantity}x ${i.name} (₹${i.price_inr * i.quantity})`).join('\n')
  const trackingLink = `${origin}/orders/${order.id}`

  return `🍽️ *FoodLo Delivery — Order Confirmed!*
Order: *#${order.order_number}*
Store: *${cafeName}*

*Items Ordered:*
${itemsText}

*Bill Summary:*
Total Amount: *₹${order.total_amount_inr}* (${order.payment_status.toUpperCase()} via ${order.payment_method.toUpperCase()})
Estimated Delivery: ~20-25 mins

📱 *Track Live Order & Rider GPS:*
${trackingLink}

_Bhookh Lagi? FoodLo se mangwa lo! • Sagwara Delivery_`
}

/**
 * Formats order picked up / en route message with OTP
 */
export function formatOrderPickedUpWhatsApp(order: Order, riderName = 'Student Courier', origin = ''): string {
  const trackingLink = `${origin}/orders/${order.id}`

  return `🛵 *FoodLo Delivery — Out for Delivery!*
Order: *#${order.order_number}*

Your Delivery Partner *${riderName}* has picked up your parcel and is on the way.

🔐 *Your Handover OTP:* *${order.delivery_otp || '4829'}*
_(Please share this 4-digit code with courier upon delivery)_

📍 *Live GPS Tracking & Arrival:*
${trackingLink}

_Bhookh Lagi? FoodLo se mangwa lo!_`
}

/**
 * Formats delivered celebration message
 */
export function formatOrderDeliveredWhatsApp(order: Order): string {
  return `🎉 *FoodLo Delivery — Parcel Delivered!*
Order: *#${order.order_number}*

Your hot meal has been handed over successfully.

Enjoy your meal! ⭐⭐⭐⭐⭐
_Rate your meal or re-order anytime on FoodLo._`
}
