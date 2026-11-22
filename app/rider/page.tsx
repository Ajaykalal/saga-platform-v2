'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Navigation,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package,
  Power,
  RotateCw,
  ShoppingBag,
  Sparkles,
  Award,
  Wallet,
  Camera,
  MessageCircle,
  Check,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Banknote,
  QrCode,
  X,
  Building2,
  Edit3,
  ArrowDownRight,
} from 'lucide-react'
import { SAGA_PAYMENT_CONFIG } from '@/lib/config/paymentConfig'
import { useAuth } from '@/lib/context/AuthContext'
import { SEED_CAFES, SEED_WALLETS } from '@/lib/data/mockData'
import {
  getStoredOrders,
  updateOrderStatusAndAutomate,
  SAGA_ORDERS_EVENT,
  getStoredWallets,
} from '@/lib/services/orderService'
import {
  getRiderBankDetails,
  saveRiderBankDetails,
  requestWalletWithdrawal,
  type RiderBankDetails,
} from '@/lib/services/settlementService'
import { sounds } from '@/lib/utils/soundEffects'
import {
  createWhatsAppUrl,
  formatOrderPickedUpWhatsApp,
  formatOrderDeliveredWhatsApp,
} from '@/lib/utils/whatsapp'
import type { Order, Wallet as WalletType } from '@/lib/supabase/types'

export default function RiderPage() {
  const { user } = useAuth()

  // Online / Offline Availability Toggle
  const [isOnline, setIsOnline] = useState<boolean>(true)

  // Navigation tab: 'feed' (Ready for pickup), 'active' (In-transit trip), 'wallet' (Earnings)
  const [activeTab, setActiveTab] = useState<'feed' | 'active' | 'wallet'>('feed')

  // Orders State from centralized service
  const [orders, setOrders] = useState<Order[]>(() => getStoredOrders())

  // Wallets State
  const [wallets, setWallets] = useState<WalletType[]>(() => {
    if (typeof window !== 'undefined') return getStoredWallets()
    return SEED_WALLETS
  })
  const riderWallet = wallets.find((w) => w.role === 'rider') || SEED_WALLETS[2]
  const [earnings, setEarnings] = useState<number>(riderWallet.balance_inr)
  const [todayDeliveriesCount, setTodayDeliveriesCount] = useState<number>(8)
  const [withdrawnAmount, setWithdrawnAmount] = useState<number>(0)

  // Doorstep COD Payment Choice & Floating Cash State
  const [codPaymentType, setCodPaymentType] = useState<'cash' | 'upi'>('cash')
  const [showDoorstepQr, setShowDoorstepQr] = useState<boolean>(false)
  const [floatingCashInHand, setFloatingCashInHand] = useState<number>(350) // Mocked floating cash collected today
  const [showRemitModal, setShowRemitModal] = useState<boolean>(false)

  // Rider Bank Account State
  const [riderBank, setRiderBank] = useState<RiderBankDetails>(() => getRiderBankDetails())
  const [isRiderBankModalOpen, setIsRiderBankModalOpen] = useState<boolean>(false)
  const [bankFormHolder, setBankFormHolder] = useState<string>('')
  const [bankFormBankName, setBankFormBankName] = useState<string>('')
  const [bankFormAccNum, setBankFormAccNum] = useState<string>('')
  const [bankFormConfirmAccNum, setBankFormConfirmAccNum] = useState<string>('')
  const [bankFormIfsc, setBankFormIfsc] = useState<string>('')
  const [bankFormUpi, setBankFormUpi] = useState<string>('')
  const [bankFormType, setBankFormType] = useState<'Savings' | 'Current'>('Savings')
  const [bankFormError, setBankFormError] = useState<string | null>(null)

  // Withdrawal Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false)
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<string>('')
  const [withdrawPayoutMode, setWithdrawPayoutMode] = useState<'bank_transfer' | 'upi'>('upi')
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false)
  const [withdrawSuccess, setWithdrawSuccess] = useState<boolean>(false)
  const [lastPayoutRef, setLastPayoutRef] = useState<string | null>(null)

  // Celebration banner
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null)

  // Current active delivery accepted by this rider (persisted across reloads)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('saga_rider_active_order_v1')
      if (saved) {
        const found = orders.find((o) => o.id === saved)
        if (found && found.status !== 'delivered' && found.status !== 'cancelled') {
          return saved
        }
      }
    }
    return orders.find((o) => o.status === 'out_for_delivery')?.id || null
  })

  // Delivery trip step: 'to_cafe' | 'picked_up' (persisted across reloads)
  const [localTripStep, setLocalTripStep] = useState<'to_cafe' | 'picked_up'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('saga_rider_trip_step_v1')
      if (saved === 'to_cafe' || saved === 'picked_up') return saved
    }
    return 'to_cafe'
  })

  const updateActiveOrderId = (orderId: string | null) => {
    setActiveOrderId(orderId)
    if (typeof window !== 'undefined') {
      if (orderId) {
        localStorage.setItem('saga_rider_active_order_v1', orderId)
      } else {
        localStorage.removeItem('saga_rider_active_order_v1')
      }
    }
  }

  const updateTripStep = (step: 'to_cafe' | 'picked_up') => {
    setLocalTripStep(step)
    if (typeof window !== 'undefined') {
      localStorage.setItem('saga_rider_trip_step_v1', step)
    }
  }

  useEffect(() => {
    const handleUpdate = () => {
      const updatedOrders = getStoredOrders()
      setOrders(updatedOrders)
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('saga_rider_active_order_v1')
        if (saved) {
          const match = updatedOrders.find((o) => o.id === saved)
          if (!match || match.status === 'delivered' || match.status === 'cancelled') {
            localStorage.removeItem('saga_rider_active_order_v1')
            setActiveOrderId(null)
          }
        }
      }
      const stored = getStoredWallets()
      setWallets(stored)
      const rw = stored.find((w) => w.role === 'rider')
      if (rw) {
        setEarnings(rw.balance_inr)
      }
      setRiderBank(getRiderBankDetails())
    }

    window.addEventListener(SAGA_ORDERS_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      window.removeEventListener(SAGA_ORDERS_EVENT, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  // Live Camera / Proof Photos & Verification State
  const pickupInputRef = useRef<HTMLInputElement>(null)
  const deliveryInputRef = useRef<HTMLInputElement>(null)
  const [localPickupPhoto, setLocalPickupPhoto] = useState<string | null>(null)
  const [localDeliveryPhoto, setLocalDeliveryPhoto] = useState<string | null>(null)
  const [enteredOtp, setEnteredOtp] = useState<string>('')
  const [otpError, setOtpError] = useState<string | null>(null)

  // Filter orders that are ready for pickup
  const availableOrders = orders.filter((o) => o.status === 'ready_for_pickup')

  // Active delivery order object
  const currentActiveOrder = orders.find((o) => o.id === activeOrderId)
  const activeCafe = currentActiveOrder
    ? SEED_CAFES.find((c) => c.id === currentActiveOrder.cafe_id)
    : null

  // Resolved trip step and photos
  const tripStep = currentActiveOrder?.status === 'out_for_delivery' ? 'picked_up' : localTripStep
  const pickupPhoto = localPickupPhoto || currentActiveOrder?.pickup_photo_url || null
  const deliveryPhoto = localDeliveryPhoto || currentActiveOrder?.delivery_photo_url || null

  // Handle camera photo selection via file input
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, type: 'pickup' | 'delivery') => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      sounds.playCameraShutter()
      triggerHaptic()
      if (type === 'pickup') {
        setLocalPickupPhoto(dataUrl)
      } else {
        setLocalDeliveryPhoto(dataUrl)
      }
    }
    reader.readAsDataURL(file)
  }

  // Quick simulated photo snapshot helper for desktop / testing
  const handleQuickSimulatePhoto = (type: 'pickup' | 'delivery') => {
    sounds.playCameraShutter()
    triggerHaptic()
    const sampleUrl =
      type === 'pickup'
        ? 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800'
        : 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800'

    if (type === 'pickup') {
      setLocalPickupPhoto(sampleUrl)
    } else {
      setLocalDeliveryPhoto(sampleUrl)
    }
  }

  // Accept an order from the live broadcast
  const handleAcceptOrder = (orderId: string) => {
    updateOrderStatusAndAutomate(orderId, 'ready_for_pickup', {
      riderId: user?.id || '66666666-6666-4666-a666-666666666666',
    })
    sounds.playNotificationChime()
    setOrders(getStoredOrders())
    updateActiveOrderId(orderId)
    updateTripStep('to_cafe')
    setActiveTab('active')
    setLocalPickupPhoto(null)
    setLocalDeliveryPhoto(null)
    setEnteredOtp('')
    setOtpError(null)
    triggerHaptic()
  }

  // Step 1: Mark Picked Up from Cafe
  const handleMarkPickedUp = (orderId: string) => {
    const finalPickupPhoto =
      pickupPhoto || 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800'

    updateOrderStatusAndAutomate(orderId, 'out_for_delivery', {
      pickupPhotoUrl: finalPickupPhoto,
    })
    sounds.playNotificationChime()
    setOrders(getStoredOrders())
    updateTripStep('picked_up')
    triggerHaptic()
  }

  // Step 2: Confirm Delivered to Customer
  const handleConfirmDelivered = (orderId: string) => {
    if (!currentActiveOrder) return

    // Verify 4-digit Handover OTP
    const expectedOtp = (currentActiveOrder.delivery_otp || '4829').trim()
    if (enteredOtp.trim() !== expectedOtp) {
      setOtpError(`Incorrect OTP! Please ask customer for code (Hint: ${expectedOtp})`)
      sounds.playWarningAlert()
      triggerHaptic()
      return
    }

    setOtpError(null)
    const finalDeliveryPhoto =
      deliveryPhoto || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800'

    const isCod = currentActiveOrder.payment_method === 'cod'
    if (isCod && codPaymentType === 'cash') {
      setFloatingCashInHand((prev) => prev + currentActiveOrder.total_amount_inr)
    }

    updateOrderStatusAndAutomate(orderId, 'delivered', {
      deliveryPhotoUrl: finalDeliveryPhoto,
      paymentCollectedBy: isCod ? (codPaymentType === 'cash' ? 'rider_cash' : 'rider_upi') : 'online',
    })
    sounds.playSuccessCelebration()
    setOrders(getStoredOrders())

    // Update local earnings from wallet service
    const riderWallets = getStoredWallets()
    const rw = riderWallets.find((w) => w.role === 'rider')
    if (rw) {
      setEarnings(rw.balance_inr)
    } else {
      setEarnings((prev) => prev + 55)
    }

    setTodayDeliveriesCount((prev) => prev + 1)
    updateActiveOrderId(null)
    updateTripStep('to_cafe')
    setLocalPickupPhoto(null)
    setLocalDeliveryPhoto(null)
    setEnteredOtp('')
    setCelebrationMessage(
      isCod && codPaymentType === 'cash'
        ? `🎉 Delivery Complete! ₹55 fee credited. Physical cash ₹${currentActiveOrder.total_amount_inr} added to Cash-in-Hand.`
        : '🎉 Delivery Complete! ₹55 credited to your FoodLo Rider Wallet.'
    )
    triggerHaptic()
    setTimeout(() => setCelebrationMessage(null), 5000)
    setActiveTab('wallet')
  }

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 40])
      } catch {
        // Ignored
      }
    }
  }

  const handleOpenRiderBankModal = () => {
    setBankFormHolder(riderBank.riderName)
    setBankFormBankName(riderBank.bankName)
    setBankFormAccNum(riderBank.accountNumber)
    setBankFormConfirmAccNum(riderBank.accountNumber)
    setBankFormIfsc(riderBank.ifscCode)
    setBankFormUpi(riderBank.upiId)
    setBankFormType(riderBank.accountType || 'Savings')
    setBankFormError(null)
    setIsRiderBankModalOpen(true)
  }

  const handleSaveRiderBankForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!bankFormHolder.trim()) {
      setBankFormError('Please enter account holder name.')
      return
    }
    if (!bankFormAccNum.trim() || bankFormAccNum.trim().length < 8) {
      setBankFormError('Please enter a valid bank account number.')
      return
    }
    if (bankFormAccNum.trim() !== bankFormConfirmAccNum.trim()) {
      setBankFormError('Account numbers do not match.')
      return
    }
    if (!bankFormIfsc.trim() || bankFormIfsc.trim().length !== 11) {
      setBankFormError('Please enter an 11-character IFSC code (e.g. HDFC0000456).')
      return
    }

    const updated = saveRiderBankDetails({
      riderName: bankFormHolder.trim(),
      bankName: bankFormBankName.trim() || 'HDFC Bank',
      accountNumber: bankFormAccNum.trim(),
      ifscCode: bankFormIfsc.trim().toUpperCase(),
      upiId: bankFormUpi.trim() || `${bankFormHolder.toLowerCase().replace(/\s+/g, '')}@okaxis`,
      accountType: bankFormType,
    })

    setRiderBank(updated)
    setIsRiderBankModalOpen(false)
    sounds.playNotificationChime()
    setCelebrationMessage('✅ Bank account & UPI details saved successfully!')
    setTimeout(() => setCelebrationMessage(null), 4000)
  }

  const maxNetWithdrawable = Math.max(0, earnings - floatingCashInHand)

  const handleOpenWithdrawModal = () => {
    setWithdrawAmountInput(maxNetWithdrawable > 0 ? maxNetWithdrawable.toString() : '')
    setWithdrawError(null)
    setWithdrawSuccess(false)
    setShowWithdrawModal(true)
  }

  const handleExecuteWithdraw = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(withdrawAmountInput)
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError('Please enter a valid withdrawal amount.')
      return
    }
    if (amount > maxNetWithdrawable) {
      setWithdrawError(`Requested ₹${amount} exceeds net withdrawable balance ₹${maxNetWithdrawable}.`)
      return
    }

    setIsSubmittingWithdraw(true)
    setTimeout(() => {
      const result = requestWalletWithdrawal({
        walletId: riderWallet.id,
        role: 'rider',
        amountInr: amount,
        mode: withdrawPayoutMode,
        bankDetails: {
          accountHolder: riderBank.riderName,
          bankName: riderBank.bankName,
          accountNumber: riderBank.accountNumber,
          ifscCode: riderBank.ifscCode,
          upiId: riderBank.upiId,
        },
      })

      setIsSubmittingWithdraw(false)
      if (result.success) {
        sounds.playSuccessCelebration()
        setLastPayoutRef(result.referenceNumber)
        setEarnings((prev) => Math.max(0, prev - amount))
        setWithdrawnAmount((prev) => prev + amount)
        setWithdrawSuccess(true)
        setTimeout(() => {
          setShowWithdrawModal(false)
          setWithdrawSuccess(false)
        }, 2200)
      } else {
        setWithdrawError(result.message)
      }
    }, 700)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-24 md:pb-12">
      {/* Top Rider Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shadow-xs text-sm">
                VS
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm md:text-base leading-tight">
                  Vikram Singh
                </span>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Student Rider
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-600" /> Sagwara Central Hub
              </p>
            </div>
          </div>

          {/* Online / Offline Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsOnline(!isOnline)
                triggerHaptic()
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                isOnline
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${isOnline ? 'animate-pulse' : ''}`} />
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>
        </div>

        {/* Shift Snapshot Bar */}
        <div className="bg-slate-900 text-white px-4 py-2 text-xs">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> 5:00 - 9:30 PM Shift
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Award className="w-3.5 h-3.5 text-amber-400" /> 4.9 ★ (98% On-Time)
              </span>
            </div>
            <div className="font-semibold text-emerald-400 flex items-center gap-1">
              <span>Today:</span>
              <span className="text-white font-extrabold text-sm">₹{earnings}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-slate-100 bg-white">
          <div className="max-w-2xl mx-auto flex">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex-1 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'feed'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Available Drops</span>
              {availableOrders.length > 0 && (
                <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                  {availableOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'active'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>Active Trip</span>
              {currentActiveOrder && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-1" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('wallet')}
              className={`flex-1 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'wallet'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>₹ Earnings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 py-5 w-full flex-1">
        {/* Celebration Toast */}
        {celebrationMessage && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-600 text-white shadow-lg flex items-center gap-3 animate-slideIn">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <p className="text-sm font-bold">{celebrationMessage}</p>
          </div>
        )}

        {/* TAB 1: AVAILABLE DROPS FEED */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {/* Offline Alert if rider switched off */}
            {!isOnline ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4">
                  <Power className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-lg mb-1">
                  You are currently Offline
                </h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto mb-6">
                  Turn your toggle ON to receive instant delivery pings from nearby FoodLo partner cafes and earn ₹45–₹65 per campus drop.
                </p>
                <button
                  onClick={() => setIsOnline(true)}
                  className="px-6 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Go Online Now
                </button>
              </div>
            ) : availableOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-3 animate-pulse">
                  <RotateCw className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">
                  Searching for Ready Orders...
                </h3>
                <p className="text-slate-500 text-xs max-w-xs mx-auto">
                  Our cafe partner kitchen display systems are cooking freshly. New orders will ping here the instant they are marked &quot;Ready for Pickup&quot;.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Live Ready-For-Pickup Broadcast ({availableOrders.length})
                  </h2>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Auto-updating
                  </span>
                </div>

                {availableOrders.map((order) => {
                  const cafe = SEED_CAFES.find((c) => c.id === order.cafe_id) || SEED_CAFES[0]
                  const payoutAmount = 55 // ₹35 base + ₹20 student incentive

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border-2 border-emerald-500/30 p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-emerald-600 text-white px-3 py-1 rounded-bl-xl text-xs font-black tracking-wide">
                        ₹{payoutAmount} PAYOUT
                      </div>

                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm shrink-0">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div className="pr-16">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                            Ready Now
                          </span>
                          <h3 className="font-black text-slate-900 text-base mt-0.5">
                            {cafe.name}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" /> {cafe.address} • 0.8 km away
                          </p>
                        </div>
                      </div>

                      {/* Drop Location */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-3 text-xs space-y-1.5">
                        <div className="flex items-start gap-2">
                          <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-700">Drop Address: </span>
                            <span className="text-slate-600">
                              {order.delivery_address.building}, {order.delivery_address.street}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 pt-1 border-t border-slate-200/60">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {order.items.reduce((s, i) => s + i.quantity, 0)} items ({order.items.map((i) => i.name).join(', ')})
                          </span>
                        </div>

                        {order.special_instructions && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded-md font-medium">
                            Note: {order.special_instructions}
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleAcceptOrder(order.id)}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
                      >
                        <span>Accept Delivery (₹{payoutAmount})</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE DELIVERY WORKFLOW */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {!currentActiveOrder ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <Navigation className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">
                  No Active Delivery
                </h3>
                <p className="text-slate-500 text-xs max-w-xs mx-auto mb-4">
                  Accept an order from the Available Drops feed to start delivery navigation.
                </p>
                <button
                  onClick={() => setActiveTab('feed')}
                  className="px-5 py-2 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700 cursor-pointer"
                >
                  View Available Drops
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Stepper Progress */}
                <div className="bg-slate-900 text-white p-4">
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-bold text-emerald-400">
                      ORDER #{currentActiveOrder.order_number}
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full text-[11px]">
                      {tripStep === 'to_cafe' ? 'Step 1: Pick Up' : 'Step 2: Deliver Drop'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`flex-1 h-1.5 rounded-full ${
                        tripStep === 'to_cafe' || tripStep === 'picked_up'
                          ? 'bg-emerald-500'
                          : 'bg-slate-700'
                      }`}
                    />
                    <div
                      className={`flex-1 h-1.5 rounded-full ${
                        tripStep === 'picked_up' ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    />
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* STEP 1: PICK UP AT CAFE */}
                  {tripStep === 'to_cafe' ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wide">
                            Pickup Location
                          </span>
                          <h3 className="font-extrabold text-slate-900 text-lg">
                            {activeCafe?.name || 'Meesaavi Cafe and Restro'}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            {activeCafe?.address || 'Nursery Mode, Sagwara'}
                          </p>
                        </div>
                        <a
                          href="tel:+919880011223"
                          className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                          aria-label="Call Cafe"
                        >
                          <Phone className="w-5 h-5" />
                        </a>
                      </div>

                      {/* Package Checklist */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                          <span>Verify Order Items ({currentActiveOrder.items.length})</span>
                          <span className="text-[11px] text-emerald-600 font-semibold">Packed & Hot</span>
                        </div>
                        <div className="space-y-1.5">
                          {currentActiveOrder.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs text-slate-600"
                            >
                              <span className="flex items-center gap-1.5 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {item.quantity}x {item.name}
                              </span>
                              <span className="font-semibold text-slate-800">
                                ₹{item.price_inr * item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Live Parcel Pickup Photo Capture Card */}
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Camera className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-black text-slate-800">
                              Parcel Pickup Photo Proof
                            </span>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              Required
                            </span>
                          </div>
                          {pickupPhoto && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> Captured
                            </span>
                          )}
                        </div>

                        <input
                          ref={pickupInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handleFileSelected(e, 'pickup')}
                        />

                        {pickupPhoto ? (
                          <div className="relative rounded-xl overflow-hidden border border-emerald-300 aspect-video bg-black/5">
                            <Image
                              src={pickupPhoto}
                              alt="Pickup Proof"
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[11px]">
                              <div className="flex items-center gap-1 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Parcel Sealed & Verified</span>
                              </div>
                              <button
                                onClick={() => pickupInputRef.current?.click()}
                                className="bg-black/60 hover:bg-black/80 px-2.5 py-1 rounded-md text-[10px] font-bold text-white transition-colors cursor-pointer"
                              >
                                Retake
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => pickupInputRef.current?.click()}
                              className="py-3 px-2 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-[0.98]"
                            >
                              <Camera className="w-5 h-5 text-emerald-600" />
                              <span>Open Camera</span>
                            </button>
                            <button
                              onClick={() => handleQuickSimulatePhoto('pickup')}
                              className="py-3 px-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-[0.98]"
                            >
                              <Sparkles className="w-5 h-5 text-amber-500" />
                              <span>Auto-Snap Proof</span>
                            </button>
                          </div>
                        )}

                        <p className="text-[10px] text-slate-500 italic">
                          Snap the sealed bag with customer receipt visible before departing from the cafe.
                        </p>
                      </div>

                      {/* WhatsApp Customer Alert */}
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-emerald-950 flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            WhatsApp Customer Update
                          </span>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Send Handover OTP & live GPS tracking link to recipient
                          </p>
                        </div>
                        <a
                          href={createWhatsAppUrl(
                            currentActiveOrder.delivery_address.phone,
                            formatOrderPickedUpWhatsApp(
                              currentActiveOrder,
                              'Vikram Singh',
                              typeof window !== 'undefined' ? window.location.origin : ''
                            )
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors shrink-0"
                        >
                          <span>Send</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => handleMarkPickedUp(currentActiveOrder.id)}
                        className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.98]"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Arrived at Cafe & Mark Order Picked Up</span>
                      </button>
                    </div>
                  ) : (
                    /* STEP 2: OUT FOR DELIVERY TO CUSTOMER */
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wide">
                            Customer Drop
                          </span>
                          <h3 className="font-extrabold text-slate-900 text-lg">
                            {currentActiveOrder.delivery_address.recipient_name}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            {currentActiveOrder.delivery_address.building},{' '}
                            {currentActiveOrder.delivery_address.street}
                          </p>
                        </div>
                        <a
                          href={`tel:${currentActiveOrder.delivery_address.phone}`}
                          className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center hover:bg-blue-100 transition-colors"
                          aria-label="Call Customer"
                        >
                          <Phone className="w-5 h-5" />
                        </a>
                      </div>

                      {/* Special Delivery Instructions */}
                      {currentActiveOrder.special_instructions && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                          <span className="font-bold block mb-0.5">Special Instructions:</span>
                          <p>{currentActiveOrder.special_instructions}</p>
                        </div>
                      )}

                      {/* COD Payment Collection Options at Doorstep */}
                      {currentActiveOrder.payment_method === 'cod' ? (
                        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                                Payment Collection at Doorstep
                              </span>
                              <h4 className="text-base font-extrabold text-amber-950">
                                Collect ₹{currentActiveOrder.total_amount_inr}
                              </h4>
                            </div>
                            <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                              COD Order
                            </span>
                          </div>

                          <p className="text-[11px] text-amber-900">
                            Ask customer if they are paying in physical cash or want to scan your FoodLo UPI QR:
                          </p>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCodPaymentType('cash')
                                setShowDoorstepQr(false)
                                sounds.playNotificationChime()
                              }}
                              className={`p-3 rounded-xl border text-left font-bold text-xs flex flex-col justify-between transition-all cursor-pointer ${
                                codPaymentType === 'cash'
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                  : 'bg-white text-slate-800 border-amber-200 hover:bg-amber-100/50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <Banknote className="w-4 h-4" />
                                {codPaymentType === 'cash' && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <span>Physical Cash</span>
                              <span className="text-[10px] opacity-80 mt-0.5">Adds to Cash-in-Hand</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCodPaymentType('upi')
                                setShowDoorstepQr(true)
                                sounds.playNotificationChime()
                              }}
                              className={`p-3 rounded-xl border text-left font-bold text-xs flex flex-col justify-between transition-all cursor-pointer ${
                                codPaymentType === 'upi'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white text-slate-800 border-amber-200 hover:bg-amber-100/50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <QrCode className="w-4 h-4" />
                                {codPaymentType === 'upi' && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <span>FoodLo Paytm UPI QR</span>
                              <span className="text-[10px] opacity-80 mt-0.5">Direct to Ajay Kalal</span>
                            </button>
                          </div>

                          {/* Doorstep Paytm Standee QR Card */}
                          {showDoorstepQr && (
                            <div className="p-3 bg-white rounded-xl border border-emerald-300 text-center space-y-2">
                              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                                <span className="text-xs font-bold text-emerald-900">
                                  Customer Scans FoodLo QR
                                </span>
                                <span className="text-xs font-black text-emerald-700">
                                  Amount: ₹{currentActiveOrder.total_amount_inr}
                                </span>
                              </div>

                              <div className="relative w-44 h-56 mx-auto rounded-lg overflow-hidden border border-slate-200 shadow-xs">
                                <Image
                                  src={SAGA_PAYMENT_CONFIG.qrImageUrl}
                                  alt="Paytm Standee QR"
                                  fill
                                  className="object-contain"
                                />
                              </div>

                              <p className="text-[11px] text-slate-600">
                                Customer scans with Paytm / PhonePe / GPay. Money goes straight to <strong>Ajay Kalal ({SAGA_PAYMENT_CONFIG.upiId})</strong>. Your Cash-in-Hand liability remains ₹0!
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between text-xs">
                          <span className="text-emerald-800 font-medium">Customer Payment:</span>
                          <span className="font-extrabold text-emerald-900 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                            PRE-PAID VIA PAYTM UPI (₹0 to collect)
                          </span>
                        </div>
                      )}

                      {/* Customer Handover OTP Verification */}
                      <div className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-amber-700" />
                            <span className="text-xs font-black text-amber-950">
                              Customer Handover OTP
                            </span>
                            <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                              Required
                            </span>
                          </div>
                          <span className="text-[11px] text-amber-800 font-medium">
                            Customer OTP: <strong className="font-mono">{currentActiveOrder.delivery_otp || '4829'}</strong>
                          </span>
                        </div>

                        <p className="text-[11px] text-amber-900">
                          Ask recipient for the 4-digit code shown on their tracking screen:
                        </p>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            value={enteredOtp}
                            onChange={(e) => {
                              setEnteredOtp(e.target.value.replace(/\D/g, ''))
                              setOtpError(null)
                            }}
                            placeholder="Enter 4-digit OTP"
                            className="flex-1 px-3 py-2 bg-white rounded-lg border border-amber-300 font-mono text-center text-base tracking-widest font-black focus:outline-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEnteredOtp(currentActiveOrder.delivery_otp || '4829')
                              setOtpError(null)
                            }}
                            className="px-3 py-2 bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Fill OTP
                          </button>
                        </div>

                        {otpError && (
                          <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {otpError}
                          </p>
                        )}
                      </div>

                      {/* Delivery Handover Photo Capture Card */}
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Camera className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-black text-slate-800">
                              Delivery Handover Photo Proof
                            </span>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              Required
                            </span>
                          </div>
                          {deliveryPhoto && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> Captured
                            </span>
                          )}
                        </div>

                        <input
                          ref={deliveryInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handleFileSelected(e, 'delivery')}
                        />

                        {deliveryPhoto ? (
                          <div className="relative rounded-xl overflow-hidden border border-emerald-300 aspect-video bg-black/5">
                            <Image
                              src={deliveryPhoto}
                              alt="Delivery Proof"
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[11px]">
                              <div className="flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Handover Proof Captured</span>
                              </div>
                              <button
                                onClick={() => deliveryInputRef.current?.click()}
                                className="bg-black/60 hover:bg-black/80 px-2.5 py-1 rounded-md text-[10px] font-bold text-white transition-colors cursor-pointer"
                              >
                                Retake
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => deliveryInputRef.current?.click()}
                              className="py-3 px-2 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-[0.98]"
                            >
                              <Camera className="w-5 h-5 text-emerald-600" />
                              <span>Snap Drop Photo</span>
                            </button>
                            <button
                              onClick={() => handleQuickSimulatePhoto('delivery')}
                              className="py-3 px-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-[0.98]"
                            >
                              <Sparkles className="w-5 h-5 text-amber-500" />
                              <span>Auto-Snap Proof</span>
                            </button>
                          </div>
                        )}

                        <p className="text-[10px] text-slate-500 italic">
                          Take a photo of customer receiving the package or placed safely at the doorstep.
                        </p>
                      </div>

                      {/* WhatsApp Delivered Proof Alert */}
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-emerald-950 flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Notify Customer on WhatsApp
                          </span>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Send delivery confirmation & receipt note
                          </p>
                        </div>
                        <a
                          href={createWhatsAppUrl(
                            currentActiveOrder.delivery_address.phone,
                            formatOrderDeliveredWhatsApp(currentActiveOrder)
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors shrink-0"
                        >
                          <span>Send</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Final Confirm Button */}
                      <button
                        onClick={() => handleConfirmDelivered(currentActiveOrder.id)}
                        className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.98]"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Confirm Handover & Deliver (Collect ₹55 Pay)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DAILY EARNINGS & WALLET */}
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            {/* Primary Earnings Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl p-5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

              <span className="text-xs uppercase tracking-wider text-emerald-200 font-bold block mb-1">
                Today&apos;s Shift Earnings
              </span>
              <div className="flex items-baseline justify-between mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-black">₹{earnings}</span>
                  <span className="text-xs text-emerald-200 font-semibold">Available</span>
                </div>
                <button
                  onClick={handleOpenWithdrawModal}
                  disabled={maxNetWithdrawable <= 0}
                  className={`px-4 py-2 rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-1.5 ${
                    maxNetWithdrawable > 0
                      ? 'bg-white text-emerald-800 hover:bg-emerald-50'
                      : 'bg-white/40 text-emerald-950 cursor-not-allowed'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Withdraw Money</span>
                </button>
              </div>

              {/* Earnings Breakdown */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-emerald-500/40 text-center">
                <div>
                  <span className="text-[10px] text-emerald-200 block">Deliveries</span>
                  <span className="font-bold text-sm">{todayDeliveriesCount} Drops</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-200 block">Base Pay</span>
                  <span className="font-bold text-sm">₹{todayDeliveriesCount * 35}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-200 block">Bonus & Tips</span>
                  <span className="font-bold text-sm">₹{earnings - todayDeliveriesCount * 35 > 0 ? earnings - todayDeliveriesCount * 35 : 160}</span>
                </div>
              </div>
            </div>

            {/* Floating Cash-in-Hand & Offset Card */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                    Floating Cash-in-Hand (COD Collected)
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black text-amber-950">₹{floatingCashInHand}</span>
                    <span className="text-[11px] text-amber-700">/ ₹1,500 Safe Limit</span>
                  </div>
                </div>

                {floatingCashInHand > 0 && (
                  <button
                    onClick={() => setShowRemitModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Remit to FoodLo
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl p-3 border border-amber-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Shift Delivery Earnings:</span>
                  <span className="font-bold text-slate-800">₹{earnings}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Less: Cash-in-Hand Pocketed:</span>
                  <span className="font-bold text-red-600">-₹{floatingCashInHand}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex justify-between font-black text-slate-900">
                  <span>Net Payout Due:</span>
                  <span className="text-emerald-700 text-sm">
                    ₹{Math.max(0, earnings - floatingCashInHand)}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-amber-800 italic">
                Cash collected from COD drops is automatically offset against your shift earnings. Remit excess cash anytime to Ajay Kalal ({SAGA_PAYMENT_CONFIG.upiId}).
              </p>
            </div>

            {/* Registered Bank Account & UPI Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                      Payout Bank &amp; UPI Account
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Direct IMPS and instant UPI transfers
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleOpenRiderBankModal}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Bank / UPI</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Account Holder</span>
                  <span className="font-extrabold text-slate-900 truncate block mt-0.5">{riderBank.riderName}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Bank Name</span>
                  <span className="font-extrabold text-slate-900 truncate block mt-0.5">{riderBank.bankName}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Account No.</span>
                  <span className="font-mono font-extrabold text-slate-900 block mt-0.5">
                    {riderBank.accountNumber.slice(-4).padStart(riderBank.accountNumber.length, '•')}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">UPI VPA ID</span>
                  <span className="font-mono font-extrabold text-emerald-700 truncate block mt-0.5">
                    {riderBank.upiId}
                  </span>
                </div>
              </div>
            </div>

            {/* Payout History Ledger */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Today&apos;s Completed Drops
                </h3>
                <span className="text-xs text-slate-400">
                  Total Withdrawn: ₹{withdrawnAmount}
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    id: 'drop-1',
                    time: '18:10',
                    cafe: 'Meesaavi Cafe and Restro',
                    area: 'Punarvas Colony',
                    payout: 55,
                  },
                  {
                    id: 'drop-2',
                    time: '17:35',
                    cafe: 'Mewar Restaurant',
                    area: 'Dungarpur Road',
                    payout: 60,
                  },
                  {
                    id: 'drop-3',
                    time: '16:50',
                    cafe: 'Bhawani Bhel Centre',
                    area: 'Gamleshwar Talab',
                    payout: 50,
                  },
                  {
                    id: 'drop-4',
                    time: '16:15',
                    cafe: 'Saga Cafe Indiranagar',
                    area: '100ft Road',
                    payout: 65,
                  },
                ].map((drop) => (
                  <div
                    key={drop.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block">{drop.cafe}</span>
                        <span className="text-[11px] text-slate-400">
                          {drop.area} • {drop.time}
                        </span>
                      </div>
                    </div>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      +₹{drop.payout}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Demo Role Switcher quick footer */}
        <div className="mt-8 p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between">
          <div className="text-slate-500">
            Testing role: <span className="font-bold text-slate-800">Student Rider</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-emerald-700 font-bold hover:underline"
            >
              Switch Role / Profile →
            </Link>
          </div>
        </div>
      </main>

      {/* ENHANCED WITHDRAW MONEY MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl animate-scaleIn my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Withdraw Courier Pay
                  </h3>
                  <p className="text-[11px] text-slate-400">Zero fee for student riders</p>
                </div>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Net Balance Breakdown Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Shift Earnings:</span>
                <span className="font-bold text-slate-900">₹{earnings}</span>
              </div>
              {floatingCashInHand > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Less: Floating Cash:</span>
                  <span className="font-bold">-₹{floatingCashInHand}</span>
                </div>
              )}
              <div className="pt-1 border-t border-emerald-200/60 flex justify-between font-black text-emerald-950 text-sm">
                <span>Net Withdrawable:</span>
                <span className="text-emerald-700">₹{maxNetWithdrawable}</span>
              </div>
            </div>

            {withdrawError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                ⚠️ {withdrawError}
              </div>
            )}

            {withdrawSuccess ? (
              <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-center space-y-1.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-black text-sm">Payout Transferred!</h4>
                <p className="text-xs">
                  ₹{withdrawAmountInput} sent to {withdrawPayoutMode === 'upi' ? riderBank.upiId : `${riderBank.bankName} (A/C ••••${riderBank.accountNumber.slice(-4)})`}.
                </p>
                {lastPayoutRef && (
                  <p className="text-[10px] font-mono text-emerald-800">
                    Ref: {lastPayoutRef}
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleExecuteWithdraw} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Amount to Withdraw (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                    <input
                      type="number"
                      step="1"
                      min="10"
                      max={maxNetWithdrawable}
                      value={withdrawAmountInput}
                      onChange={(e) => setWithdrawAmountInput(e.target.value)}
                      placeholder="e.g. 200"
                      className="w-full h-10 pl-7 pr-3 border border-slate-200 rounded-xl font-black text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>

                  {/* Quick selection chips */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[100, 200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        disabled={maxNetWithdrawable < amt}
                        onClick={() => setWithdrawAmountInput(amt.toString())}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-[11px] cursor-pointer"
                      >
                        +₹{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={maxNetWithdrawable <= 0}
                      onClick={() => setWithdrawAmountInput(maxNetWithdrawable.toString())}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] cursor-pointer"
                    >
                      Max All
                    </button>
                  </div>
                </div>

                {/* Payout Destination Choice */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Transfer Destination
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawPayoutMode('upi')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        withdrawPayoutMode === 'upi'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">Instant UPI VPA</span>
                      <span className="text-[10px] text-slate-500 block truncate">{riderBank.upiId}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWithdrawPayoutMode('bank_transfer')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        withdrawPayoutMode === 'bank_transfer'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">Bank NEFT/IMPS</span>
                      <span className="text-[10px] text-slate-500 block truncate">{riderBank.bankName}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingWithdraw || maxNetWithdrawable <= 0}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-md transition-colors cursor-pointer"
                  >
                    {isSubmittingWithdraw ? 'Transferring...' : 'Confirm Transfer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RIDER ADD / EDIT BANK ACCOUNT MODAL */}
      {isRiderBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl animate-scaleIn my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Rider Bank Account
                  </h3>
                  <p className="text-[11px] text-slate-400">Direct courier payouts &amp; tips</p>
                </div>
              </div>
              <button
                onClick={() => setIsRiderBankModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bankFormError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                ⚠️ {bankFormError}
              </div>
            )}

            <form onSubmit={handleSaveRiderBankForm} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  value={bankFormHolder}
                  onChange={(e) => setBankFormHolder(e.target.value)}
                  placeholder="e.g. Vikram Singh"
                  className="w-full h-9 px-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    value={bankFormBankName}
                    onChange={(e) => setBankFormBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank, SBI"
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Account Type
                  </label>
                  <select
                    value={bankFormType}
                    onChange={(e) => setBankFormType(e.target.value as 'Savings' | 'Current')}
                    className="w-full h-9 px-2.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="Savings">Savings Account</option>
                    <option value="Current">Current Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Bank Account Number *
                </label>
                <input
                  type="text"
                  value={bankFormAccNum}
                  onChange={(e) => setBankFormAccNum(e.target.value)}
                  placeholder="e.g. 50100234567890"
                  className="w-full h-9 px-3 border border-slate-200 rounded-xl font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Confirm Account Number *
                </label>
                <input
                  type="text"
                  value={bankFormConfirmAccNum}
                  onChange={(e) => setBankFormConfirmAccNum(e.target.value)}
                  placeholder="Re-enter bank account number"
                  className="w-full h-9 px-3 border border-slate-200 rounded-xl font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    value={bankFormIfsc}
                    onChange={(e) => setBankFormIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0000456"
                    maxLength={11}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl font-mono font-medium uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    UPI ID (VPA) *
                  </label>
                  <input
                    type="text"
                    value={bankFormUpi}
                    onChange={(e) => setBankFormUpi(e.target.value)}
                    placeholder="e.g. vikram@okaxis"
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRiderBankModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md cursor-pointer"
                >
                  Save &amp; Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMIT CASH TO SAGA UPI MODAL */}
      {showRemitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                Remit Floating Cash
              </h3>
              <button
                onClick={() => setShowRemitModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              You are remitting <strong>₹{floatingCashInHand}</strong> of collected COD physical cash directly to FoodLo central bank account.
            </p>

            <div className="relative w-44 h-56 mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-xs">
              <Image
                src={SAGA_PAYMENT_CONFIG.qrImageUrl}
                alt="Paytm Standee QR"
                fill
                className="object-contain"
              />
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl text-center text-xs">
              <span className="text-slate-500 block text-[11px]">Payee:</span>
              <span className="font-extrabold text-slate-900">{SAGA_PAYMENT_CONFIG.merchantName} ({SAGA_PAYMENT_CONFIG.upiId})</span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowRemitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const remitted = floatingCashInHand
                  setFloatingCashInHand(0)
                  setShowRemitModal(false)
                  setCelebrationMessage(`🎉 Remitted ₹${remitted} to FoodLo. Cash-in-Hand balance reset to ₹0.`)
                  sounds.playSuccessCelebration()
                  setTimeout(() => setCelebrationMessage(null), 5000)
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                Confirm Remitted
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
