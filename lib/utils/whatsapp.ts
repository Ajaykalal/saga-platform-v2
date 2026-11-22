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

  return `🍽️ *SAGA CAFE — Order Confirmed!*
Order: *#${order.order_number}*
Store: *${cafeName}*

*Items Ordered:*
${itemsText}

*Bill Summary:*
Total Amount: *₹${order.total_amount_inr}* (${order.payment_status.toUpperCase()} via ${order.payment_method.toUpperCase()})
Estimated Delivery: ~20-25 mins

📱 *Track Live Order & Rider GPS:*
${trackingLink}

_Where Food Meets Play • SAGA Delivery_`
}

/**
 * Formats order picked up / en route message with OTP
 */
export function formatOrderPickedUpWhatsApp(order: Order, riderName = 'Vikram Singh', origin = ''): string {
  const trackingLink = `${origin}/orders/${order.id}`

  return `🛵 *SAGA CAFE — Out for Delivery!*
Order: *#${order.order_number}*

Your Student Courier *${riderName}* has verified your parcel and is now en route on an Electric Scooter.

🔐 *Your Handover OTP:* *${order.delivery_otp || '4829'}*
_(Please share this 4-digit code with courier upon delivery)_

📍 *Live GPS Tracking & Arrival:*
${trackingLink}

_Thank you for supporting our student couriers!_`
}

/**
 * Formats delivered celebration message
 */
export function formatOrderDeliveredWhatsApp(order: Order): string {
  return `🎉 *SAGA CAFE — Parcel Delivered!*
Order: *#${order.order_number}*

Your hot meal has been handed over successfully.
📸 Parcel delivery photo proof has been logged.

Enjoy your artisan SAGA feast! ⭐⭐⭐⭐⭐
_Rate your meal or repeat your order anytime at SAGA Platform._`
}
