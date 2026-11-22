'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  FileCheck,
  Percent,
  Clock,
  CheckCircle2,
  ShoppingBag,
  TrendingUp,
  Search,
  Edit2,
  Save,
  RotateCw,
  Zap,
  Download,
  Printer,
  Building2,
  FileText,
  X,
  Sliders,
  Bike,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Sparkles,
  DollarSign,
} from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'
import {
  SEED_CAFES,
  SEED_ORDERS,
  SEED_WALLETS,
  SEED_RIDERS,
  type StudentRiderInfo,
} from '@/lib/data/mockData'
import { getStoredOrders, getStoredWallets, SAGA_ORDERS_EVENT } from '@/lib/services/orderService'
import { sounds } from '@/lib/utils/soundEffects'
import {
  getDynamicConfig,
  saveDynamicConfig,
  resetDynamicConfig,
  SAGA_CONFIG_EVENT,
  type DynamicPlatformConfig,
} from '@/lib/services/configService'
import { createWhatsAppUrl } from '@/lib/utils/whatsapp'
import {
  execute3DaySettlementBatch,
  downloadSettlementCsv,
  getStoredSettlementHistory,
  getCafeBankDetails,
  type SettlementBatchResult,
} from '@/lib/services/settlementService'
import type { Cafe, Wallet, KycStatus, Order } from '@/lib/supabase/types'

export default function AdminPage() {
  const { user } = useAuth()

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'orders' | 'riders' | 'dynamic_settings' | 'escrow' | 'kyc' | 'commission'>('orders')

  // Cafes State (allows approval/rejection and commission rate updates)
  const [cafes, setCafes] = useState<Cafe[]>(SEED_CAFES)

  // Orders State (synced with platform orders service)
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') return getStoredOrders()
    return SEED_ORDERS
  })

  // Wallets State
  const [wallets, setWallets] = useState<Wallet[]>(SEED_WALLETS)

  // Riders State
  const [riders, setRiders] = useState<StudentRiderInfo[]>(SEED_RIDERS)
  const [riderSearchQuery, setRiderSearchQuery] = useState('')
  const [riderStatusFilter, setRiderStatusFilter] = useState<'all' | 'on_delivery' | 'on_duty' | 'offline'>('all')

  // Cafe Filter for Orders & Analytics (e.g. My Cafe: Rohan Mehta's Koramangala vs All)
  const [selectedCafeFilter, setSelectedCafeFilter] = useState<string>('all')

  // Order Details Modal & Prev/Next Navigation
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Dynamic Platform Config State
  const [dynamicConfig, setDynamicConfig] = useState<DynamicPlatformConfig>(() => getDynamicConfig())
  const [cfgMinOrder, setCfgMinOrder] = useState(dynamicConfig.minOrderAmountInr)
  const [cfgPlatformFee, setCfgPlatformFee] = useState(dynamicConfig.platformFeeInr)
  const [cfgBaseFee, setCfgBaseFee] = useState(dynamicConfig.baseDeliveryFeeInr)
  const [cfgBaseKm, setCfgBaseKm] = useState(dynamicConfig.baseDeliveryRadiusKm)
  const [cfgExtraRate, setCfgExtraRate] = useState(dynamicConfig.extraFeePerKmInr)
  const [cfgMaxRadius, setCfgMaxRadius] = useState(dynamicConfig.maxDeliveryRadiusKm)
  const [cfgRiderFee, setCfgRiderFee] = useState(dynamicConfig.riderPayoutPerOrderInr)
  const [cfgCashLimit, setCfgCashLimit] = useState(dynamicConfig.riderCashLimitInr)
  const [cfgCommission, setCfgCommission] = useState(dynamicConfig.defaultCommissionRate)
  const [cfgBannerEnabled, setCfgBannerEnabled] = useState(dynamicConfig.announcementBanner.enabled)
  const [cfgBannerMsg, setCfgBannerMsg] = useState(dynamicConfig.announcementBanner.message)
  const [cfgBannerType, setCfgBannerType] = useState(dynamicConfig.announcementBanner.type)
  const [isSavingConfig, setIsSavingConfig] = useState(false)

  // Settlement Automation State
  const [latestBatchResult, setLatestBatchResult] = useState<SettlementBatchResult | null>(null)
  const [settlementHistory, setSettlementHistory] = useState<SettlementBatchResult[]>([])
  const [showAdviceModal, setShowAdviceModal] = useState<boolean>(false)
  const [selectedAdviceBatch, setSelectedAdviceBatch] = useState<SettlementBatchResult | null>(null)
  const [forceOverride, setForceOverride] = useState<boolean>(false)

  useEffect(() => {
    const syncData = () => {
      setOrders(getStoredOrders())
      const storedWallets = getStoredWallets()
      setWallets(storedWallets)
      setSettlementHistory(getStoredSettlementHistory())
      const conf = getDynamicConfig()
      setDynamicConfig(conf)
      // Sync primary student rider Vikram Singh wallet balance
      const rw = storedWallets.find((w) => w.role === 'rider')
      if (rw) {
        setRiders((prev) =>
          prev.map((r) =>
            r.id === '66666666-6666-4666-a666-666666666666'
              ? { ...r, walletBalanceInr: rw.balance_inr }
              : r
          )
        )
      }
    }
    syncData()
    window.addEventListener(SAGA_ORDERS_EVENT, syncData)
    window.addEventListener('storage', syncData)
    window.addEventListener(SAGA_CONFIG_EVENT, syncData)
    return () => {
      window.removeEventListener(SAGA_ORDERS_EVENT, syncData)
      window.removeEventListener('storage', syncData)
      window.removeEventListener(SAGA_CONFIG_EVENT, syncData)
    }
  }, [])

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // --- KYC QUEUE MANAGEMENT ---
  const [kycFilter, setKycFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [rejectingCafeId, setRejectingCafeId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string>('')

  const handleApproveCafe = (cafeId: string) => {
    setCafes((prev) =>
      prev.map((c) =>
        c.id === cafeId
          ? {
              ...c,
              kyc_status: 'approved' as KycStatus,
              is_open: true,
              rejection_reason: null,
              updated_at: new Date().toISOString(),
            }
          : c
      )
    )
    const approvedCafe = cafes.find((c) => c.id === cafeId)
    showToast(`✅ "${approvedCafe?.name}" KYC Approved and store activated!`)
  }

  const handleRejectCafe = () => {
    if (!rejectingCafeId) return
    const reason = rejectionReason.trim() || 'Missing or invalid FSSAI/GST compliance documents.'
    setCafes((prev) =>
      prev.map((c) =>
        c.id === rejectingCafeId
          ? {
              ...c,
              kyc_status: 'rejected' as KycStatus,
              rejection_reason: reason,
              is_open: false,
              updated_at: new Date().toISOString(),
            }
          : c
      )
    )
    const rejectedCafe = cafes.find((c) => c.id === rejectingCafeId)
    showToast(`⚠️ "${rejectedCafe?.name}" KYC marked as Rejected.`)
    setRejectingCafeId(null)
    setRejectionReason('')
  }

  const filteredCafes = cafes.filter((c) => {
    if (kycFilter === 'all') return true
    return c.kyc_status === kycFilter
  })

  // --- COMMISSION RATE EDITOR ---
  const [editingCafeId, setEditingCafeId] = useState<string | null>(null)
  const [newCommissionRate, setNewCommissionRate] = useState<number>(15)

  const handleStartEditCommission = (cafe: Cafe) => {
    setEditingCafeId(cafe.id)
    setNewCommissionRate(cafe.commission_rate)
  }

  const handleSaveCommission = (cafeId: string) => {
    setCafes((prev) =>
      prev.map((c) =>
        c.id === cafeId
          ? {
              ...c,
              commission_rate: Number(newCommissionRate),
              updated_at: new Date().toISOString(),
            }
          : c
      )
    )
    setEditingCafeId(null)
    showToast(`Updated commission rate to ${newCommissionRate}%`)
  }

  // --- ORDERS OVERVIEW ---
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all')
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('')

  const filteredOrders = orders.filter((order) => {
    const matchesCafe = selectedCafeFilter === 'all' || order.cafe_id === selectedCafeFilter
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter
    const matchesSearch =
      order.order_number.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      order.delivery_address.recipient_name.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      order.items.some((i) => i.name.toLowerCase().includes(orderSearchQuery.toLowerCase()))
    return matchesCafe && matchesStatus && matchesSearch
  })

  // Selected Order index and Prev / Next navigation for Order Detail Modal
  const selectedOrderIndex = selectedOrder
    ? filteredOrders.findIndex((o) => o.id === selectedOrder.id)
    : -1
  const hasPrevOrder = selectedOrderIndex > 0
  const hasNextOrder = selectedOrderIndex >= 0 && selectedOrderIndex < filteredOrders.length - 1

  const handlePrevOrder = () => {
    if (hasPrevOrder) setSelectedOrder(filteredOrders[selectedOrderIndex - 1])
  }

  const handleNextOrder = () => {
    if (hasNextOrder) setSelectedOrder(filteredOrders[selectedOrderIndex + 1])
  }

  // Keyboard navigation for Order Detail Modal (Left/Right arrow, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedOrder) return
      if (e.key === 'ArrowLeft' && selectedOrderIndex > 0) {
        setSelectedOrder(filteredOrders[selectedOrderIndex - 1])
      }
      if (e.key === 'ArrowRight' && selectedOrderIndex >= 0 && selectedOrderIndex < filteredOrders.length - 1) {
        setSelectedOrder(filteredOrders[selectedOrderIndex + 1])
      }
      if (e.key === 'Escape') setSelectedOrder(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedOrder, selectedOrderIndex, filteredOrders])

  // --- RIDERS DIRECTORY ---
  const filteredRiders = riders.filter((r) => {
    const matchesStatus = riderStatusFilter === 'all' || r.status === riderStatusFilter
    const matchesSearch =
      r.name.toLowerCase().includes(riderSearchQuery.toLowerCase()) ||
      r.college.toLowerCase().includes(riderSearchQuery.toLowerCase()) ||
      r.phone.includes(riderSearchQuery)
    return matchesStatus && matchesSearch
  })

  // --- DYNAMIC SETTINGS HANDLERS ---
  const handleSaveDynamicConfig = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingConfig(true)

    const updatedConfig: DynamicPlatformConfig = {
      minOrderAmountInr: Number(cfgMinOrder) || 200,
      platformFeeInr: Number(cfgPlatformFee) || 5,
      baseDeliveryFeeInr: Number(cfgBaseFee) || 25,
      baseDeliveryRadiusKm: Number(cfgBaseKm) || 5,
      extraFeePerKmInr: Number(cfgExtraRate) || 6,
      maxDeliveryRadiusKm: Number(cfgMaxRadius) || 10,
      riderPayoutPerOrderInr: Number(cfgRiderFee) || 55,
      riderCashLimitInr: Number(cfgCashLimit) || 1500,
      defaultCommissionRate: Number(cfgCommission) || 15,
      announcementBanner: {
        enabled: cfgBannerEnabled,
        message: cfgBannerMsg.trim() || 'Storefront dynamic notice.',
        type: cfgBannerType,
      },
    }

    saveDynamicConfig(updatedConfig)
    setDynamicConfig(updatedConfig)
    setTimeout(() => {
      setIsSavingConfig(false)
      sounds.playSuccessCelebration()
      showToast('⚡ Dynamic Platform Configuration saved & synced to live production app!')
    }, 400)
  }

  const handleResetDynamicConfig = () => {
    const def = resetDynamicConfig()
    setDynamicConfig(def)
    setCfgMinOrder(def.minOrderAmountInr)
    setCfgPlatformFee(def.platformFeeInr)
    setCfgBaseFee(def.baseDeliveryFeeInr)
    setCfgBaseKm(def.baseDeliveryRadiusKm)
    setCfgExtraRate(def.extraFeePerKmInr)
    setCfgMaxRadius(def.maxDeliveryRadiusKm)
    setCfgRiderFee(def.riderPayoutPerOrderInr)
    setCfgCashLimit(def.riderCashLimitInr)
    setCfgCommission(def.defaultCommissionRate)
    setCfgBannerEnabled(def.announcementBanner.enabled)
    setCfgBannerMsg(def.announcementBanner.message)
    setCfgBannerType(def.announcementBanner.type)
    sounds.playNotificationChime()
    showToast('Reset configuration to default platform values.')
  }

  // --- 3-DAY SETTLEMENT ESCROW RELEASE ---
  const [isSettling, setIsSettling] = useState<boolean>(false)
  const [settlementSuccessNotice, setSettlementSuccessNotice] = useState<string | null>(null)

  const handleRunBatchSettlement = () => {
    setIsSettling(true)
    setTimeout(() => {
      try {
        const result = execute3DaySettlementBatch(forceOverride)
        setLatestBatchResult(result)
        setSettlementHistory(getStoredSettlementHistory())
        setWallets(getStoredWallets())
        setIsSettling(false)
        sounds.playSuccessCelebration()
        const notice = `⚡ Batch ${result.batchId} Executed: Auto-released ₹${result.totalAmountReleasedInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })} across ${result.cafesSettledCount} cafe partners directly into available balances.`
        setSettlementSuccessNotice(notice)
        showToast(notice)
      } catch (err) {
        setIsSettling(false)
        console.error('Settlement batch error:', err)
        showToast('Error executing settlement batch.')
      }
    }, 1000)
  }

  // Aggregate Metrics
  const totalGMV = orders.reduce((sum, o) => sum + o.total_amount_inr, 0) + 147000
  const totalPlatformCut = Math.round(totalGMV * 0.15)
  const pendingKycCount = cafes.filter((c) => c.kyc_status === 'pending').length
  const totalMerchantAvailable = wallets
    .filter((w) => w.role === 'cafe_owner')
    .reduce((sum, w) => sum + w.balance_inr, 0)
  const totalMerchantOnHold = wallets
    .filter((w) => w.role === 'cafe_owner')
    .reduce((sum, w) => sum + w.on_hold_balance_inr, 0)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Top Admin Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center font-black shadow-sm">
              <ShieldCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  SAGA Super Admin
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Platform Control
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logged in as Chief Operator ({user?.email || 'admin@sagacafe.in'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Customer Storefront →
            </Link>
            <Link
              href="/login"
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Switch Role
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950/80 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex space-x-1 sm:space-x-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Live Platform Orders</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full font-bold">
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('riders')}
              className={`py-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'riders'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>Campus Couriers &amp; Fleet</span>
              <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                {riders.filter((r) => r.status !== 'offline').length} active
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dynamic_settings')}
              className={`py-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'dynamic_settings'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Dynamic App Controls</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full font-black">
                PROD
              </span>
            </button>

            <button
              onClick={() => setActiveTab('escrow')}
              className={`py-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'escrow'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>3-Day Settlement Escrow</span>
            </button>

            <button
              onClick={() => setActiveTab('kyc')}
              className={`py-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'kyc'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Cafe KYC Queue</span>
              {pendingKycCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {pendingKycCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('commission')}
              className={`py-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'commission'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Percent className="w-4 h-4" />
              <span>Commission Rates</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xl border border-emerald-500/40 flex items-center gap-3 animate-slideIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm font-bold text-slate-100">{toastMessage}</p>
          </div>
        )}

        {/* Global KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Platform GMV
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              ₹{totalGMV.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" /> +18.4% this week
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Platform Take (15%)
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              ₹{totalPlatformCut.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Net commission revenue
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Partner Cafes
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {cafes.length} Stores
            </div>
            <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
              {pendingKycCount} pending KYC approval
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Active Riders
            </span>
            <div className="text-2xl font-black text-blue-600 mt-1">
              12 Online
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Campus student courier pool
            </span>
          </div>
        </div>

        {/* TAB 1: CAFE KYC VERIFICATION QUEUE */}
        {activeTab === 'kyc' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Cafe KYC Compliance Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Review FSSAI food safety licenses and GSTIN tax credentials before onboarding partner cafes to the SAGA delivery network.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setKycFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    kycFilter === 'pending'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({cafes.filter((c) => c.kyc_status === 'pending').length})
                </button>
                <button
                  onClick={() => setKycFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    kycFilter === 'approved'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Approved ({cafes.filter((c) => c.kyc_status === 'approved').length})
                </button>
                <button
                  onClick={() => setKycFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    kycFilter === 'rejected'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rejected ({cafes.filter((c) => c.kyc_status === 'rejected').length})
                </button>
                <button
                  onClick={() => setKycFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    kycFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({cafes.length})
                </button>
              </div>
            </div>

            {filteredCafes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-sm text-slate-800">
                  No cafes matching &quot;{kycFilter}&quot; status.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  All submissions are currently processed and up to date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCafes.map((cafe) => (
                  <div
                    key={cafe.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-base">
                              {cafe.name}
                            </h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                cafe.kyc_status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : cafe.kyc_status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {cafe.kyc_status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{cafe.address}</p>
                        </div>

                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                          {cafe.commission_rate}% fee
                        </span>
                      </div>

                      {/* Compliance Credentials */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 mb-4 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">FSSAI License:</span>
                          <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {cafe.fssai_number || '22334455667788'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">GSTIN Tax ID:</span>
                          <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {cafe.gstin_number || '29ABCDE1234F1Z5'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500">Document Files:</span>
                          <span className="text-emerald-700 font-bold flex items-center gap-1 cursor-pointer hover:underline">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified PDF (2.4 MB)
                          </span>
                        </div>

                        {cafe.rejection_reason && (
                          <div className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-md font-medium mt-1">
                            Rejection Note: {cafe.rejection_reason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      {cafe.kyc_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveCafe(cafe.id)}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve & Activate</span>
                          </button>
                          <button
                            onClick={() => setRejectingCafeId(cafe.id)}
                            className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {cafe.kyc_status === 'approved' && (
                        <div className="w-full flex items-center justify-between text-xs">
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Active on SAGA Customer App
                          </span>
                          <button
                            onClick={() => setRejectingCafeId(cafe.id)}
                            className="text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                          >
                            Revoke Approval
                          </button>
                        </div>
                      )}

                      {cafe.kyc_status === 'rejected' && (
                        <button
                          onClick={() => handleApproveCafe(cafe.id)}
                          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
                        >
                          Re-evaluate & Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PER-CAFE COMMISSION % EDITOR */}
        {activeTab === 'commission' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Per-Cafe Platform Commission Take-Rate
              </h2>
              <p className="text-xs text-slate-500">
                Set individual commission fee percentages per merchant partner based on order volume, exclusivity agreements, or seasonal promotional discounts.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Cafe Partner</th>
                      <th className="px-5 py-3.5">Address / Region</th>
                      <th className="px-5 py-3.5">KYC Status</th>
                      <th className="px-5 py-3.5">Commission Rate</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cafes.map((cafe) => (
                      <tr key={cafe.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-black text-slate-900">
                          {cafe.name}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {cafe.address}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              cafe.kyc_status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : cafe.kyc_status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {cafe.kyc_status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {editingCafeId === cafe.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max="50"
                                step="0.5"
                                value={newCommissionRate}
                                onChange={(e) => setNewCommissionRate(Number(e.target.value))}
                                className="w-16 px-2 py-1 border border-emerald-500 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                              />
                              <span className="font-bold text-slate-600">%</span>
                            </div>
                          ) : (
                            <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs">
                              {cafe.commission_rate}%
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {editingCafeId === cafe.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveCommission(cafe.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" /> Save
                              </button>
                              <button
                                onClick={() => setEditingCafeId(null)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-medium text-xs hover:bg-slate-100 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEditCommission(cafe)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Edit Rate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: LIVE PLATFORM ORDERS OVERVIEW & LOGISTICS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Live Platform Orders &amp; Dispatch Monitor</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {filteredOrders.length} orders
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Track customer orders, real-time kitchen status, cafe net payouts, and student courier dispatches.
                </p>
              </div>

              {/* Filters Bar: Cafe Selector, Search, Status */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Cafe Scope Filter */}
                <select
                  value={selectedCafeFilter}
                  onChange={(e) => setSelectedCafeFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                >
                  <option value="all">🏢 All Network Cafes ({orders.length})</option>
                  {cafes.map((c) => (
                    <option key={c.id} value={c.id}>
                      ☕ {c.name} ({orders.filter((o) => o.cafe_id === c.id).length})
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search order #, customer, item..."
                    className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="placed">Placed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready_for_pickup">Ready for Pickup</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>

            {/* Quick Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Orders in View</span>
                <span className="text-base font-black text-slate-900 mt-0.5 block">{filteredOrders.length}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide block">In Kitchen Prep</span>
                <span className="text-base font-black text-amber-700 mt-0.5 block">
                  {filteredOrders.filter((o) => ['placed', 'preparing'].includes(o.status)).length}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide block">Rider In-Transit</span>
                <span className="text-base font-black text-blue-700 mt-0.5 block">
                  {filteredOrders.filter((o) => ['ready_for_pickup', 'out_for_delivery'].includes(o.status)).length}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide block">Completed Today</span>
                <span className="text-base font-black text-emerald-700 mt-0.5 block">
                  {filteredOrders.filter((o) => o.status === 'delivered').length}
                </span>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3.5">Order ID &amp; Time</th>
                      <th className="px-4 py-3.5">Cafe Partner</th>
                      <th className="px-4 py-3.5">Customer &amp; Items</th>
                      <th className="px-4 py-3.5">Order Total / Cafe Share</th>
                      <th className="px-4 py-3.5">Assigned Rider</th>
                      <th className="px-4 py-3.5">Payment</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => {
                      const cafe = SEED_CAFES.find((c) => c.id === order.cafe_id)
                      const commRate = cafe?.commission_rate || 15
                      const cafeShare = Math.round(order.subtotal_inr * (1 - commRate / 100))
                      const rider = SEED_RIDERS.find((r) => r.id === order.rider_id) || (order.rider_id ? SEED_RIDERS[0] : null)

                      return (
                        <tr
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-4">
                            <span className="font-mono font-black text-slate-900 group-hover:text-emerald-700 transition-colors block">
                              #{order.order_number}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(order.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-bold text-slate-800 block">
                              {cafe?.name || 'Saga Cafe'}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate block max-w-[130px]">
                              {cafe?.address || 'Bengaluru'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-semibold text-slate-900 block">
                              {order.delivery_address.recipient_name}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-[160px]">
                              {order.items.reduce((s, i) => s + i.quantity, 0)} items ({order.items.map((i) => i.name).join(', ')})
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-extrabold text-slate-900 block">
                              ₹{order.total_amount_inr}
                            </span>
                            <span className="text-[11px] text-emerald-700 font-bold block">
                              Net Cafe: ₹{cafeShare}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {rider ? (
                              <div>
                                <span className="font-bold text-slate-800 flex items-center gap-1">
                                  <Bike className="w-3.5 h-3.5 text-emerald-600" />
                                  {rider.name}
                                </span>
                                <span className="text-[11px] text-blue-600 font-semibold block">
                                  Fee: ₹{dynamicConfig.riderPayoutPerOrderInr || 55}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                                In Courier Pool
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              order.payment_method === 'cod' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {order.payment_method === 'cod' ? 'COD (Cash)' : 'UPI Direct'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                order.status === 'delivered'
                                  ? 'bg-slate-100 text-slate-700'
                                  : order.status === 'out_for_delivery'
                                  ? 'bg-blue-100 text-blue-800'
                                  : order.status === 'ready_for_pickup'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.status === 'preparing'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedOrder(order)
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Inspect</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CAMPUS COURIERS & FLEET DIRECTORY */}
        {activeTab === 'riders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Student Campus Couriers &amp; Fleet Monitor</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {riders.length} student couriers
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time rider fleet tracker, wallet delivery credits, floating cash-in-hand accounting, and live delivery status.
                </p>
              </div>

              {/* Rider Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={riderSearchQuery}
                    onChange={(e) => setRiderSearchQuery(e.target.value)}
                    placeholder="Search rider, college, phone..."
                    className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={riderStatusFilter}
                  onChange={(e) => setRiderStatusFilter(e.target.value as 'all' | 'on_delivery' | 'on_duty' | 'offline')}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Couriers ({riders.length})</option>
                  <option value="on_delivery">🚴 On Delivery</option>
                  <option value="on_duty">🟢 On Duty (Ready)</option>
                  <option value="offline">⚪ Offline</option>
                </select>
              </div>
            </div>

            {/* Rider Fleet KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Active Couriers on Duty</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {riders.filter((r) => r.status !== 'offline').length} Riders
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {riders.filter((r) => r.status === 'on_delivery').length} on active trips
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Completed Today</span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {riders.reduce((s, r) => s + r.deliveriesToday, 0)} Drops
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                  100% on-time student fulfillment
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rider Fees Credited</span>
                <div className="text-2xl font-black text-blue-700 mt-1">
                  ₹{riders.reduce((s, r) => s + r.deliveriesToday * (dynamicConfig.riderPayoutPerOrderInr || 55), 0)}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  ₹{dynamicConfig.riderPayoutPerOrderInr || 55} per drop rate
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Floating COD Cash in Hand</span>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  ₹{riders.reduce((s, r) => s + r.cashInHandInr, 0)}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Limit: ₹{dynamicConfig.riderCashLimitInr || 1500}/courier
                </span>
              </div>
            </div>

            {/* Riders Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Courier Details</th>
                      <th className="px-5 py-3.5">Campus / College</th>
                      <th className="px-5 py-3.5">Vehicle</th>
                      <th className="px-5 py-3.5">Duty Status</th>
                      <th className="px-5 py-3.5">Deliveries (Today / Total)</th>
                      <th className="px-5 py-3.5">Wallet Balance</th>
                      <th className="px-5 py-3.5">Cash in Hand</th>
                      <th className="px-5 py-3.5 text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRiders.map((rider) => {
                      const isOverLimit = rider.cashInHandInr > (dynamicConfig.riderCashLimitInr * 0.8)

                      return (
                        <tr key={rider.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-4">
                            <span className="font-extrabold text-slate-900 block">{rider.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-400 font-mono">{rider.phone}</span>
                              <a
                                href={createWhatsAppUrl(rider.phone, `Hi ${rider.name}, message from SAGA Dispatch Operations.`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-medium text-slate-800 block">{rider.college}</span>
                            <span className="text-[11px] text-slate-400">Joined {rider.joinedDate}</span>
                          </td>
                          <td className="px-5 py-4 text-slate-700 font-medium">{rider.vehicleType}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1 w-fit ${
                                rider.status === 'on_delivery'
                                  ? 'bg-blue-100 text-blue-800'
                                  : rider.status === 'on_duty'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                rider.status === 'on_delivery' ? 'bg-blue-500 animate-ping' : rider.status === 'on_duty' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`} />
                              <span>{rider.status.replace(/_/g, ' ')}</span>
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-bold text-slate-900">{rider.deliveriesToday} today</span>
                            <span className="text-[11px] text-slate-400 block">{rider.lifetimeDeliveries} all-time</span>
                          </td>
                          <td className="px-5 py-4 font-mono font-extrabold text-emerald-700">
                            ₹{rider.walletBalanceInr.toFixed(2)}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`font-mono font-bold block ${isOverLimit ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                              ₹{rider.cashInHandInr.toFixed(2)}
                            </span>
                            {isOverLimit && (
                              <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded block w-fit mt-0.5">
                                Remit Cash Alert
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-lg text-xs">
                              ★ {rider.rating.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DYNAMIC APP CONTROL CENTER */}
        {activeTab === 'dynamic_settings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-600" />
                  <span>Dynamic Platform Control Center</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Live Production Sync
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Update minimum order value, distance fees, student rider payouts, and storefront emergency announcements in real-time without redeploying code.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetDynamicConfig}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer w-fit"
              >
                <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset to Platform Defaults</span>
              </button>
            </div>

            <form onSubmit={handleSaveDynamicConfig} className="space-y-6">
              {/* Settings Card 1: Order Value & Delivery Engine */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Storefront Order &amp; Delivery Engine Pricing</h3>
                    <p className="text-[11px] text-slate-400">Controls minimum order threshold, distance tiers, and platform tech fee.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Minimum Order Value (₹ MOV)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="50"
                        max="1000"
                        step="10"
                        value={cfgMinOrder}
                        onChange={(e) => setCfgMinOrder(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Default: ₹200 across all partner cafes</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Base Delivery Fee (≤ 5 km)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="5"
                        value={cfgBaseFee}
                        onChange={(e) => setCfgBaseFee(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Fixed fee for drops within 5 km (Default: ₹25)</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Extra Fee Per KM (&gt; 5 km)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="1"
                        value={cfgExtraRate}
                        onChange={(e) => setCfgExtraRate(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Rate per additional km up to limit (Default: ₹6/km)</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Max Delivery Radius (KM)
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="25"
                      step="1"
                      value={cfgMaxRadius}
                      onChange={(e) => setCfgMaxRadius(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Drops beyond this are blocked (Default: 10 km)</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Platform Tech Fee (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="1"
                        value={cfgPlatformFee}
                        onChange={(e) => setCfgPlatformFee(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Fixed technology fee per order (Default: ₹5)</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Default Commission Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="35"
                        step="0.5"
                        value={cfgCommission}
                        onChange={(e) => setCfgCommission(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Standard cafe partner take-rate (Default: 15%)</span>
                  </div>
                </div>
              </div>

              {/* Settings Card 2: Student Courier Logistics & Cash Limits */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Bike className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Student Courier Payout &amp; COD Cash Safety</h3>
                    <p className="text-[11px] text-slate-400">Controls student earnings per drop and doorstep cash remittance limits.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Rider Delivery Fee Payout (₹ per completed drop)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="20"
                        max="200"
                        step="5"
                        value={cfgRiderFee}
                        onChange={(e) => setCfgRiderFee(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Credited to student courier wallet on OTP verification (Default: ₹55)</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Max Floating Cash-in-Hand Limit (₹ COD Ceiling)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="500"
                        max="5000"
                        step="250"
                        value={cfgCashLimit}
                        onChange={(e) => setCfgCashLimit(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Triggers cash remittance alert to prevent courier holding excess physical cash (Default: ₹1,500)</span>
                  </div>
                </div>
              </div>

              {/* Settings Card 3: Dynamic Storefront Announcement Banner */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Dynamic Storefront Announcement Banner</h3>
                      <p className="text-[11px] text-slate-400">Broadcast weather alerts, festival discounts, or operational delays to customers.</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfgBannerEnabled}
                      onChange={(e) => setCfgBannerEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Announcement Banner Message
                    </label>
                    <input
                      type="text"
                      value={cfgBannerMsg}
                      onChange={(e) => setCfgBannerMsg(e.target.value)}
                      placeholder="e.g. 🌧️ Heavy Rain in Koramangala: Delivery may take 10–15 mins extra for rider safety."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Banner Color Theme
                    </label>
                    <select
                      value={cfgBannerType}
                      onChange={(e) => setCfgBannerType(e.target.value as 'info' | 'warning' | 'alert' | 'celebration')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="warning">Amber (Operational Delay)</option>
                      <option value="alert">Rose / Red (Urgent Notice)</option>
                      <option value="celebration">Emerald (Festival Promo)</option>
                      <option value="info">Blue (General Notice)</option>
                    </select>
                  </div>
                </div>

                {/* Live Preview */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Live Storefront Preview
                  </span>
                  <div
                    className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs border ${
                      cfgBannerType === 'alert'
                        ? 'bg-rose-50 text-rose-900 border-rose-200'
                        : cfgBannerType === 'warning'
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : cfgBannerType === 'celebration'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-blue-50 text-blue-900 border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold truncate">
                        {cfgBannerMsg || 'Storefront dynamic notice preview.'}
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 shrink-0">
                      {cfgBannerEnabled ? 'Banner ON' : 'Banner OFF'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingConfig ? 'Saving to Production...' : 'Save & Sync to Live App'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: 3-DAY SETTLEMENT ESCROW ENGINE */}
        {activeTab === 'escrow' && (
          <div className="space-y-6">
            {/* Escrow KPI Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Withdrawable Balances
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    ₹
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-700">
                  ₹{totalMerchantAvailable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ready for instant cafe withdrawal
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    72h Escrow On-Hold
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-amber-700">
                  ₹{totalMerchantOnHold.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Maturing in customer safety escrow
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Platform Merchant Account
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <Building2 className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-sm font-extrabold text-slate-900 truncate">
                  Ajay Kalal
                </div>
                <p className="text-[11px] font-mono text-emerald-700 mt-1">
                  paytm.s2hlgrh@pty
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Settlement Batches Run
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {settlementHistory.length} Batches
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Archived with bank export CSVs
                </p>
              </div>
            </div>

            {/* Escrow Trigger Console Card */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 border border-slate-700 shadow-md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Zap className="w-5 h-5" />
                    </span>
                    <h3 className="font-black text-lg">
                      SAGA 3-Day Settlement Automation & Bank Batch Engine
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Customer payments enter a mandatory 72-hour escrow hold period to safeguard order quality and dispute resolution. Once 72 hours have elapsed, on-hold balances automatically mature into merchant withdrawable funds. Trigger a batch release below to clear matured funds, update cafe wallets, and export official Indian corporate bank transfer files (HDFC/ICICI/RazorpayX format).
                  </p>
                  
                  {/* Force Override Toggle */}
                  <div className="pt-2 flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={forceOverride}
                        onChange={(e) => setForceOverride(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                      />
                      <span>Force-Release All Holds (Instant Payout Override for same-day clearance / testing)</span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <button
                    onClick={handleRunBatchSettlement}
                    disabled={isSettling}
                    className={`px-5 py-3.5 rounded-xl font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer ${
                      isSettling
                        ? 'bg-emerald-700 text-emerald-200 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    <RotateCw className={`w-4 h-4 ${isSettling ? 'animate-spin' : ''}`} />
                    <span>
                      {isSettling
                        ? 'Scanning Wallets & Clearing Escrow...'
                        : '⚡ Run 3-Day Escrow Settlement Batch'}
                    </span>
                  </button>
                </div>
              </div>

              {settlementSuccessNotice && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                    <span>{settlementSuccessNotice}</span>
                  </div>
                  {latestBatchResult && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadSettlementCsv(latestBatchResult)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Bank CSV</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAdviceBatch(latestBatchResult)
                          setShowAdviceModal(true)
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-[11px] flex items-center gap-1.5 border border-slate-600 shadow-sm transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Bank Advice</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Merchant Wallets Escrow Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Merchant Partners Escrow & Bank Disbursement Ledger
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time status of Withdrawable balances, 72-hour On-Hold Escrow reserves, and verified Indian corporate bank accounts across all cafe partners.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Merchant Partner</th>
                      <th className="px-4 py-3">Registered Bank Account</th>
                      <th className="px-4 py-3">Available Balance</th>
                      <th className="px-4 py-3">72h Escrow Reserve</th>
                      <th className="px-4 py-3">Lifetime Earned</th>
                      <th className="px-4 py-3">Escrow Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wallets.map((wallet) => {
                      const cafe = SEED_CAFES.find((c) => c.id === wallet.cafe_id)
                      const bank = wallet.cafe_id ? getCafeBankDetails(wallet.cafe_id) : null

                      return (
                        <tr key={wallet.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-900 block">
                              {cafe ? cafe.name : wallet.role === 'admin' ? 'SAGA Platform Treasury' : 'Student Courier Pool'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {bank ? bank.ownerName : wallet.role}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {bank ? (
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {bank.bankName} · {bank.accountNumber.slice(-4).padStart(bank.accountNumber.length, '•')}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  IFSC: {bank.ifscCode} | UPI: {bank.upiId}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Internal Treasury Account</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-extrabold text-emerald-700">
                            ₹{wallet.balance_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 font-extrabold text-amber-700">
                            ₹{wallet.on_hold_balance_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 font-semibold">
                            ₹{wallet.total_earned_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5">
                            {wallet.on_hold_balance_inr > 0 ? (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3" /> In 3-Day Escrow
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> Settled / Available
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Historical Settlement Batches Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Historical 3-Day Settlement Batches & Bank Exports
                  </h3>
                  <p className="text-xs text-slate-500">
                    Audit log of executed batch disbursements. Download CSVs formatted for corporate bank batch uploads or review signed Bank Payout Advices.
                  </p>
                </div>
              </div>

              {settlementHistory.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No settlement batches run yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click &ldquo;Run 3-Day Escrow Settlement Batch&rdquo; above to generate your first corporate disbursement file.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="px-4 py-3">Batch ID</th>
                        <th className="px-4 py-3">Settlement Date</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">Beneficiaries</th>
                        <th className="px-4 py-3">Total Released</th>
                        <th className="px-4 py-3 text-right">Corporate Bank Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {settlementHistory.map((batch) => (
                        <tr key={batch.batchId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                            {batch.batchId}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 font-medium">
                            {new Date(batch.settledAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                batch.mode === 'admin_override'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {batch.mode === 'admin_override' ? 'Admin Override' : '72h Matured Auto'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-800">
                            {batch.cafesSettledCount} Cafe Partners
                          </td>
                          <td className="px-4 py-3.5 font-black text-emerald-700 text-sm">
                            ₹{batch.totalAmountReleasedInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-2">
                            <button
                              onClick={() => downloadSettlementCsv(batch)}
                              className="px-2.5 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title="Download HDFC/ICICI Corporate CSV"
                            >
                              <Download className="w-3 h-3" />
                              <span>CSV</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAdviceBatch(batch)
                                setShowAdviceModal(true)
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title="View and print official Bank Disbursement Advice"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Advice</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* PRINTABLE OFFICIAL BANK PAYOUT ADVICE MODAL */}
      {showAdviceModal && selectedAdviceBatch && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl animate-scaleIn my-8 relative print:m-0 print:p-0 print:shadow-none print:max-w-none">
            {/* Top Close Button (hidden during printing) */}
            <button
              onClick={() => setShowAdviceModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors print:hidden cursor-pointer"
              title="Close Advice Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable Document Container */}
            <div id="printable-payout-advice" className="space-y-6">
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                        S
                      </div>
                      <span className="text-xl font-black tracking-tight text-slate-900 uppercase">
                        SAGA Platform Treasury
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Campus Food Network & Merchant Escrow Settlement Operations
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Chief Operator: Ajay Kalal · paytm.s2hlgrh@pty
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Disbursement Advice
                    </span>
                    <p className="text-xs font-mono font-bold text-slate-900 mt-1">
                      {selectedAdviceBatch.batchId}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Date: {new Date(selectedAdviceBatch.settledAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Title & Statutory Declaration */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                  Bank Payout Advice & NEFT/IMPS Transfer Schedule
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  This advice authorizes batch release of funds following mandatory 72-hour customer delivery escrow hold. The balances below have been debited from SAGA Platform Escrow Reserves and credited to partner cafe bank accounts.
                </p>
              </div>

              {/* Beneficiary Breakdown Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Beneficiary / Cafe</th>
                      <th className="px-3 py-2.5">Bank & Branch</th>
                      <th className="px-3 py-2.5">Account & IFSC</th>
                      <th className="px-3 py-2.5">UPI ID</th>
                      <th className="px-3 py-2.5 text-right">Disbursement (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedAdviceBatch.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-bold text-slate-900">
                          {item.ownerName}
                          <span className="text-[11px] font-normal text-slate-500 block">
                            {item.cafeName}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {item.bankName}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-800">
                          <div>{item.accountNumber}</div>
                          <div className="text-[10px] text-slate-500">IFSC: {item.ifscCode}</div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-emerald-800">
                          {item.upiId}
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-emerald-700 text-sm">
                          ₹{item.amountReleasedInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Summary Block */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-900 uppercase">
                    Total Payout Amount Authorized
                  </span>
                  <p className="text-[11px] text-emerald-700">
                    Disbursed across {selectedAdviceBatch.cafesSettledCount} registered cafe bank accounts
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-800">
                    ₹{selectedAdviceBatch.totalAmountReleasedInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">
                    STATUS: APPROVED & CLEARED
                  </span>
                </div>
              </div>

              {/* Signatory & Audit Stamp */}
              <div className="pt-4 flex items-end justify-between border-t border-slate-200 text-xs text-slate-500">
                <div>
                  <p className="font-semibold text-slate-700">Batch Ref: {selectedAdviceBatch.batchId}</p>
                  <p className="text-[10px]">Generated electronically on {new Date(selectedAdviceBatch.settledAt).toISOString()}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Platform Merchant: Ajay Kalal (paytm.s2hlgrh@pty)</p>
                </div>
                <div className="text-right">
                  <div className="border border-emerald-600 bg-emerald-50 text-emerald-900 rounded-lg px-4 py-2 inline-block text-center font-bold">
                    <span className="text-[10px] uppercase block tracking-wider text-emerald-700">
                      SAGA Platform Operations
                    </span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">
                      Ajay Kalal
                    </span>
                    <span className="text-[9px] text-emerald-800 block">
                      Chief Administrator & Treasury
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => setShowAdviceModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => downloadSettlementCsv(selectedAdviceBatch)}
                className="px-4 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Bank CSV</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingCafeId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl animate-scaleIn">
            <h3 className="font-black text-slate-900 text-base mb-1">
              Reject Cafe KYC Application
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              State the reason for rejection so the cafe owner can update their documents.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. FSSAI registration certificate is expired, or GSTIN name does not match cafe legal title."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 outline-none mb-4"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setRejectingCafeId(null)
                  setRejectionReason('')
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectCafe}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAIL MODAL WITH PREVIOUS / NEXT NAVIGATION */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-scaleIn flex flex-col my-auto">
            {/* Top Modal Navigation Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white sticky top-0 z-10 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevOrder}
                  disabled={!hasPrevOrder}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                    hasPrevOrder
                      ? 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer active:scale-95'
                      : 'bg-slate-800/40 text-slate-500 cursor-not-allowed'
                  }`}
                  title={hasPrevOrder ? 'Previous Order (Left Arrow)' : 'No previous order'}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                <div className="text-center sm:text-left px-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm sm:text-base text-white">
                      #{selectedOrder.order_number}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        selectedOrder.status === 'delivered'
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : selectedOrder.status === 'out_for_delivery'
                          ? 'bg-blue-400 text-slate-950 font-black'
                          : selectedOrder.status === 'ready_for_pickup'
                          ? 'bg-emerald-400 text-slate-950 font-black'
                          : selectedOrder.status === 'preparing'
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-purple-400 text-slate-950 font-black'
                      }`}
                    >
                      {selectedOrder.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Order {selectedOrderIndex + 1} of {filteredOrders.length} • {new Date(selectedOrder.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextOrder}
                  disabled={!hasNextOrder}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                    hasNextOrder
                      ? 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer active:scale-95'
                      : 'bg-slate-800/40 text-slate-500 cursor-not-allowed'
                  }`}
                  title={hasNextOrder ? 'Next Order (Right Arrow)' : 'No next order'}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Modal (Escape)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Customer & Delivery Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Recipient</span>
                    <h4 className="text-base font-extrabold text-slate-900">{selectedOrder.delivery_address.recipient_name}</h4>
                    <span className="text-xs text-slate-600 font-mono font-bold">{selectedOrder.delivery_address.phone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={createWhatsAppUrl(selectedOrder.delivery_address.phone, `Hi ${selectedOrder.delivery_address.recipient_name}, this is SAGA Platform regarding your Order #${selectedOrder.order_number}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Customer</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery Destination</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selectedOrder.delivery_address.building && `${selectedOrder.delivery_address.building}, `}
                      {selectedOrder.delivery_address.street}, {selectedOrder.delivery_address.city} - {selectedOrder.delivery_address.postal_code}
                    </p>
                    {selectedOrder.delivery_address.landmark && (
                      <span className="text-[11px] text-slate-500 block mt-0.5">Landmark: {selectedOrder.delivery_address.landmark}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Logistics & Security</span>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-mono font-black text-xs">
                        OTP: {selectedOrder.delivery_otp || '4829'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold text-[11px]">
                        {selectedOrder.delivery_address.distance_km || 2.4} km away
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[11px] uppercase">
                        {selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid (UPI)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Itemized Kitchen Order</h5>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Item Name</th>
                        <th className="px-4 py-2.5 text-center">Qty</th>
                        <th className="px-4 py-2.5 text-right">Unit Price</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            <span className="inline-block w-2 h-2 rounded-full mr-2 bg-emerald-500" />
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-700">x{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-600 font-mono">₹{item.price_inr}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-900 font-mono">
                            ₹{item.price_inr * item.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Complete Financial Math Split Card */}
              <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> Complete Financial &amp; Payout Ledger
                  </span>
                  <span className="text-xs font-black text-slate-900 font-mono">
                    Total Paid: ₹{selectedOrder.total_amount_inr}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Food Subtotal</span>
                    <span className="text-sm font-black text-slate-900 font-mono mt-0.5 block">₹{selectedOrder.subtotal_inr}</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide block">Cafe Net Share (85%)</span>
                    <span className="text-sm font-black text-emerald-700 font-mono mt-0.5 block">
                      ₹{Math.round(selectedOrder.subtotal_inr * 0.85)}
                    </span>
                    <span className="text-[9px] text-slate-400">Credited in 72h Escrow</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide block">Rider Wallet Credited</span>
                    <span className="text-sm font-black text-blue-700 font-mono mt-0.5 block">
                      ₹{dynamicConfig.riderPayoutPerOrderInr || 55}
                    </span>
                    <span className="text-[9px] text-slate-400">Instant Courier Fee</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide block">SAGA Platform Take</span>
                    <span className="text-sm font-black text-purple-700 font-mono mt-0.5 block">
                      ₹{Math.round(selectedOrder.subtotal_inr * 0.15) + (selectedOrder.platform_fee_inr || 5)}
                    </span>
                    <span className="text-[9px] text-slate-400">15% Comm + Tech Fee</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-emerald-200/40">
                  <span>Customer Delivery Fee: ₹{selectedOrder.delivery_fee_inr}</span>
                  <span>Platform Tech Fee: ₹{selectedOrder.platform_fee_inr || 5}</span>
                  <span>Payment Collection: {selectedOrder.payment_method === 'cod' ? 'Rider Physical Cash' : 'Direct UPI Gateway'}</span>
                </div>
              </div>

              {/* Courier & Verification Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Courier Dispatch &amp; Proof</span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                      <Bike className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 block">
                        {selectedOrder.rider_id ? 'Vikram Singh (Campus Courier)' : 'Broadcast Pool (Looking for courier)'}
                      </span>
                      <span className="text-[11px] text-slate-500">RV College of Engineering • Electric Bicycle</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      selectedOrder.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedOrder.status === 'delivered' ? 'OTP Verified Handover ✅' : 'Handover In Progress ⏳'}
                    </span>
                  </div>
                </div>

                {/* Pickup & Delivery Proof Photos if available */}
                {(selectedOrder.pickup_photo_url || selectedOrder.delivery_photo_url) && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {selectedOrder.pickup_photo_url && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">Pickup Package Proof</span>
                        <img src={selectedOrder.pickup_photo_url} alt="Pickup Proof" className="w-full h-24 object-cover rounded-xl border border-slate-200" />
                      </div>
                    )}
                    {selectedOrder.delivery_photo_url && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">Doorstep Drop Proof</span>
                        <img src={selectedOrder.delivery_photo_url} alt="Delivery Proof" className="w-full h-24 object-cover rounded-xl border border-slate-200" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Footer Action */}
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-3xl">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Use Left / Right arrow keys to flip orders
              </span>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer ml-auto"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
