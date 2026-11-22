'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import LiveDeliveryMap from '@/components/LiveDeliveryMap'
import {
  Utensils,
  Clock,
  CheckCircle2,
  Phone,
  ChevronLeft,
  Bike,
  MapPin,
  PackageCheck,
  Camera,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Star,
  Heart,
  Send,
  Sparkles,
} from 'lucide-react'
import { getOrderById, SAGA_ORDERS_EVENT } from '@/lib/services/orderService'
import { getOrderRating, submitOrderRating, type OrderRating } from '@/lib/services/ratingService'
import { SEED_CAFES } from '@/lib/data/mockData'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { sounds } from '@/lib/utils/soundEffects'
import { createWhatsAppUrl } from '@/lib/utils/whatsapp'
import type { Order, OrderStatus } from '@/lib/supabase/types'

interface OrderTrackingViewProps {
  orderId: string
}

export default function OrderTrackingView({ orderId }: OrderTrackingViewProps) {
  const [order, setOrder] = useState<Order | null>(() => {
    if (typeof window !== 'undefined') {
      return getOrderById(orderId) || null
    }
    return null
  })
  const [isHydrating, setIsHydrating] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const local = getOrderById(orderId)
      if (local) return false
      return isSupabaseConfigured()
    }
    return false
  })
  const [isLiveConnected, setIsLiveConnected] = useState(false)
  const prevStatusRef = React.useRef<OrderStatus | null>(order?.status || null)

  // Customer Rating & Review State
  const [ratingData, setRatingData] = useState<OrderRating | null>(() => {
    if (typeof window !== 'undefined') return getOrderRating(orderId)
    return null
  })
  const [foodRating, setFoodRating] = useState<number>(5)
  const [riderRating, setRiderRating] = useState<number>(5)
  const [selectedTip, setSelectedTip] = useState<number>(0)
  const [customTipInput, setCustomTipInput] = useState<string>('')
  const [isCustomTip, setIsCustomTip] = useState<boolean>(false)
  const [reviewNotes, setReviewNotes] = useState<string>('')
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false)

  // Fetch and subscribe to order updates
  useEffect(() => {
    // 1. Cross-device cloud fetch from Supabase if order was not in local cache
    if (isHydrating && isSupabaseConfigured()) {
      try {
        const supabase = createClient()
        Promise.resolve(
          supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()
        )
          .then(({ data, error }) => {
            if (data && !error) {
              const remoteOrder = data as Order
              setOrder(remoteOrder)
              prevStatusRef.current = remoteOrder.status
            }
            setIsHydrating(false)
          })
          .catch(() => setIsHydrating(false))
      } catch {
        // Fallback on unexpected client failure
      }
    }

    // 3. React to local multi-tab / service events
    const handleUpdate = () => {
      const updated = getOrderById(orderId)
      if (updated) {
        if (prevStatusRef.current && prevStatusRef.current !== updated.status) {
          sounds.playNotificationChime()
        }
        prevStatusRef.current = updated.status
        setOrder(updated)
      }
    }

    window.addEventListener(SAGA_ORDERS_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)

    // 4. Supabase Realtime channel subscription
    try {
      const supabase = createClient()
      const channel = supabase
        .channel(`order-tracking-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`,
          },
          (payload) => {
            if (payload.new) {
              const newOrder = payload.new as Order
              if (prevStatusRef.current && prevStatusRef.current !== newOrder.status) {
                sounds.playNotificationChime()
              }
              prevStatusRef.current = newOrder.status
              setOrder(newOrder)
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsLiveConnected(true)
          }
        })

      return () => {
        window.removeEventListener(SAGA_ORDERS_EVENT, handleUpdate)
        window.removeEventListener('storage', handleUpdate)
        supabase.removeChannel(channel)
      }
    } catch {
      return () => {
        window.removeEventListener(SAGA_ORDERS_EVENT, handleUpdate)
        window.removeEventListener('storage', handleUpdate)
      }
    }
  }, [orderId, isHydrating])

  if (!order && isHydrating) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 animate-pulse">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900 mb-1">Connecting to Kitchen Dispatch...</h3>
        <p className="text-xs text-slate-500 max-w-xs">Fetching live ETA, student courier location & delivery OTP.</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-28">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4">
            <Utensils className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Order Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">
            We could not locate order &quot;{orderId}&quot;. It may still be syncing or placed under another account.
          </p>
          <Link
            href="/orders"
            className="px-6 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 transition-colors inline-block"
          >
            View All Orders
          </Link>
        </main>
      </div>
    )
  }

  const cafe = SEED_CAFES.find((c) => c.id === order.cafe_id)

  const handleSubmitRating = () => {
    if (!order) return
    setIsSubmittingRating(true)
    const tipAmount = isCustomTip ? Math.max(0, Number(customTipInput) || 0) : selectedTip

    const submitted = submitOrderRating({
      orderId: order.id,
      orderNumber: order.order_number,
      cafeId: order.cafe_id,
      cafeName: cafe?.name || 'Saga Cafe',
      riderId: order.rider_id || '66666666-6666-4666-a666-666666666666',
      riderName: 'Vikram Singh',
      foodRating,
      riderRating,
      riderTipInr: tipAmount,
      reviewText: reviewNotes,
    })

    setRatingData(submitted)
    setIsSubmittingRating(false)
    try {
      sounds.playSuccessCelebration()
    } catch {
      // ignore
    }
  }

  // Status index for timeline stepper
  const statusSteps: { key: OrderStatus; label: string; subtext: string; icon: React.ElementType }[] = [
    {
      key: 'placed',
      label: 'Order Placed',
      subtext: 'Your order was sent to the kitchen',
      icon: Clock,
    },
    {
      key: 'preparing',
      label: 'Kitchen Preparing',
      subtext: 'Chef is baking your meal fresh',
      icon: Utensils,
    },
    {
      key: 'ready_for_pickup',
      label: 'Ready for Pickup',
      subtext: 'Food is packed and sealed hot',
      icon: PackageCheck,
    },
    {
      key: 'out_for_delivery',
      label: 'Out for Delivery',
      subtext: 'Student Rider Vikram is en route',
      icon: Bike,
    },
    {
      key: 'delivered',
      label: 'Delivered',
      subtext: 'Enjoy your artisan SAGA feast!',
      icon: CheckCircle2,
    },
  ]

  const statusOrderIndexMap: Record<OrderStatus, number> = {
    placed: 0,
    confirmed: 1,
    preparing: 1,
    ready_for_pickup: 2,
    out_for_delivery: 3,
    delivered: 4,
    cancelled: -1,
  }

  const currentStepIndex = statusOrderIndexMap[order.status] ?? 0

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/orders"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>All Orders</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-700">
              {isLiveConnected ? 'Live Realtime' : 'Live Sync Active'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 space-y-5">
        {/* Order Identity Banner */}
        <div className="space-y-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 block">
            ORDER #{order.order_number}
          </span>
          <h1 className="text-2xl font-black text-slate-900">
            {order.status === 'delivered' ? (
              <span className="text-emerald-700">Order Delivered 🎉</span>
            ) : order.status === 'out_for_delivery' ? (
              <>
                Arriving in <span className="text-emerald-600">8–12 mins</span>
              </>
            ) : (
              <>
                Arriving in <span className="text-emerald-600">20–25 mins</span>
              </>
            )}
          </h1>
          <p className="text-xs text-slate-500">
            {cafe?.name || 'Saga Cafe'} • {order.items.reduce((s, i) => s + i.quantity, 0)} items
          </p>
        </div>

        {/* Hero Visual Banner */}
        <div className="relative w-full h-44 rounded-2xl overflow-hidden shadow-sm">
          <Image
            src={
              cafe?.banner_url ||
              'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'
            }
            alt="Saga Cafe Food"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <Utensils className="w-4 h-4 text-emerald-400" />
              <span>
                {order.status === 'delivered'
                  ? 'Delivered with safe hygiene protocols'
                  : order.status === 'out_for_delivery'
                  ? 'Rider is on the way to your door'
                  : 'Artisan kitchen is crafting your meal'}
              </span>
            </div>
          </div>
        </div>

        {/* CUSTOMER ORDER RATING & REVIEW CARD (When Delivered) */}
        {order.status === 'delivered' && (
          ratingData ? (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 rounded-3xl p-5 shadow-sm space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Feedback Submitted
                    </span>
                    <h3 className="text-sm font-black text-emerald-950">
                      Thank you for rating your SAGA meal!
                    </h3>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full shadow-2xs">
                  Verified Review
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-emerald-200/60">
                <div className="bg-white/80 rounded-xl p-3 border border-emerald-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Food Taste & Freshness</span>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= ratingData.foodRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-black text-slate-800 ml-1">
                      {ratingData.foodRating}.0
                    </span>
                  </div>
                </div>

                <div className="bg-white/80 rounded-xl p-3 border border-emerald-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Student Courier Experience</span>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= ratingData.riderRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-black text-slate-800 ml-1">
                      {ratingData.riderRating}.0
                    </span>
                  </div>
                </div>
              </div>

              {ratingData.riderTipInr > 0 && (
                <div className="bg-emerald-100/70 border border-emerald-300 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-900">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    <span>₹{ratingData.riderTipInr} Courier Gratuity Sent</span>
                  </span>
                  <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded text-emerald-800">
                    Credited to Vikram Singh
                  </span>
                </div>
              )}

              {ratingData.reviewText && (
                <p className="text-xs italic text-emerald-900 bg-white/60 p-2.5 rounded-xl border border-emerald-100">
                  &ldquo;{ratingData.reviewText}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white border-2 border-emerald-500/30 rounded-3xl p-5 shadow-md space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                    Delivered • Rate Your Experience
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    How was your order today?
                  </h3>
                </div>
                <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-emerald-600" />
                </span>
              </div>

              {/* 1. Food Taste & Packaging Rating */}
              <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-800">
                    1. Food Taste & Freshness ({cafe?.name || 'Saga Cafe'})
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {foodRating === 5
                      ? 'Exceptional & Hot! 🌟'
                      : foodRating === 4
                      ? 'Great Taste 👌'
                      : foodRating === 3
                      ? 'Good 👍'
                      : 'Needs Improvement'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFoodRating(star)}
                      className="p-1 rounded-lg hover:bg-white transition-transform active:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= foodRating
                            ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                            : 'text-slate-300 hover:text-slate-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Student Courier Service */}
              <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-800">
                    2. Student Courier Service (Vikram Singh)
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {riderRating === 5 ? 'Swift & Polite ⚡' : riderRating >= 4 ? 'Great Delivery 🛵' : 'Good Service'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRiderRating(star)}
                      className="p-1 rounded-lg hover:bg-white transition-transform active:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= riderRating
                            ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                            : 'text-slate-300 hover:text-slate-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Optional Rider Tip Gratuity */}
                <div className="pt-2 border-t border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500" />
                      <span>Add Courier Tip (100% goes to Vikram)</span>
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-800">
                      {isCustomTip
                        ? `₹${customTipInput || 0}`
                        : selectedTip > 0
                        ? `₹${selectedTip}`
                        : 'No Tip'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[0, 10, 20, 30, 50].map((amt) => {
                      const isSelected = !isCustomTip && selectedTip === amt
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setIsCustomTip(false)
                            setSelectedTip(amt)
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {amt === 0 ? 'No Tip' : `₹${amt}`}
                        </button>
                      )
                    })}

                    <button
                      type="button"
                      onClick={() => setIsCustomTip(true)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        isCustomTip
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {isCustomTip && (
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={customTipInput}
                      onChange={(e) => setCustomTipInput(e.target.value)}
                      placeholder="Enter custom tip amount (e.g. ₹40)"
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
                    />
                  )}
                </div>
              </div>

              {/* 3. Review Comments Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Comments or Compliments (Optional):
                </label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Pizza crust was crisp and hot! Courier arrived early."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-emerald-500 focus:bg-white"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                onClick={handleSubmitRating}
                disabled={isSubmittingRating}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Review {selectedTip > 0 || Number(customTipInput) > 0 ? '& Send Tip' : ''}</span>
              </button>
            </div>
          )
        )}

        {/* Free Live GPS Delivery Route Map & Google Maps Navigation */}
        <LiveDeliveryMap
          cafeName={cafe?.name || 'Saga Cafe'}
          cafeAddress={cafe?.address || 'Koramangala, Bengaluru'}
          cafeCoordinates={{
            lat: cafe?.latitude ? Number(cafe.latitude) : 12.934533,
            lng: cafe?.longitude ? Number(cafe.longitude) : 77.626579,
          }}
          customerAddress={`${order.delivery_address.building}, ${order.delivery_address.street}`}
          customerCoordinates={{ lat: 12.9382, lng: 77.6195 }}
          orderStatus={order.status}
          riderName="Vikram Singh (Student Courier)"
        />

        {/* Student Rider Delivery Handover OTP */}
        {order.status !== 'delivered' && (
          <div className="bg-emerald-50 border-2 border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                Handover Verification OTP
              </span>
              <p className="text-xs text-emerald-700 mt-0.5">
                Share this 4-digit code with the courier upon arrival:
              </p>
            </div>
            <div className="font-mono font-black text-xl bg-white px-3.5 py-1.5 rounded-xl border border-emerald-300 text-emerald-900 tracking-wider shadow-xs">
              {order.delivery_otp || '4829'}
            </div>
          </div>
        )}

        {/* Strict No-Cancellation Guarantee Notice */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-[11px]">
              Fresh kitchen preparation active • Orders cannot be cancelled
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
            {order.payment_method === 'cod' ? 'COD' : 'Paytm UPI'}
          </span>
        </div>

        {/* Vertical Status Stepper Timeline */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative">
          <h3 className="font-black text-slate-900 text-sm mb-4">
            Live Delivery Progress
          </h3>

          <div className="space-y-6 relative">
            {statusSteps.map((step, idx) => {
              const isPast = idx < currentStepIndex
              const isCurrent = idx === currentStepIndex
              const StepIcon = step.icon

              return (
                <div key={step.key} className="flex items-start gap-3.5 relative">
                  {/* Connecting Line */}
                  {idx < statusSteps.length - 1 && (
                    <div
                      className={`absolute left-3 top-7 w-0.5 h-10 -ml-[1px] transition-colors ${
                        idx < currentStepIndex ? 'bg-emerald-600' : 'bg-slate-200'
                      }`}
                    />
                  )}

                  {/* Step Bubble */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 animate-pulse'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <StepIcon className="w-3 h-3" />
                    )}
                  </div>

                  {/* Step Text */}
                  <div className="flex flex-col">
                    <span
                      className={`text-xs font-bold leading-tight ${
                        isCurrent
                          ? 'text-emerald-700 font-black'
                          : isPast
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span
                      className={`text-[11px] mt-0.5 ${
                        isCurrent ? 'text-slate-600 italic' : 'text-slate-400'
                      }`}
                    >
                      {step.subtext}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Student Rider Info Card */}
        {order.status === 'out_for_delivery' && (
          <div className="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-800 font-black text-sm flex items-center justify-center">
                VS
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-slate-900 text-sm">Vikram Singh</h4>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.2 rounded-full">
                    Student Rider
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Bike className="w-3 h-3 text-blue-600" /> Hero Electric Scooter • 4.9 ★
                </p>
              </div>
            </div>

            <a
              href="tel:+919770055667"
              className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 shadow-xs"
              aria-label="Call Rider"
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Courier Parcel Proof Photos (Pickup & Delivery) */}
        {(order.pickup_photo_url || order.delivery_photo_url) && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                  Courier Parcel Proof Photos
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> SAGA Verified
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {order.pickup_photo_url ? (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 1. Cafe Pickup
                  </span>
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
                    <Image
                      src={order.pickup_photo_url}
                      alt="Pickup Proof"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                      {order.pickup_timestamp
                        ? new Date(order.pickup_timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Sealed'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 opacity-60">
                  <span className="text-[11px] font-medium text-slate-500">1. Cafe Pickup</span>
                  <div className="aspect-video rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                    Awaiting Pickup
                  </div>
                </div>
              )}

              {order.delivery_photo_url ? (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 2. Handover Drop
                  </span>
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
                    <Image
                      src={order.delivery_photo_url}
                      alt="Delivery Proof"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                      {order.delivery_timestamp
                        ? new Date(order.delivery_timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Delivered'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 opacity-60">
                  <span className="text-[11px] font-medium text-slate-500">2. Handover Drop</span>
                  <div className="aspect-video rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                    Pending Drop
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WhatsApp Order Updates Card */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-emerald-950 text-xs">
                Get WhatsApp Delivery Updates
              </h4>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Receive live rider location & invoice via WhatsApp
              </p>
            </div>
          </div>

          <a
            href={createWhatsAppUrl(
              order.delivery_address.phone,
              `Hello SAGA Support! I'm tracking order #${order.order_number}. Please keep me updated on WhatsApp.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <span>Updates</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Quick Contact Actions */}
        <div className="flex gap-2">
          <a
            href="tel:+919880011223"
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Phone className="w-4 h-4" />
            <span>Call Cafe ({cafe?.name || 'Saga Cafe'})</span>
          </a>

          <Link
            href="/"
            className="px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
          >
            <span>Home</span>
          </Link>
        </div>

        {/* Order Items & Bill Summary */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-500">
              Items Summary ({order.items.reduce((s, i) => s + i.quantity, 0)})
            </h3>
            <span className="text-xs font-bold text-emerald-700">
              {order.payment_method.toUpperCase()} • {order.payment_status.toUpperCase()}
            </span>
          </div>

          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs text-slate-700">
                <span className="font-medium">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-extrabold text-slate-900">
                  ₹{item.price_inr * item.quantity}
                </span>
              </div>
            ))}
          </div>

          {/* Bill Calculation */}
          <div className="pt-2 border-t border-dashed border-slate-200 space-y-1.5 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Item Subtotal</span>
              <span>₹{order.subtotal_inr}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{order.delivery_fee_inr === 0 ? 'FREE' : `₹${order.delivery_fee_inr}`}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee</span>
              <span>₹{order.platform_fee_inr || 5}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-100 text-slate-900 font-black text-sm">
              <span>Grand Total</span>
              <span className="text-emerald-700 text-base">₹{order.total_amount_inr}</span>
            </div>
          </div>

          {/* Delivery Drop Location */}
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">
                  Deliver to {order.delivery_address.recipient_name}
                </span>
                {order.delivery_address.label && (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded">
                    {order.delivery_address.label}
                  </span>
                )}
                {order.delivery_address.distance_km && (
                  <span className="text-[10px] font-bold text-slate-500">
                    ({order.delivery_address.distance_km} km)
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-[11px]">
                {order.delivery_address.building ? `${order.delivery_address.building}, ` : ''}
                {order.delivery_address.street}, {order.delivery_address.city}{' '}
                {order.delivery_address.postal_code ? `- ${order.delivery_address.postal_code}` : ''}
              </p>
              <p className="text-[10px] text-slate-400">
                Contact: {order.delivery_address.phone}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
