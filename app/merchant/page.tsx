'use client'

import React, { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import {
  Store,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Bell,
  Volume2,
  FileCheck,
  Coffee,
  X,
  Power,
  Wallet as WalletIcon,
  ShieldCheck,
  Building2,
  ArrowDownRight,
  Edit3,
  Download,
  Lock,
  Ticket,
} from 'lucide-react'
import { sounds } from '@/lib/utils/soundEffects'
import { exportDailySalesCsv } from '@/lib/services/exportService'
import {
  getDynamicConfig,
  SAGA_CONFIG_EVENT,
  type DynamicPlatformConfig,
} from '@/lib/services/configService'
import {
  getStoredCoupons,
  createCoupon,
  toggleCoupon,
  SAGA_PROMO_EVENT,
  type PromoCoupon,
} from '@/lib/services/promoService'
import {
  SEED_CAFES,
  SEED_MENU_ITEMS,
  SEED_WALLETS,
  SEED_WALLET_TRANSACTIONS,
} from '@/lib/data/mockData'
import {
  getStoredOrders,
  updateOrderStatusAndAutomate,
  SAGA_ORDERS_EVENT,
  getStoredWallets,
  getStoredTransactions,
} from '@/lib/services/orderService'
import {
  getCafeBankDetails,
  saveCafeBankDetails,
  requestWalletWithdrawal,
  type CafeBankDetails,
} from '@/lib/services/settlementService'
import type { Cafe, MenuItem, Order, OrderStatus, Wallet, WalletTransaction } from '@/lib/supabase/types'

export default function MerchantPage() {
  // Target cafe: default to Koramangala (owned by Rohan Mehta)
  const [cafe, setCafe] = useState<Cafe>(() => {
    return SEED_CAFES.find((c) => c.slug === 'saga-koramangala') || SEED_CAFES[0]
  })

  // Filter Scope: 'this_cafe' (default cafe isolation) or 'all'
  const [filterScope, setFilterScope] = useState<'this_cafe' | 'all'>('this_cafe')

  // Active Tab
  const [activeTab, setActiveTab] = useState<'pos' | 'kyc' | 'menu' | 'wallet' | 'promos'>('pos')

  // Dynamic config for Pro Feature permissions
  const [dynamicConfig, setDynamicConfig] = useState<DynamicPlatformConfig>(() => getDynamicConfig())
  const [showProFeatureModal, setShowProFeatureModal] = useState<boolean>(false)

  // Store Promos & Offers State
  const [coupons, setCoupons] = useState<PromoCoupon[]>(() => {
    if (typeof window !== 'undefined') return getStoredCoupons()
    return []
  })
  const [showMerchantCouponModal, setShowMerchantCouponModal] = useState<boolean>(false)
  const [newCouponCode, setNewCouponCode] = useState<string>('')
  const [newCouponType, setNewCouponType] = useState<'flat' | 'percentage'>('flat')
  const [newCouponValue, setNewCouponValue] = useState<number>(50)
  const [newCouponMinOrder, setNewCouponMinOrder] = useState<number>(250)
  const [newCouponDesc, setNewCouponDesc] = useState<string>('')

  // Cafe Operating Open/Closed toggle
  const [isOpen, setIsOpen] = useState<boolean>(cafe.is_open)

  // Live Orders state from centralized service
  const [orders, setOrders] = useState<Order[]>(() => getStoredOrders())
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(true)
  const [hasNewAlert, setHasNewAlert] = useState<boolean>(true)
  const prevPlacedCountRef = React.useRef<number>(
    orders.filter((o) => o.status === 'placed').length
  )

  // Menu Items state
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    return SEED_MENU_ITEMS.filter((item) => item.cafe_id === cafe.id)
  })

  // KYC Form state
  const [fssaiNum, setFssaiNum] = useState(cafe.fssai_number || '11223344556677')
  const [gstinNum, setGstinNum] = useState(cafe.gstin_number || '29ABCDE1234F1Z5')
  const [kycDocUploaded, setKycDocUploaded] = useState(true)
  const [kycMessage, setKycMessage] = useState('')

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemCat, setNewItemCat] = useState('Pizza')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [newItemVeg, setNewItemVeg] = useState(true)
  const [newItemImg, setNewItemImg] = useState('')

  // Merchant Wallet & Bank Details State
  const [wallets, setWallets] = useState<Wallet[]>(() => {
    if (typeof window !== 'undefined') return getStoredWallets()
    return SEED_WALLETS
  })
  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => {
    if (typeof window !== 'undefined') return getStoredTransactions()
    return SEED_WALLET_TRANSACTIONS
  })
  const merchantWallet = wallets.find((w) => w.cafe_id === cafe.id) || SEED_WALLETS[1]
  const walletBalance = merchantWallet.balance_inr
  const onHoldBalance = merchantWallet.on_hold_balance_inr

  // Bank Details State
  const [bankDetails, setBankDetails] = useState<CafeBankDetails>(() => getCafeBankDetails(cafe.id))
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)
  const [bankFormHolder, setBankFormHolder] = useState('')
  const [bankFormName, setBankFormName] = useState('')
  const [bankFormAccNum, setBankFormAccNum] = useState('')
  const [bankFormConfirmAccNum, setBankFormConfirmAccNum] = useState('')
  const [bankFormIfsc, setBankFormIfsc] = useState('')
  const [bankFormBranch, setBankFormBranch] = useState('')
  const [bankFormUpi, setBankFormUpi] = useState('')
  const [bankFormType, setBankFormType] = useState<'Current' | 'Savings'>('Current')
  const [bankFormError, setBankFormError] = useState<string | null>(null)

  // Withdrawal Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [withdrawAmountInput, setWithdrawAmountInput] = useState('')
  const [withdrawPayoutMode, setWithdrawPayoutMode] = useState<'bank_transfer' | 'upi'>('bank_transfer')
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false)
  const [withdrawalSuccessNotice, setWithdrawalSuccessNotice] = useState<{
    ref: string
    amount: number
    bank: string
  } | null>(null)

  // Notification Toast
  const [toastNotice, setToastNotice] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToastNotice(msg)
    setTimeout(() => setToastNotice(null), 4000)
  }

  const handleSwitchCafe = (newCafe: Cafe) => {
    setCafe(newCafe)
    setIsOpen(newCafe.is_open)
    setMenuItems(SEED_MENU_ITEMS.filter((item) => item.cafe_id === newCafe.id))
    setBankDetails(getCafeBankDetails(newCafe.id))
    showToast(`Switched active kitchen to ${newCafe.name}`)
  }

  const displayOrders = filterScope === 'this_cafe'
    ? orders.filter((o) => o.cafe_id === cafe.id)
    : orders
  const activePlacedOrders = displayOrders.filter((o) => o.status === 'placed')

  useEffect(() => {
    const handleUpdate = () => {
      const latest = getStoredOrders()
      const targetCafeOrders = filterScope === 'this_cafe'
        ? latest.filter((o) => o.cafe_id === cafe.id)
        : latest
      const currentPlaced = targetCafeOrders.filter((o) => o.status === 'placed').length

      // Ring kitchen bell alert if new unaccepted order arrived
      if (soundAlertEnabled && currentPlaced > prevPlacedCountRef.current) {
        sounds.playKitchenBellAlert()
        setHasNewAlert(true)
      }
      prevPlacedCountRef.current = currentPlaced
      setOrders(latest)
      setWallets(getStoredWallets())
      setTransactions(getStoredTransactions())
      setBankDetails(getCafeBankDetails(cafe.id))
      setDynamicConfig(getDynamicConfig())
      setCoupons(getStoredCoupons())
    }

    window.addEventListener(SAGA_ORDERS_EVENT, handleUpdate)
    window.addEventListener(SAGA_CONFIG_EVENT, handleUpdate)
    window.addEventListener(SAGA_PROMO_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      window.removeEventListener(SAGA_ORDERS_EVENT, handleUpdate)
      window.removeEventListener(SAGA_CONFIG_EVENT, handleUpdate)
      window.removeEventListener(SAGA_PROMO_EVENT, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [soundAlertEnabled, cafe.id, filterScope])

  const handleExportSalesCsv = () => {
    if (!dynamicConfig.allowMerchantCsvExport) {
      setShowProFeatureModal(true)
      return
    }
    exportDailySalesCsv(displayOrders, cafe.name)
    sounds.playNotificationChime()
    showToast(`📥 Daily Sales & Tax CSV exported for ${cafe.name}!`)
  }

  const handleCreateMerchantCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCouponCode.trim()) return

    createCoupon({
      code: newCouponCode,
      discountType: newCouponType,
      discountValue: Number(newCouponValue),
      minOrderAmount: Number(newCouponMinOrder),
      description:
        newCouponDesc.trim() ||
        `${newCouponType === 'flat' ? `Flat ₹${newCouponValue} OFF` : `${newCouponValue}% OFF`} on orders above ₹${newCouponMinOrder} at ${cafe.name}`,
      cafeId: cafe.id,
      cafeName: cafe.name,
      createdBy: 'cafe_owner',
    })

    setCoupons(getStoredCoupons())
    setShowMerchantCouponModal(false)
    setNewCouponCode('')
    setNewCouponDesc('')
    sounds.playSuccessCelebration()
    showToast(`🎉 Exclusive offer "${newCouponCode.toUpperCase()}" created for ${cafe.name}!`)
  }

  const handleToggleMerchantCoupon = (id: string) => {
    toggleCoupon(id)
    setCoupons(getStoredCoupons())
    sounds.playNotificationChime()
    showToast('Promo status updated.')
  }

  const handleOpenBankModal = () => {
    setBankFormHolder(bankDetails.ownerName)
    setBankFormName(bankDetails.bankName)
    setBankFormAccNum(bankDetails.accountNumber)
    setBankFormConfirmAccNum(bankDetails.accountNumber)
    setBankFormIfsc(bankDetails.ifscCode)
    setBankFormBranch(bankDetails.branch || '')
    setBankFormUpi(bankDetails.upiId || '')
    setBankFormType(bankDetails.accountType || 'Current')
    setBankFormError(null)
    setIsBankModalOpen(true)
  }

  const handleSaveBankForm = (e: React.FormEvent) => {
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
      setBankFormError('Account numbers do not match. Please verify.')
      return
    }
    if (!bankFormIfsc.trim() || bankFormIfsc.trim().length !== 11) {
      setBankFormError('Please enter an 11-character IFSC code (e.g. HDFC0001234).')
      return
    }

    const updated = saveCafeBankDetails(cafe.id, {
      ownerName: bankFormHolder.trim(),
      bankName: bankFormName.trim() || 'HDFC Bank',
      accountNumber: bankFormAccNum.trim(),
      ifscCode: bankFormIfsc.trim().toUpperCase(),
      branch: bankFormBranch.trim() || 'Main Branch',
      upiId: bankFormUpi.trim() || `${bankFormHolder.toLowerCase().replace(/\s+/g, '')}@okhdfcbank`,
      accountType: bankFormType,
    })

    setBankDetails(updated)
    setIsBankModalOpen(false)
    sounds.playNotificationChime()
    showToast('✅ Bank account details saved & verified!')
  }

  const handleOpenWithdrawModal = () => {
    setWithdrawAmountInput(walletBalance > 0 ? walletBalance.toString() : '')
    setWithdrawError(null)
    setIsWithdrawModalOpen(true)
  }

  const handleSubmitWithdrawal = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(withdrawAmountInput)
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError('Please enter a valid amount.')
      return
    }
    if (amount > walletBalance) {
      setWithdrawError(`Requested ₹${amount} exceeds available balance ₹${walletBalance.toFixed(2)}.`)
      return
    }
    if (amount < 100) {
      setWithdrawError('Minimum withdrawal amount is ₹100.')
      return
    }

    setIsSubmittingWithdrawal(true)
    setTimeout(() => {
      const result = requestWalletWithdrawal({
        walletId: merchantWallet.id,
        role: 'cafe_owner',
        amountInr: amount,
        mode: withdrawPayoutMode,
        bankDetails: {
          accountHolder: bankDetails.ownerName,
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
          ifscCode: bankDetails.ifscCode,
          upiId: bankDetails.upiId,
        },
      })

      setIsSubmittingWithdrawal(false)
      if (result.success) {
        sounds.playSuccessCelebration()
        setWithdrawalSuccessNotice({
          ref: result.referenceNumber,
          amount: result.withdrawnAmount,
          bank: bankDetails.bankName,
        })
        setWallets(getStoredWallets())
        setTransactions(getStoredTransactions())
        setIsWithdrawModalOpen(false)
        showToast(`✅ ₹${amount.toFixed(2)} payout initiated! Ref: ${result.referenceNumber}`)
      } else {
        setWithdrawError(result.message)
      }
    }, 700)
  }

  // Update Order Status
  const handleUpdateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    const updated = updateOrderStatusAndAutomate(orderId, nextStatus)
    if (updated) {
      setOrders(getStoredOrders())
    } else {
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, status: nextStatus } : ord))
      )
    }
    if (soundAlertEnabled) {
      if (nextStatus === 'preparing') {
        sounds.playSuccessCelebration()
      } else {
        sounds.playNotificationChime()
      }
    }
  }

  // Toggle Dish Availability
  const handleToggleItemAvailability = (itemId: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, is_available: !item.is_available } : item
      )
    )
  }

  // Delete Dish
  const handleDeleteItem = (itemId: string) => {
    setMenuItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  // Add Dish
  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName || !newItemPrice) return

    const created: MenuItem = {
      id: 'item-custom-' + Date.now(),
      cafe_id: cafe.id,
      name: newItemName,
      price_inr: parseFloat(newItemPrice) || 199,
      category: newItemCat,
      description: newItemDesc || 'Freshly made in our kitchen',
      image_url:
        newItemImg ||
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
      is_veg: newItemVeg,
      is_available: true,
      preparation_time_min: 15,
      tags: ['Chef Special'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setMenuItems([created, ...menuItems])
    setIsAddModalOpen(false)
    setNewItemName('')
    setNewItemPrice('')
    setNewItemDesc('')
    setNewItemImg('')
  }

  // Save KYC
  const handleSaveKyc = (e: React.FormEvent) => {
    e.preventDefault()
    setCafe({
      ...cafe,
      fssai_number: fssaiNum,
      gstin_number: gstinNum,
    })
    setKycMessage('KYC credentials updated and under active platform verification.')
    setTimeout(() => setKycMessage(''), 4000)
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-16">
      {/* Top App Bar */}
      <Navbar cafeName={cafe.name} deliveryTime={cafe.delivery_time_min} isOpen={isOpen} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Toast Alert */}
        {toastNotice && (
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-bold flex items-center justify-between shadow-lg animate-scaleIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastNotice}</span>
            </div>
            <button
              onClick={() => setToastNotice(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Merchant Banner Header */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={cafe.id}
                  onChange={(e) => {
                    const selected = SEED_CAFES.find((c) => c.id === e.target.value)
                    if (selected) handleSwitchCafe(selected)
                  }}
                  className="text-lg sm:text-xl font-extrabold text-gray-900 bg-transparent border-b-2 border-emerald-500/40 hover:border-emerald-600 focus:outline-none cursor-pointer py-0.5 pr-2"
                >
                  {SEED_CAFES.map((c) => (
                    <option key={c.id} value={c.id} className="text-sm font-semibold text-gray-900">
                      {c.name}
                    </option>
                  ))}
                </select>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    cafe.kyc_status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  KYC: {cafe.kyc_status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Merchant POS &amp; Kitchen Display • Commission Rate: {cafe.commission_rate}%
              </p>
            </div>
          </div>

          {/* Operating Toggle & Chime Alert */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSoundAlertEnabled(!soundAlertEnabled)
                if (!soundAlertEnabled) sounds.playKitchenBellAlert()
              }}
              className={`p-2.5 rounded-xl border transition-colors tap-feedback cursor-pointer ${
                soundAlertEnabled
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/20'
                  : 'bg-gray-100 border-gray-200 text-gray-400'
              }`}
              title={soundAlertEnabled ? 'Kitchen Bell Sound ON' : 'Kitchen Bell Sound OFF'}
            >
              <Volume2 className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => sounds.playKitchenBellAlert()}
              className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Test Kitchen POS Alert Sound"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
              <span>Test Bell</span>
            </button>

            {/* Open / Closed Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all tap-feedback cursor-pointer shadow-xs ${
                isOpen
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isOpen ? 'Open for Orders' : 'Store Closed'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all tap-feedback cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'pos'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-emerald-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Live POS ({displayOrders.filter((o) => o.status !== 'delivered').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('kyc')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all tap-feedback cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'kyc'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-emerald-700'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>KYC &amp; Legal</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all tap-feedback cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'menu'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-emerald-700'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>Menu Catalog ({menuItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all tap-feedback cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'wallet'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-emerald-700'
            }`}
          >
            <WalletIcon className="w-4 h-4" />
            <span>Wallet &amp; Escrow</span>
          </button>

          <button
            onClick={() => setActiveTab('promos')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all tap-feedback cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'promos'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-emerald-700'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Store Promos ({coupons.filter((c) => !c.cafeId || c.cafeId === cafe.id).length})</span>
          </button>
        </div>

        {/* TAB 1: LIVE ORDERS POS & KDS */}
        {activeTab === 'pos' && (
          <div className="space-y-4">
            {/* Filter scope switcher: This Cafe vs All Network */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterScope('this_cafe')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterScope === 'this_cafe'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-emerald-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {cafe.name} ({orders.filter((o) => o.cafe_id === cafe.id && o.status !== 'delivered').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterScope === 'all'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-emerald-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  All Network Cafes ({orders.filter((o) => o.status !== 'delivered').length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 font-semibold px-2 hidden sm:inline">
                  Showing {displayOrders.length} orders
                </span>

                <button
                  type="button"
                  onClick={handleExportSalesCsv}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    dynamicConfig.allowMerchantCsvExport
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                  }`}
                  title={
                    dynamicConfig.allowMerchantCsvExport
                      ? 'Download Daily Sales Sheet for Bookkeeping & GST'
                      : 'Pro Feature: Contact FoodLo Admin to unlock'
                  }
                >
                  {dynamicConfig.allowMerchantCsvExport ? (
                    <Download className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>Export Daily Sales (CSV)</span>
                  {!dynamicConfig.allowMerchantCsvExport && (
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                      PRO
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* INCOMING NEW ORDER FLASH ALERT FOR CHEF */}
            {activePlacedOrders.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white rounded-3xl p-5 shadow-lg border-2 border-emerald-400 animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white text-emerald-700 flex items-center justify-center font-black shadow-md">
                      <Bell className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider bg-black/20 px-2.5 py-0.5 rounded-full">
                        🚨 {activePlacedOrders.length} New Kitchen Order Received
                      </span>
                      <h3 className="text-lg font-black leading-tight mt-0.5">
                        Chef Action Required: Accept &amp; Start Preparing
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => sounds.playKitchenBellAlert()}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Replay Bell</span>
                  </button>
                </div>

                {/* Quick 1-tap accept banner */}
                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-extrabold text-white">
                      Order #{activePlacedOrders[0].order_number}
                    </span>
                    <span className="text-emerald-100 ml-1.5">
                      ({activePlacedOrders[0].items.reduce((s, i) => s + i.quantity, 0)} items • ₹{activePlacedOrders[0].total_amount_inr})
                    </span>
                    <span className="block text-[11px] text-emerald-200 mt-0.5">
                      {activePlacedOrders[0].payment_method === 'cod'
                        ? 'Cash on Delivery (Collect on Drop)'
                        : 'Paid Directly via Paytm UPI'} • Non-Cancellable Fresh Prep
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      handleUpdateOrderStatus(
                        activePlacedOrders[0].id,
                        'preparing'
                      )
                    }
                    className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 font-black text-xs rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Accept #{activePlacedOrders[0].order_number} &amp; Cook</span>
                  </button>
                </div>
              </div>
            )}

            {hasNewAlert && activePlacedOrders.length === 0 && (
              <div className="bg-emerald-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold">Live Order Board Active</h4>
                    <p className="text-xs text-emerald-100">
                      Kitchen bell audio alert enabled for all new incoming orders.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHasNewAlert(false)}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold tap-feedback"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayOrders.map((order) => {
                const isNew = order.status === 'placed'
                const isPreparing = order.status === 'preparing'
                const isReady = order.status === 'ready_for_pickup'
                const isOut = order.status === 'out_for_delivery'
                const isDelivered = order.status === 'delivered'

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl p-4 border shadow-xs transition-all flex flex-col justify-between ${
                      isNew
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                        : isPreparing
                        ? 'border-amber-400 bg-amber-50/10'
                        : isReady
                        ? 'border-blue-400 bg-blue-50/10'
                        : 'border-gray-200'
                    }`}
                  >
                    <div>
                      {/* Order Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-xs font-bold text-gray-400">Order ID</span>
                          <h3 className="text-base font-extrabold text-gray-900">
                            #{order.order_number}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${
                            isNew
                              ? 'bg-emerald-600 text-white animate-pulse'
                              : isPreparing
                              ? 'bg-amber-100 text-amber-800'
                              : isReady
                              ? 'bg-blue-100 text-blue-800'
                              : isOut
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Customer info & Payment Badge */}
                      <div className="bg-gray-50 rounded-xl p-2.5 mb-3 text-xs text-gray-600 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-gray-900">
                              {order.delivery_address.recipient_name}
                            </span>
                            <span className="text-gray-400 ml-1">
                              ({order.delivery_address.phone})
                            </span>
                          </div>
                          <span className="font-extrabold text-emerald-700">
                            ₹{order.subtotal_inr}
                          </span>
                        </div>

                        {/* Payment Mode Badge */}
                        <div className="pt-1.5 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                          <span className="text-gray-500 font-medium">Payment:</span>
                          {order.payment_method === 'cod' ? (
                            <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <span>COD (Collect ₹{order.total_amount_inr})</span>
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Paid to Ajay Kalal (Paytm)</span>
                              {order.payment_utr && (
                                <span className="font-mono text-[9px] bg-white px-1 rounded text-emerald-900">
                                  UTR: {order.payment_utr}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-1.5 mb-3">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          Kitchen Items
                        </span>
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-xs py-1 border-b border-gray-100 last:border-none"
                          >
                            <span className="font-bold text-gray-800">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="text-gray-500">
                              ₹{(item.price_inr * item.quantity).toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Special Cooking Instructions */}
                      {order.special_instructions && (
                        <div className="p-2 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-900 mb-3">
                          <span className="font-bold">Note: </span>
                          {order.special_instructions}
                        </div>
                      )}
                    </div>

                    {/* POS Actions */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      <div className="flex gap-2">
                        {isNew && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all tap-feedback cursor-pointer shadow-xs"
                          >
                            Accept &amp; Prepare
                          </button>
                        )}

                        {isPreparing && (
                          <button
                            onClick={() =>
                              handleUpdateOrderStatus(order.id, 'ready_for_pickup')
                            }
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all tap-feedback cursor-pointer shadow-xs"
                          >
                            Mark Ready for Pickup
                          </button>
                        )}

                        {isReady && (
                          <span className="text-xs font-bold text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl">
                            <Clock className="w-3.5 h-3.5" />
                            Awaiting Student Rider Pickup
                          </span>
                        )}

                        {isOut && (
                          <span className="text-xs font-bold text-purple-700 flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Rider Vikram in Transit
                          </span>
                        )}

                        {isDelivered && (
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-lg">
                            Delivered &amp; Settled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CAFE DETAILS & FSSAI / GST KYC ONBOARDING */}
        {activeTab === 'kyc' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Cafe Compliance &amp; Regulatory KYC
              </h2>
              <p className="text-xs text-gray-500">
                Submit mandatory FSSAI Food Safety license and GSTIN registration for payout compliance.
              </p>
            </div>

            {kycMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                {kycMessage}
              </div>
            )}

            <form onSubmit={handleSaveKyc} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    FSSAI License (14 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={fssaiNum}
                    onChange={(e) => setFssaiNum(e.target.value)}
                    placeholder="11223344556677"
                    className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    GSTIN Number (15 Chars)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstinNum}
                    onChange={(e) => setGstinNum(e.target.value)}
                    placeholder="29ABCDE1234F1Z5"
                    className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Upload document simulation */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 text-center space-y-2">
                <FileCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-xs font-medium text-gray-700">
                  {kycDocUploaded
                    ? '✓ Certificate_fssai_gstin_koramangala.pdf uploaded (Verified)'
                    : 'Click to upload FSSAI Certificate & GST Registration'}
                </div>
                <button
                  type="button"
                  onClick={() => setKycDocUploaded(true)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700 tap-feedback cursor-pointer"
                >
                  {kycDocUploaded ? 'Replace Document' : 'Select PDF / Image'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-gray-700">
                    Status: Approved by Super Admin
                  </span>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs tap-feedback cursor-pointer"
                >
                  Save &amp; Update KYC
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: MENU ITEM CRUD */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Cafe Menu Dishes</h2>
                <p className="text-xs text-gray-500">
                  Update dish pricing, descriptions, and toggle live stock availability.
                </p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs tap-feedback cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Dish</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-xs flex flex-col justify-between"
                >
                  <div className="relative h-36 w-full bg-gray-100">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-white/90 p-1 rounded-sm border">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          item.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-bold text-gray-900 truncate">
                          {item.name}
                        </h4>
                        <span className="text-sm font-black text-emerald-700">
                          ₹{item.price_inr}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      {/* Availability Toggle */}
                      <button
                        onClick={() => handleToggleItemAvailability(item.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all tap-feedback cursor-pointer ${
                          item.is_available
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}
                      >
                        {item.is_available ? 'In Stock' : 'Sold Out'}
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg transition-colors tap-feedback cursor-pointer"
                        title="Delete Dish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: MERCHANT WALLET & 3-DAY ESCROW LEDGER */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            {/* Withdrawal Success Notice */}
            {withdrawalSuccessNotice && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-scaleIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      Withdrawal Request Initiated Successfully
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      ₹{withdrawalSuccessNotice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} scheduled for transfer to {withdrawalSuccessNotice.bank}. Reference: <span className="font-mono font-bold text-emerald-800">{withdrawalSuccessNotice.ref}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setWithdrawalSuccessNotice(null)}
                  className="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 font-bold text-xs hover:bg-emerald-100/50 self-start sm:self-auto cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Wallet Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Available Balance */}
              <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Available Payout Balance
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                    ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Settled funds cleared from 72h escrow
                  </p>
                </div>
                <button
                  onClick={handleOpenWithdrawModal}
                  disabled={walletBalance <= 0}
                  className="w-full mt-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all tap-feedback cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Withdraw Money</span>
                </button>
              </div>

              {/* On-Hold Escrow Balance */}
              <div className="bg-white rounded-3xl p-5 border border-amber-200 shadow-xs space-y-2 bg-amber-50/20 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                      3-Day Escrow Hold
                    </span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">
                    ₹{onHoldBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-amber-800/80 mt-1">
                    Customer safety escrow. Releases to Available balance automatically after 72 hours.
                  </p>
                </div>
                <div className="pt-2 text-[10px] font-bold text-amber-900 bg-amber-100/60 px-3 py-1.5 rounded-lg border border-amber-200/60">
                  🔒 Dispute & Quality Safeguard Active
                </div>
              </div>

              {/* Total Earned */}
              <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Lifetime Net Sales
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                    ₹{merchantWallet.total_earned_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Platform commission ({cafe.commission_rate}%) automatically deducted.
                  </p>
                </div>
                <div className="pt-2 text-xs font-bold text-slate-500">
                  Total Withdrawn: ₹{(merchantWallet.total_withdrawn_inr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Registered Bank Account & Payout Method Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-gray-900">
                        Registered Bank Account
                      </h3>
                      <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        Direct NEFT / IMPS Active
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Disbursements and instant withdrawals are transferred directly into this account.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleOpenBankModal}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Bank Details</span>
                </button>
              </div>

              {/* Account Details Pill Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Account Holder</span>
                  <span className="text-xs font-extrabold text-slate-900 block truncate mt-0.5">{bankDetails.ownerName}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Bank Name</span>
                  <span className="text-xs font-extrabold text-slate-900 block truncate mt-0.5">{bankDetails.bankName}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Account Number</span>
                  <span className="text-xs font-mono font-extrabold text-slate-900 block mt-0.5">
                    {bankDetails.accountNumber.slice(-4).padStart(bankDetails.accountNumber.length, '•')}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">IFSC Code &amp; UPI</span>
                  <span className="text-xs font-mono font-extrabold text-slate-900 block mt-0.5 truncate">
                    {bankDetails.ifscCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Escrow & Transaction Ledger Table */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900">
                  Merchant Payouts &amp; Escrow Ledger
                </h3>
                <span className="text-xs text-gray-400">Live Transaction History</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Transaction</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions
                      .filter((t) => t.wallet_id === merchantWallet.id)
                      .slice(0, 10)
                      .map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-3 font-semibold text-gray-800">
                            {tx.description}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-mono text-[11px]">
                              {tx.type}
                            </span>
                          </td>
                          <td className={`py-3 px-3 font-extrabold ${tx.type === 'merchant_payout' ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {tx.type === 'merchant_payout' ? '-' : '+'}₹{tx.amount_inr.toFixed(2)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                tx.status === 'settled' || tx.status === 'withdrawn'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-medium">
                            {new Date(tx.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STORE PROMOS & OFFERS */}
        {activeTab === 'promos' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Store Promotions &amp; Discount Offers</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {cafe.name}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Boost customer orders and college student volume with exclusive discount coupons for your kitchen.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMerchantCouponModal(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Cafe Offer</span>
              </button>
            </div>

            {/* Coupons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coupons
                .filter((c) => !c.cafeId || c.cafeId === cafe.id)
                .map((cpn) => {
                  const isExclusive = cpn.cafeId === cafe.id
                  return (
                    <div
                      key={cpn.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-sm text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300">
                            {cpn.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isExclusive
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isExclusive ? 'Exclusive to Your Cafe' : 'Platform Network Offer'}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">
                            {cpn.discountType === 'flat'
                              ? `Flat ₹${cpn.discountValue} OFF`
                              : `${cpn.discountValue}% OFF (Up to ₹${cpn.maxDiscountAmount || 100})`}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cpn.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="text-[11px] text-slate-400">
                          <span>Min Order: ₹{cpn.minOrderAmount}</span>
                          <span className="mx-1">•</span>
                          <span className="font-bold text-slate-700">{cpn.usageCount} orders redeemed</span>
                        </div>

                        {isExclusive ? (
                          <button
                            type="button"
                            onClick={() => handleToggleMerchantCoupon(cpn.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              cpn.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {cpn.isActive ? 'Active' : 'Inactive'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Managed by FoodLo Admin</span>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </main>

      {/* Add Dish Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900">Add New Dish</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600">Dish Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="E.g., Smoky BBQ Chicken Pizza"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600">Price (₹)</label>
                  <input
                    type="number"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="299"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600">Category</label>
                  <select
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Pizza">Pizza</option>
                    <option value="Burger">Burger</option>
                    <option value="Fries">Fries</option>
                    <option value="Coffee">Coffee</option>
                    <option value="Sandwich">Sandwich</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Pasta">Pasta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600">Description</label>
                <input
                  type="text"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Ingredients and culinary notes"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600">Food Image URL</label>
                <input
                  type="url"
                  value={newItemImg}
                  onChange={(e) => setNewItemImg(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="isVegCheck"
                  checked={newItemVeg}
                  onChange={(e) => setNewItemVeg(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm"
                />
                <label htmlFor="isVegCheck" className="text-xs font-bold text-gray-700">
                  Vegetarian Dish
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold tap-feedback shadow-xs"
              >
                Publish to Cafe Menu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT BANK ACCOUNT MODAL */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl space-y-4 my-8 animate-scaleIn">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    Add / Update Bank Account
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Direct settlements &amp; payouts for {cafe.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bankFormError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                ⚠️ {bankFormError}
              </div>
            )}

            <form onSubmit={handleSaveBankForm} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Account Holder Legal Name *
                </label>
                <input
                  type="text"
                  value={bankFormHolder}
                  onChange={(e) => setBankFormHolder(e.target.value)}
                  placeholder="e.g. Rohan Mehta or Saga Cafe Pvt Ltd"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    value={bankFormName}
                    onChange={(e) => setBankFormName(e.target.value)}
                    placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Account Type
                  </label>
                  <select
                    value={bankFormType}
                    onChange={(e) => setBankFormType(e.target.value as 'Current' | 'Savings')}
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="Current">Current Account (Business)</option>
                    <option value="Savings">Savings Account (Personal)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Bank Account Number *
                </label>
                <input
                  type="text"
                  value={bankFormAccNum}
                  onChange={(e) => setBankFormAccNum(e.target.value)}
                  placeholder="e.g. 50200088991122"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Confirm Bank Account Number *
                </label>
                <input
                  type="text"
                  value={bankFormConfirmAccNum}
                  onChange={(e) => setBankFormConfirmAccNum(e.target.value)}
                  placeholder="Re-enter bank account number"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    value={bankFormIfsc}
                    onChange={(e) => setBankFormIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    maxLength={11}
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl font-mono font-medium uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={bankFormBranch}
                    onChange={(e) => setBankFormBranch(e.target.value)}
                    placeholder="e.g. Koramangala 80ft Rd"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Preferred UPI ID (Optional - for instant settlements)
                </label>
                <input
                  type="text"
                  value={bankFormUpi}
                  onChange={(e) => setBankFormUpi(e.target.value)}
                  placeholder="e.g. cafe.payout@okhdfcbank"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-md transition-colors cursor-pointer"
                >
                  Save &amp; Verify Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW MONEY MODAL */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-4 my-8 animate-scaleIn">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    Withdraw Payout Funds
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Direct transfer to verified cafe bank account
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Available Balance Header */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Available for Withdrawal</span>
                <span className="text-xl font-black text-emerald-900">
                  ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWithdrawAmountInput(walletBalance.toString())}
                className="text-[11px] font-black text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-50 cursor-pointer"
              >
                Max All
              </button>
            </div>

            {withdrawError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                ⚠️ {withdrawError}
              </div>
            )}

            <form onSubmit={handleSubmitWithdrawal} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Enter Amount to Withdraw (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="100"
                    max={walletBalance}
                    value={withdrawAmountInput}
                    onChange={(e) => setWithdrawAmountInput(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full h-11 pl-8 pr-3 border border-gray-200 rounded-xl font-black text-base text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                {/* Quick amount chips */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
                  {[500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={walletBalance < amt}
                      onClick={() => setWithdrawAmountInput(amt.toString())}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      +₹{amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWithdrawAmountInput(walletBalance.toString())}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Full Balance
                  </button>
                </div>
              </div>

              {/* Destination Bank Summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Destination Account
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-xs">
                    {bankDetails.bankName} · {bankDetails.accountNumber.slice(-4).padStart(bankDetails.accountNumber.length, '•')}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                    {bankDetails.ifscCode}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Beneficiary: <span className="font-bold text-slate-700">{bankDetails.ownerName}</span>
                </div>
              </div>

              {/* Payout Transfer Mode */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Payout Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawPayoutMode('bank_transfer')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      withdrawPayoutMode === 'bank_transfer'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">Bank NEFT / IMPS</span>
                    <span className="text-[10px] text-gray-500 block">Next clearing cycle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawPayoutMode('upi')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      withdrawPayoutMode === 'upi'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">Instant UPI VPA</span>
                    <span className="text-[10px] text-gray-500 block">Immediate 24x7</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWithdrawal || walletBalance <= 0}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-black shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmittingWithdrawal ? (
                    <span>Processing Payout...</span>
                  ) : (
                    <span>Confirm Withdrawal</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRO FEATURE LOCKED UPGRADE MODAL */}
      {showProFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs border border-amber-200">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                FoodLo Pro Feature
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-2">
                Daily Sales &amp; Tax Reconciliation Export
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                1-Click Excel / CSV sales reporting for bookkeeping and GST filing is part of the <strong>FoodLo Merchant Pro</strong> tier.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-2 text-slate-700">
              <span className="font-bold block text-slate-900">What&apos;s Included in FoodLo Pro:</span>
              <div className="flex items-center gap-2 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Automated daily GST, subtotal, and net payout CSV sheets</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Tally / QuickBooks compatible transaction imports</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Priority student courier fleet dispatch</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              To unlock this feature for <strong>{cafe.name}</strong>, toggle it on in Admin Dynamic Controls or contact support.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowProFeatureModal(false)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
              <a
                href="https://wa.me/919876543210?text=Hello%20FoodLo%20Admin,%20I%20want%20to%20unlock%20Daily%20Sales%20CSV%20Export%20for%20my%20cafe."
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Contact Admin</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MERCHANT CREATE CAFE OFFER MODAL */}
      {showMerchantCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Create Cafe Exclusive Offer</h3>
                  <p className="text-[11px] text-slate-400">Drive orders for {cafe.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMerchantCouponModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMerchantCoupon} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Coupon Code (e.g. SPECIAL50, FEAST20)
                </label>
                <input
                  type="text"
                  required
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SPECIAL50"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Discount Type
                  </label>
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as 'flat' | 'percentage')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="flat">Flat ₹ (Rupees)</option>
                    <option value="percentage">% Percentage Off</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {newCouponType === 'flat' ? 'Discount (₹ INR)' : 'Discount Rate (%)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={newCouponType === 'flat' ? 500 : 70}
                    required
                    value={newCouponValue}
                    onChange={(e) => setNewCouponValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Minimum Order Value (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  required
                  value={newCouponMinOrder}
                  onChange={(e) => setNewCouponMinOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Offer Description
                </label>
                <input
                  type="text"
                  value={newCouponDesc}
                  onChange={(e) => setNewCouponDesc(e.target.value)}
                  placeholder={`e.g. Flat ₹${newCouponValue} OFF at ${cafe.name}`}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMerchantCouponModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Publish Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
