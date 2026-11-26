'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
  Edit3,
  CheckCircle2,
  Store,
  Banknote,
  Navigation,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  MapPin,
  Tag,
  Ticket,
  Sparkles,
} from 'lucide-react'
import { useCart } from '@/lib/context/CartContext'
import { useAuth } from '@/lib/context/AuthContext'
import { createNewOrder } from '@/lib/services/orderService'
import { SAGA_PAYMENT_CONFIG, createUpiPaymentIntent } from '@/lib/config/paymentConfig'
import { getStoredCoupons, recordCouponUsage } from '@/lib/services/promoService'
import { getCafeById, getStoredMenuItems } from '@/lib/services/cafeService'
import type { Order } from '@/lib/supabase/types'
import AddressModal from '@/components/AddressModal'

export default function CartDrawer() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    deliveryFee,
    platformFee,
    grandTotal,
    specialInstructions,
    setSpecialInstructions,
    isCartOpen,
    closeCart,
    activeCafe,
    activeAddress,
    deliveryInfo,
    isDeliverable,
    isBelowMinimumOrder,
    amountNeededForMinimum,
    appliedCoupon,
    discountAmount,
    couponFeedback,
    applyPromoCode,
    removePromoCode,
  } = useCart()

  const [paymentMethod, setPaymentMethod] = useState<'upi_direct' | 'cod'>('upi_direct')
  const [enteredUtr, setEnteredUtr] = useState('')
  const [showQrStandee, setShowQrStandee] = useState(false)
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [couponInput, setCouponInput] = useState('')

  // Live cafe open/closed status check
  const liveCafe = React.useMemo(() => {
    if (!activeCafe || typeof window === 'undefined') return null
    return getCafeById(activeCafe.id)
  }, [activeCafe])
  const isStoreClosed = liveCafe ? !liveCafe.is_open : false

  // Live items out-of-stock check
  const storedMenuItems = React.useMemo(() => {
    if (typeof window === 'undefined') return []
    return getStoredMenuItems()
  }, [])

  const outOfStockCartItems = React.useMemo(() => {
    return items.filter((cartItem) => {
      const match = storedMenuItems.find((m) => m.id === cartItem.id)
      return match && match.is_available === false
    })
  }, [items, storedMenuItems])
  const hasOutOfStock = outOfStockCartItems.length > 0

  const availableCoupons = React.useMemo(() => {
    if (typeof window === 'undefined') return []
    const all = getStoredCoupons()
    return all.filter((c) => c.isActive && (!c.cafeId || c.cafeId === activeCafe?.id))
  }, [activeCafe?.id])

  if (!isCartOpen) return null

  const handleCopyUpiId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(SAGA_PAYMENT_CONFIG.upiId)
      setCopiedUpi(true)
      setTimeout(() => setCopiedUpi(false), 2500)
    }
  }

  const handleCheckout = async () => {
    if (
      !activeCafe ||
      items.length === 0 ||
      isBelowMinimumOrder ||
      !isDeliverable ||
      isStoreClosed ||
      hasOutOfStock
    )
      return
    setIsPlacingOrder(true)

    try {
      // Create persistent Order in SAGA system directly with UPI / COD and user's selected address
      const newOrder = createNewOrder({
        cafe_id: activeCafe.id,
        items: items.map((i) => ({
          menu_item_id: i.id,
          name: i.name,
          price_inr: i.price,
          quantity: i.quantity,
          image_url: i.imageUrl,
          is_veg: i.isVeg,
        })),
        subtotal_inr: subtotal,
        delivery_fee_inr: deliveryFee,
        platform_fee_inr: platformFee,
        total_amount_inr: grandTotal,
        coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
        discount_amount_inr: discountAmount > 0 ? discountAmount : undefined,
        delivery_address: {
          recipient_name: user?.full_name || activeAddress.recipient_name,
          phone: user?.phone || activeAddress.phone,
          street: activeAddress.area_street,
          building: `${activeAddress.flat_house_no}, ${activeAddress.building_name}`,
          landmark: activeAddress.landmark,
          city: activeAddress.city,
          postal_code: activeAddress.postal_code,
          flat_house_no: activeAddress.flat_house_no,
          building_name: activeAddress.building_name,
          area_street: activeAddress.area_street,
          distance_km: activeAddress.distance_km,
          label: activeAddress.label,
          type: activeAddress.label.toLowerCase() as 'home' | 'work' | 'hostel' | 'other',
        },
        special_instructions: specialInstructions,
        payment_method: paymentMethod,
        payment_utr: enteredUtr.trim() || undefined,
        payment_collected_by: paymentMethod === 'upi_direct' ? 'online' : null,
      })

      if (appliedCoupon) {
        recordCouponUsage(appliedCoupon.code)
      }

      setIsPlacingOrder(false)
      setCreatedOrder(newOrder)
      clearCart()
    } catch {
      setIsPlacingOrder(false)
    }
  }

  const handleNavigateToTracking = () => {
    if (!createdOrder) return
    closeCart()
    router.push(`/orders/${createdOrder.id}`)
  }

  const handleCloseSuccess = () => {
    setCreatedOrder(null)
    closeCart()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={closeCart}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-slideLeft">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Your Cart</h2>
              {activeCafe && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Store className="w-3 h-3 text-emerald-600" />
                  {activeCafe.name}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={closeCart}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors tap-feedback cursor-pointer"
            aria-label="Close cart drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        {createdOrder ? (
          /* Order Confirmation View (Matching Stitch order_success_screen) */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
            <div className="w-18 h-18 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full mb-2">
              Order Placed Successfully!
            </span>
            <h3 className="text-2xl font-black text-gray-900 mb-1">
              Order #{createdOrder.order_number}
            </h3>
            <p className="text-xs text-gray-500 max-w-xs mb-5">
              Your meal is now being freshly prepared in the kitchen. Estimated arrival in 20–25 minutes.
            </p>

            {/* Handover OTP card */}
            <div className="w-full bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 mb-3 text-left flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  Delivery Handover OTP
                </span>
                <span className="text-[11px] text-emerald-700">
                  Share with rider upon arrival
                </span>
              </div>
              <span className="font-mono font-black text-lg bg-white px-3 py-1 rounded-xl text-emerald-800 border border-emerald-300">
                {createdOrder.delivery_otp || '4829'}
              </span>
            </div>

            {/* Non-Cancellable Fresh Order Alert */}
            <div className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-200 mb-5 text-left text-[11px] text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Kitchen Preparing Fresh • Non-Cancellable</span>
              </span>
              <span className="font-mono font-bold text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                {createdOrder.payment_method === 'cod' ? 'PAY ON DELIVERY' : 'PAID VIA UPI'}
              </span>
            </div>

            {/* Actions */}
            <div className="w-full space-y-2.5">
              <button
                onClick={handleNavigateToTracking}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                <span>Track Live Order & Rider ETA</span>
              </button>

              <button
                onClick={handleCloseSuccess}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Back to Storefront
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShoppingBag className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-6">
              Explore our freshly baked artisan pizzas, gourmet smash burgers, and single-origin cold brews.
            </p>
            <button
              onClick={closeCart}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-full transition-all shadow-xs tap-feedback cursor-pointer"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          /* Cart Items & Bill Details */
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Delivery Address Card with 1-Click Change */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      Delivery Address
                    </span>
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>{activeAddress.label}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 font-medium">{activeAddress.recipient_name}</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(true)}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-300 hover:border-emerald-400 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  Change
                </button>
              </div>

              <p className="text-xs text-slate-600 line-clamp-1">
                {activeAddress.flat_house_no}, {activeAddress.building_name}, {activeAddress.area_street}
              </p>

              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 flex items-center gap-1 font-medium">
                  <Navigation className="w-3 h-3 text-emerald-600" />
                  <span>{activeAddress.distance_km} km from kitchen</span>
                </span>
                <span className="font-bold text-emerald-800">
                  {deliveryInfo.breakdown}
                </span>
              </div>
            </div>

            {/* Closed Kitchen Warning Alert */}
            {isStoreClosed && (
              <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-rose-900 animate-slideIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-extrabold text-rose-950 block">Kitchen Currently Closed</span>
                  <p className="text-[11px] text-rose-800 mt-0.5">
                    <strong>{liveCafe?.name || 'This cafe'}</strong> has temporarily closed order taking. Orders cannot be placed until the kitchen opens.
                  </p>
                </div>
              </div>
            )}

            {/* Out of Stock Items Alert */}
            {hasOutOfStock && (
              <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-rose-900 animate-slideIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-extrabold text-rose-950 block">Dishes Out Of Stock</span>
                  <p className="text-[11px] text-rose-800 mt-0.5">
                    The kitchen has run out of: <strong>{outOfStockCartItems.map((i) => i.name).join(', ')}</strong>. Please remove them using the trash icon to proceed with remaining items.
                  </p>
                </div>
              </div>
            )}

            {/* Minimum Order Value Warning Alert */}
            {isBelowMinimumOrder && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-amber-950">Minimum Order Value: ₹200</span>
                    <span className="text-[10px] font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
                      Add ₹{amountNeededForMinimum.toFixed(0)} more
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Your cart total is ₹{subtotal.toFixed(0)}. Please add ₹{amountNeededForMinimum.toFixed(0)} more of artisan dishes to place this order.
                  </p>
                </div>
              </div>
            )}

            {/* Out of Delivery Range Alert */}
            {!isDeliverable && (
              <div className="bg-red-50 border border-red-300 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-red-950">
                    Location Beyond 10 km ({deliveryInfo.distanceKm} km)
                  </span>
                  <p className="text-[11px] text-red-800 mt-1">
                    We currently deliver within a 10 km radius to guarantee kitchen freshness. Please tap <strong>Change</strong> above to pick a delivery address within 10 km.
                  </p>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Order Items ({items.length})
              </h3>
              <div className="divide-y divide-gray-100">
                {items.map((cartItem) => {
                  const isItemOutOfStock = outOfStockCartItems.some((o) => o.id === cartItem.id)

                  return (
                    <div
                      key={cartItem.id}
                      className={`py-3 flex items-center justify-between gap-3 transition-colors ${
                        isItemOutOfStock ? 'bg-rose-50/60 rounded-xl px-2.5 my-1 border border-rose-200' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 ${
                            cartItem.isVeg ? 'border-emerald-600' : 'border-red-600'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              cartItem.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">
                            <span>{cartItem.name}</span>
                            {isItemOutOfStock && (
                              <span className="text-[10px] font-bold bg-rose-600 text-white px-1.5 py-0.2 rounded-sm shrink-0">
                                OUT OF STOCK
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">₹{cartItem.price} each</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                          <button
                            onClick={() => updateQuantity(cartItem.id, -1)}
                            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors tap-feedback cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-gray-900">
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(cartItem.id, 1)}
                            disabled={isItemOutOfStock}
                            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors tap-feedback cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-sm font-bold text-gray-900 w-14 text-right">
                          ₹{(cartItem.price * cartItem.quantity).toFixed(2)}
                        </span>

                        <button
                          onClick={() => removeItem(cartItem.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Special Instructions Input */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Edit3 className="w-3.5 h-3.5 text-gray-500" />
                <label className="text-xs font-semibold text-gray-700">Special Cooking Notes</label>
              </div>
              <input
                type="text"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Less spicy, keep cold brew extra cold..."
                className="w-full text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Promo Codes & Coupons Engine Card */}
            {appliedCoupon ? (
              <div
                className={`border rounded-2xl p-3.5 space-y-2 transition-all ${
                  discountAmount > 0
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-amber-50 border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg text-white flex items-center justify-center ${
                        discountAmount > 0 ? 'bg-emerald-600' : 'bg-amber-600'
                      }`}
                    >
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider block ${
                          discountAmount > 0 ? 'text-emerald-800' : 'text-amber-800'
                        }`}
                      >
                        {discountAmount > 0 ? 'Coupon Applied' : 'Coupon Inactive'}
                      </span>
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>{appliedCoupon.code}</span>
                        <span className="text-slate-400">•</span>
                        {discountAmount > 0 ? (
                          <span className="text-emerald-700 font-extrabold">
                            Saved ₹{discountAmount.toFixed(2)}
                          </span>
                        ) : subtotal < appliedCoupon.minOrderAmount ? (
                          <span className="text-amber-800 font-extrabold text-[11px]">
                            Add ₹{(appliedCoupon.minOrderAmount - subtotal).toFixed(0)} more for discount
                          </span>
                        ) : (
                          <span className="text-amber-800 font-extrabold text-[11px]">
                            Needs {appliedCoupon.applicableCategory} dish
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removePromoCode}
                    className="text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <p
                  className={`text-[11px] ${
                    discountAmount > 0 ? 'text-emerald-800' : 'text-amber-800'
                  }`}
                >
                  {appliedCoupon.description}
                </p>
                {discountAmount === 0 && subtotal < appliedCoupon.minOrderAmount && (
                  <div className="text-[10px] bg-amber-100 text-amber-900 font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
                    <span>⚠️ Minimum order ₹{appliedCoupon.minOrderAmount} required for this coupon to apply.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Apply Promo / Coupon Code</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon (e.g. FOODLO50)"
                    className="flex-1 text-xs font-mono font-bold uppercase bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (couponInput.trim()) {
                        applyPromoCode(couponInput.trim())
                      }
                    }}
                    disabled={!couponInput.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-black rounded-xl transition-colors cursor-pointer"
                  >
                    APPLY
                  </button>
                </div>

                {couponFeedback && (
                  <p
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      couponFeedback.isError ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    <span>{couponFeedback.text}</span>
                  </p>
                )}

                {/* Quick Coupon Chips */}
                {availableCoupons.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Available Offers
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {availableCoupons.slice(0, 3).map((cpn) => (
                        <button
                          key={cpn.id}
                          type="button"
                          onClick={() => {
                            setCouponInput(cpn.code)
                            applyPromoCode(cpn.code)
                          }}
                          className="text-[10px] font-black font-mono bg-white hover:bg-emerald-50 border border-dashed border-emerald-400 text-emerald-800 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{cpn.code}</span>
                          <span className="text-slate-500 font-sans font-normal">
                            ({cpn.discountType === 'flat' ? `₹${cpn.discountValue} OFF` : `${cpn.discountValue}% OFF`})
                          </span>
                          {cpn.applicableCategory && cpn.applicableCategory !== 'All' && (
                            <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-1 rounded">
                              {cpn.applicableCategory}
                            </span>
                          )}
                          {cpn.validDays && !cpn.validDays.includes('All Days') && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1 rounded">
                              {cpn.validDays[0]}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAYMENT METHOD SELECTOR */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Select Payment Mode
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi_direct')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    paymentMethod === 'upi_direct'
                      ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-500'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                      Direct UPI
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-900 block leading-tight">
                    Paytm / GPay / QR
                  </span>
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    To Ajay Kalal
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-500'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                      Pay at Door
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-900 block leading-tight">
                    Cash on Delivery
                  </span>
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    Cash or UPI on drop
                  </span>
                </button>
              </div>

              {/* Instant UPI Details Card */}
              {paymentMethod === 'upi_direct' ? (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Direct Merchant UPI
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        {SAGA_PAYMENT_CONFIG.merchantName} ({SAGA_PAYMENT_CONFIG.upiId})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUpiId}
                      className="flex items-center gap-1 text-[11px] font-bold bg-white text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-emerald-600" />
                          <span>Copy UPI</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 1-Tap Mobile UPI Intent */}
                  <a
                    href={createUpiPaymentIntent({
                      amountInr: grandTotal,
                      orderNumber: 'NEW',
                    })}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span>Tap to Pay ₹{grandTotal.toFixed(2)} in GPay / PhonePe / Paytm</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Standee QR Toggle */}
                  <div className="pt-2 border-t border-emerald-200/60">
                    <button
                      type="button"
                      onClick={() => setShowQrStandee(!showQrStandee)}
                      className="w-full text-center text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{showQrStandee ? 'Hide Paytm Standee QR' : 'Scan Paytm Standee QR Code'}</span>
                    </button>

                    {showQrStandee && (
                      <div className="mt-2.5 p-3 bg-white rounded-xl border border-emerald-200 text-center space-y-2">
                        <div className="relative w-48 h-64 mx-auto rounded-lg overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-white">
                          <img
                            src={SAGA_PAYMENT_CONFIG.qrImageUrl}
                            alt="Paytm UPI Standee QR - Ajay Kalal"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Scan using <strong>Paytm, PhonePe, GPay</strong> or any UPI App to pay <strong>₹{grandTotal.toFixed(2)}</strong> directly.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Optional UTR Ref Field */}
                  <div className="pt-2 border-t border-emerald-200/60 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      12-Digit UPI Ref / UTR No. (Optional):
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={enteredUtr}
                      onChange={(e) => setEnteredUtr(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 432109876543 (from UPI receipt)"
                      className="w-full text-xs font-mono bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Pay at Doorstep Options:</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    You can pay the rider in physical cash or scan the FoodLo Doorstep UPI QR on arrival.
                  </p>
                </div>
              )}
            </div>

            {/* Bill Details */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Bill Summary
              </h3>

              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>Item Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                  <span className="flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Promo Discount ({appliedCoupon?.code})</span>
                  </span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>Delivery Fee ({deliveryInfo.distanceKm} km)</span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 font-semibold">FREE</span>
                  ) : (
                    `₹${deliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center justify-between">
                <span>{deliveryInfo.breakdown}</span>
                <span className="font-bold">
                  {deliveryInfo.distanceKm <= 5 ? 'Flat ₹25' : `+₹${deliveryInfo.extraFee}`}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>Platform Fee</span>
                <span>₹{platformFee.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Grand Total</span>
                <span className="text-base font-extrabold text-emerald-600">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Strict No-Cancellation Notice */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-amber-950">Strict No-Cancellation Policy:</span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Artisan kitchens begin fresh cooking immediately upon order placement. Orders cannot be cancelled or modified once confirmed.
                </p>
              </div>
            </div>

            {/* Safety Protocol Badge */}
            <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-emerald-900">Safe & Clean Delivery</p>
                <p className="text-gray-500 text-[11px]">
                  All cafe partners & student couriers adhere to strict hygiene protocols.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Checkout CTA */}
        {items.length > 0 && !createdOrder && (
          <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0 z-20 shadow-lg">
            <button
              onClick={handleCheckout}
              disabled={
                isPlacingOrder ||
                isBelowMinimumOrder ||
                !isDeliverable ||
                isStoreClosed ||
                hasOutOfStock
              }
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed disabled:shadow-none text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-between shadow-[0px_4px_20px_rgba(16,185,129,0.35)] transition-all tap-feedback cursor-pointer"
            >
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-semibold text-emerald-100 tracking-wider">
                  {isStoreClosed
                    ? 'Kitchen Closed'
                    : hasOutOfStock
                    ? 'Unavailable Dish in Cart'
                    : isBelowMinimumOrder
                    ? 'Min Order Value ₹200'
                    : !isDeliverable
                    ? 'Distance Exceeded'
                    : `Total Payable (${paymentMethod === 'cod' ? 'COD' : 'Paytm / UPI'})`}
                </span>
                <span className="text-base font-extrabold">₹{grandTotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span>
                  {isPlacingOrder
                    ? 'Confirming...'
                    : isStoreClosed
                    ? 'Kitchen Currently Closed'
                    : hasOutOfStock
                    ? 'Remove Out-of-Stock Items'
                    : isBelowMinimumOrder
                    ? `Add ₹${amountNeededForMinimum.toFixed(0)} More`
                    : !isDeliverable
                    ? 'Max 10 km Radius'
                    : 'Place Order'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Delivery Address Management Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />
    </div>
  )
}
