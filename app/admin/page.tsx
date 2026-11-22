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
} from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'
import {
  SEED_CAFES,
  SEED_ORDERS,
  SEED_WALLETS,
} from '@/lib/data/mockData'
import { getStoredOrders, getStoredWallets, SAGA_ORDERS_EVENT } from '@/lib/services/orderService'
import { sounds } from '@/lib/utils/soundEffects'
import {
  execute3DaySettlementBatch,
  downloadSettlementCsv,
  getStoredSettlementHistory,
  getCafeBankDetails,
  type SettlementBatchResult,
} from '@/lib/services/settlementService'
import type { Cafe, Wallet, KycStatus } from '@/lib/supabase/types'

export default function AdminPage() {
  const { user } = useAuth()

  // Active navigation tab: 'kyc' | 'commission' | 'orders' | 'escrow'
  const [activeTab, setActiveTab] = useState<'kyc' | 'commission' | 'orders' | 'escrow'>('kyc')

  // Cafes State (allows approval/rejection and commission rate updates)
  const [cafes, setCafes] = useState<Cafe[]>(SEED_CAFES)

  // Orders State (synced with platform orders service)
  const [orders, setOrders] = useState(() => {
    if (typeof window !== 'undefined') return getStoredOrders()
    return SEED_ORDERS
  })

  // Wallets State
  const [wallets, setWallets] = useState<Wallet[]>(SEED_WALLETS)

  // Settlement Automation State
  const [latestBatchResult, setLatestBatchResult] = useState<SettlementBatchResult | null>(null)
  const [settlementHistory, setSettlementHistory] = useState<SettlementBatchResult[]>([])
  const [showAdviceModal, setShowAdviceModal] = useState<boolean>(false)
  const [selectedAdviceBatch, setSelectedAdviceBatch] = useState<SettlementBatchResult | null>(null)
  const [forceOverride, setForceOverride] = useState<boolean>(false)

  useEffect(() => {
    const syncData = () => {
      setOrders(getStoredOrders())
      setWallets(getStoredWallets())
      setSettlementHistory(getStoredSettlementHistory())
    }
    syncData()
    window.addEventListener(SAGA_ORDERS_EVENT, syncData)
    window.addEventListener('storage', syncData)
    return () => {
      window.removeEventListener(SAGA_ORDERS_EVENT, syncData)
      window.removeEventListener('storage', syncData)
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
    const matchesStatus =
      orderStatusFilter === 'all' || order.status === orderStatusFilter
    const matchesSearch =
      order.order_number.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      order.delivery_address.recipient_name.toLowerCase().includes(orderSearchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

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
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full">
                {orders.length}
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

        {/* TAB 3: LIVE PLATFORM ORDERS OVERVIEW */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Live Platform Orders Monitor
                </h2>
                <p className="text-xs text-slate-500">
                  Cross-cafe centralized dispatch stream monitoring all customer orders in real-time.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search order or customer..."
                    className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 focus:outline-none"
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

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Order ID</th>
                      <th className="px-5 py-3.5">Cafe</th>
                      <th className="px-5 py-3.5">Customer & Items</th>
                      <th className="px-5 py-3.5">Total & Take</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => {
                      const cafe = SEED_CAFES.find((c) => c.id === order.cafe_id)
                      const platformCut = Math.round(order.subtotal_inr * 0.15)

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-4">
                            <span className="font-mono font-black text-slate-900 block">
                              #{order.order_number}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(order.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-bold text-slate-800 block">
                              {cafe?.name || 'Saga Cafe'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {cafe?.address || 'Bengaluru'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-semibold text-slate-900 block">
                              {order.delivery_address.recipient_name}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {order.items.reduce((s, i) => s + i.quantity, 0)} items ({order.items.map((i) => i.name).join(', ')})
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-extrabold text-slate-900 block">
                              ₹{order.total_amount_inr}
                            </span>
                            <span className="text-[11px] text-emerald-700 font-bold">
                              SAGA Take: ₹{platformCut + (order.platform_fee_inr || 5)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
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
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
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
    </div>
  )
}
