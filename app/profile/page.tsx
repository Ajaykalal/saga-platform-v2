'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  User,
  Phone,
  Lock,
  ArrowRight,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Check,
  Clock,
  ShoppingBag,
  Receipt,
  LogOut,
  ChevronRight,
  Store,
  Bike,
  Sparkles,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  CreditCard,
} from 'lucide-react'
import { useAuth, recordSupportRequest } from '@/lib/context/AuthContext'
import { useCart } from '@/lib/context/CartContext'
import { getPaymentConfig } from '@/lib/config/paymentConfig'
import { getStoredOrders, SAGA_ORDERS_EVENT } from '@/lib/services/orderService'
import {
  getStoredAddresses,
  getActiveAddress,
  setActiveAddress,
  saveUserAddress,
  deleteUserAddress,
  SAGA_ADDRESS_EVENT,
} from '@/lib/services/addressService'
import type { Order, UserAddress } from '@/lib/supabase/types'
import Navbar from '@/components/Navbar'

export default function ProfilePage() {
  const { user, loginWithPhonePin, registerWithPhonePin, logout, isPhoneRegistered } = useAuth()
  const { activeAddress: cartAddress } = useCart()

  // Authentication State for Logged Out users
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [fullName, setFullName] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

  // Active Tab for Logged In users
  const [activeTab, setActiveTab] = useState<'orders' | 'payments' | 'addresses' | 'support'>('orders')

  // Real data state
  const [orders, setOrders] = useState<Order[]>([])
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')

  // Address form modal/state
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addrLabel, setAddrLabel] = useState<'Home' | 'Work' | 'Hostel' | 'Other'>('Home')
  const [addrRecipient, setAddrRecipient] = useState('')
  const [addrPhone, setAddrPhone] = useState('')
  const [addrFlat, setAddrFlat] = useState('')
  const [addrBuilding, setAddrBuilding] = useState('')
  const [addrStreet, setAddrStreet] = useState('')
  const [addrLandmark, setAddrLandmark] = useState('')
  const [addrIsDefault, setAddrIsDefault] = useState(false)
  const [addrError, setAddrError] = useState('')
  const [addrSuccess, setAddrSuccess] = useState('')

  // Load orders and addresses
  const loadData = () => {
    const storedOrders = getStoredOrders()
    setOrders(storedOrders)

    const storedAddresses = getStoredAddresses()
    setAddresses(storedAddresses)

    const active = getActiveAddress()
    setSelectedAddressId(active?.id || (storedAddresses[0]?.id ?? ''))
  }

  useEffect(() => {
    loadData()
    window.addEventListener(SAGA_ORDERS_EVENT, loadData)
    window.addEventListener(SAGA_ADDRESS_EVENT, loadData)
    window.addEventListener('storage', loadData)

    return () => {
      window.removeEventListener(SAGA_ORDERS_EVENT, loadData)
      window.removeEventListener(SAGA_ADDRESS_EVENT, loadData)
      window.removeEventListener('storage', loadData)
    }
  }, [])

  // Handle Log In / Register Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    setAuthLoading(true)

    try {
      if (isRegisterMode) {
        const res = await registerWithPhonePin(fullName, phoneNumber, pin)
        if (!res.success) {
          setAuthError(res.message || 'Registration failed. Please check your details.')
        } else {
          setAuthSuccess('Account created successfully!')
        }
      } else {
        const res = await loginWithPhonePin(phoneNumber, pin)
        if (!res.success) {
          setAuthError(res.message || 'Invalid mobile number or 4-digit PIN.')
        } else {
          setAuthSuccess('Welcome back!')
        }
      }
    } catch {
      setAuthError('An unexpected error occurred. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  // Handle Address Save
  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault()
    setAddrError('')
    setAddrSuccess('')

    if (!addrRecipient.trim()) {
      setAddrError('Please enter recipient name')
      return
    }
    if (!addrPhone.trim() || addrPhone.replace(/\D/g, '').length < 10) {
      setAddrError('Please enter a valid 10-digit mobile number')
      return
    }
    if (!addrFlat.trim()) {
      setAddrError('Please enter flat/house number')
      return
    }
    if (!addrStreet.trim()) {
      setAddrError('Please enter street or area in Sagwara')
      return
    }

    const payload = {
      id: editingAddressId || undefined,
      label: addrLabel,
      recipient_name: addrRecipient.trim(),
      phone: addrPhone.trim(),
      flat_house_no: addrFlat.trim(),
      building_name: addrBuilding.trim() || 'Residential',
      area_street: addrStreet.trim(),
      landmark: addrLandmark.trim(),
      city: 'Sagwara',
      postal_code: '314025',
      distance_km: 2.5,
      is_default: addrIsDefault,
    }

    const saved = saveUserAddress(payload)
    if (addrIsDefault) {
      setActiveAddress(saved.id)
      setSelectedAddressId(saved.id)
    }

    setAddrSuccess('Address saved successfully!')
    setTimeout(() => {
      setIsEditingAddress(false)
      setEditingAddressId(null)
      resetAddressForm()
      loadData()
    }, 800)
  }

  const handleStartEdit = (addr: UserAddress) => {
    setEditingAddressId(addr.id)
    setAddrLabel(addr.label)
    setAddrRecipient(addr.recipient_name)
    setAddrPhone(addr.phone)
    setAddrFlat(addr.flat_house_no)
    setAddrBuilding(addr.building_name || '')
    setAddrStreet(addr.area_street)
    setAddrLandmark(addr.landmark || '')
    setAddrIsDefault(addr.is_default)
    setIsEditingAddress(true)
  }

  const handleStartAdd = () => {
    resetAddressForm()
    setEditingAddressId(null)
    setIsEditingAddress(true)
  }

  const resetAddressForm = () => {
    setAddrLabel('Home')
    setAddrRecipient(user?.full_name || '')
    setAddrPhone(user?.phone || '')
    setAddrFlat('')
    setAddrBuilding('')
    setAddrStreet('')
    setAddrLandmark('')
    setAddrIsDefault(false)
    setAddrError('')
    setAddrSuccess('')
  }

  const handleDeleteAddress = (id: string) => {
    if (confirm('Are you sure you want to delete this address?')) {
      deleteUserAddress(id)
      loadData()
    }
  }

  const handleSelectActiveAddress = (id: string) => {
    setActiveAddress(id)
    setSelectedAddressId(id)
  }

  const paymentConfig = getPaymentConfig()

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-28">
      {/* Top Navbar */}
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* ========================================================= */}
        {/* CASE 1: USER IS NOT LOGGED IN (CUSTOMER SIGN UP / LOGIN) */}
        {/* ========================================================= */}
        {!user ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-100 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-md">
                FL
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                {isRegisterMode ? 'Create Customer Account' : 'Welcome to FoodLo'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                {isRegisterMode
                  ? 'Sign up with your mobile number to start ordering in Sagwara'
                  : 'Enter your 10-digit mobile number and 4-digit PIN'}
              </p>
            </div>

            {/* Error / Success Messages */}
            {authError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold animate-shake">
                {authError}
              </div>
            )}
            {authSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{authSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {/* Full Name (Sign Up only) */}
              {isRegisterMode && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-500 font-bold text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    maxLength={10}
                    className="w-full h-12 pl-18 pr-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* 4-Digit Password / PIN */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    4-Digit Secret PIN
                  </label>
                  {!isRegisterMode && (
                    <a
                      href={`https://wa.me/${paymentConfig.supportWhatsApp}?text=${encodeURIComponent(
                        `Hello FoodLo Support, I need help resetting my login PIN for mobile: ${phoneNumber || '+91'}. Please assist!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        const cleanNum = phoneNumber.replace(/\D/g, '')
                        if (cleanNum) recordSupportRequest(cleanNum, 'forgot_pin')
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-500" />
                      Forgot PIN?
                    </a>
                  )}
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    maxLength={4}
                    className="w-full h-12 pl-10 pr-12 bg-gray-50 border border-gray-200 rounded-2xl text-center text-lg font-black tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 tap-feedback transition-all cursor-pointer disabled:opacity-60"
              >
                <span>
                  {authLoading
                    ? 'Verifying...'
                    : isRegisterMode
                    ? 'Sign Up & Start Ordering'
                    : 'Sign In to FoodLo'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode)
                  setAuthError('')
                  setAuthSuccess('')
                }}
                className="text-xs font-bold text-gray-600 hover:text-emerald-700 transition-colors"
              >
                {isRegisterMode ? (
                  <span>
                    Already have an account? <strong className="text-emerald-600 underline">Sign In</strong>
                  </span>
                ) : (
                  <span>
                    New customer on FoodLo? <strong className="text-emerald-600 underline">Create Account</strong>
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* CASE 2: USER IS LOGGED IN (FULL CUSTOMER PROFILE)         */
          /* ========================================================= */
          <div className="space-y-6">
            {/* Customer Profile Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-gray-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  {user.full_name?.slice(0, 2).toUpperCase() || 'CU'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-gray-900 truncate">
                      {user.full_name || 'Customer'}
                    </h2>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                      FoodLo Diner
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    {user.phone || '+91 99000 12345'}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-500" />
                    <span>Sagwara, Rajasthan</span>
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-600 border border-gray-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all tap-feedback cursor-pointer shrink-0"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl overflow-x-auto">
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Orders ({orders.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('payments')}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'payments'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Payments</span>
              </button>

              <button
                onClick={() => setActiveTab('addresses')}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'addresses'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Addresses ({addresses.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('support')}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'support'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Support</span>
              </button>
            </div>

            {/* TAB CONTENT 1: MY ORDERS */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-900">Recent Food Orders</h3>
                  <span className="text-xs text-gray-500">{orders.length} total</span>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-gray-800">No orders placed yet</p>
                    <p className="text-xs text-gray-500">
                      Explore cafes and order fresh food right to your doorstep in Sagwara!
                    </p>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs hover:bg-emerald-700 transition-colors"
                    >
                      Browse Cafes
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-gray-900">
                              #{order.order_number}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                order.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800 animate-pulse'
                              }`}
                            >
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <span className="text-xs font-black text-gray-900">
                            ₹{order.total_amount_inr}
                          </span>
                        </div>

                        {/* Order Items summary */}
                        <div className="text-xs text-gray-600 divide-y divide-gray-50">
                          {order.items?.map((it, idx) => (
                            <div key={idx} className="py-1 flex justify-between">
                              <span>
                                {it.quantity}x {it.name}
                              </span>
                              <span className="text-gray-400">₹{it.price_inr * it.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {/* Date and Track Action */}
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <span>Track &amp; View Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: PAYMENT HISTORY */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-900">Payment &amp; Transaction History</h3>
                  <span className="text-xs text-gray-500">Direct UPI / Cash</span>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 space-y-2">
                    <Receipt className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-xs text-gray-500">No payment transactions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                            <Receipt className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-gray-900">
                              Order #{order.order_number}
                            </h4>
                            <p className="text-[11px] text-gray-500">
                              Method: {order.payment_method?.toUpperCase() || 'UPI'} •{' '}
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-gray-900 block">
                            ₹{order.total_amount_inr}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            {order.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: ADDRESSES */}
            {activeTab === 'addresses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Saved Delivery Addresses</h3>
                    <p className="text-[11px] text-gray-500">
                      Manage your home, hostel, work, and family addresses in Sagwara
                    </p>
                  </div>
                  {!isEditingAddress && (
                    <button
                      onClick={handleStartAdd}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all tap-feedback cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New</span>
                    </button>
                  )}
                </div>

                {/* Inline Add / Edit Address Form */}
                {isEditingAddress && (
                  <form
                    onSubmit={handleSaveAddress}
                    className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-5 space-y-4 animate-fadeIn"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">
                        {editingAddressId ? 'Edit Address' : 'Add New Address'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingAddress(false)
                          setEditingAddressId(null)
                        }}
                        className="text-xs font-bold text-gray-500 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>

                    {addrError && (
                      <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200">
                        {addrError}
                      </p>
                    )}
                    {addrSuccess && (
                      <p className="text-xs text-emerald-800 bg-emerald-100 p-2 rounded-xl">
                        {addrSuccess}
                      </p>
                    )}

                    {/* Label Chips */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Address Label
                      </label>
                      <div className="flex gap-2">
                        {(['Home', 'Work', 'Hostel', 'Other'] as const).map((lbl) => (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => setAddrLabel(lbl)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              addrLabel === lbl
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Recipient Name *
                        </label>
                        <input
                          type="text"
                          value={addrRecipient}
                          onChange={(e) => setAddrRecipient(e.target.value)}
                          placeholder="Recipient Name"
                          className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={addrPhone}
                          onChange={(e) => setAddrPhone(e.target.value)}
                          placeholder="+91 99000 12345"
                          className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          House / Flat No *
                        </label>
                        <input
                          type="text"
                          value={addrFlat}
                          onChange={(e) => setAddrFlat(e.target.value)}
                          placeholder="e.g. House No. 42"
                          className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Building / Society
                        </label>
                        <input
                          type="text"
                          value={addrBuilding}
                          onChange={(e) => setAddrBuilding(e.target.value)}
                          placeholder="e.g. Punarvas Colony"
                          className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Street / Area in Sagwara *
                      </label>
                      <input
                        type="text"
                        value={addrStreet}
                        onChange={(e) => setAddrStreet(e.target.value)}
                        placeholder="e.g. Near Keval Kirana, Dungarpur Road"
                        className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Nearby Landmark (Optional)
                      </label>
                      <input
                        type="text"
                        value={addrLandmark}
                        onChange={(e) => setAddrLandmark(e.target.value)}
                        placeholder="e.g. Near Reliance Smart Mall"
                        className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={addrIsDefault}
                        onChange={(e) => setAddrIsDefault(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>Set as Default Delivery Address</span>
                    </label>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingAddress(false)
                          setEditingAddressId(null)
                        }}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Addresses List */}
                <div className="space-y-3">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id
                    return (
                      <div
                        key={addr.id}
                        className={`bg-white rounded-2xl p-4 border transition-all ${
                          isSelected
                            ? 'border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                              {addr.label === 'Home' ? '🏠' : addr.label === 'Work' ? '💼' : '📍'}
                            </span>
                            <span className="text-xs font-black text-gray-900">{addr.label}</span>
                            {addr.is_default && (
                              <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[9px] font-black uppercase bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Active for Cart
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(addr)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-50 transition-colors"
                              title="Edit Address"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-50 transition-colors"
                              title="Delete Address"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Address Details */}
                        <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                          <p className="font-bold text-gray-900">
                            {addr.recipient_name} • {addr.phone}
                          </p>
                          <p>
                            {addr.flat_house_no}, {addr.building_name && `${addr.building_name}, `}
                            {addr.area_street}
                          </p>
                          {addr.landmark && (
                            <p className="text-gray-500">Landmark: {addr.landmark}</p>
                          )}
                          <p className="text-[11px] text-emerald-700 font-medium">
                            {addr.city} • PIN {addr.postal_code}
                          </p>
                        </div>

                        {/* Set Active Button */}
                        {!isSelected && (
                          <div className="mt-3 pt-2.5 border-t border-gray-100 flex justify-end">
                            <button
                              onClick={() => handleSelectActiveAddress(addr.id)}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                            >
                              <span>Use for Deliveries</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: HELP & SUPPORT */}
            {activeTab === 'support' && (
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-gray-900">
                    FoodLo Sagwara Customer Care
                  </h3>
                  <p className="text-xs text-gray-500">
                    Need help with an ongoing order, delivery delay, or login PIN? We are available on WhatsApp!
                  </p>
                </div>

                <a
                  href={`https://wa.me/${paymentConfig.supportWhatsApp}?text=${encodeURIComponent(
                    `Hello FoodLo Support, I need assistance with my account/order. Mobile: ${user.phone}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-sm py-3 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 tap-feedback transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Chat on WhatsApp (+91 {paymentConfig.supportWhatsApp?.slice(-10)})</span>
                </a>

                <div className="bg-gray-50 rounded-2xl p-3.5 text-xs text-gray-600 space-y-1">
                  <p className="font-bold text-gray-900">Support Hours:</p>
                  <p>Daily: 10:00 AM – 11:00 PM (Matching Sagwara cafe kitchen hours)</p>
                  <p>Helpline: {paymentConfig.supportPhone || '+91 9351956481'}</p>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* CLEAN BIFURCATION FOOTER: PARTNER ACCESS                   */}
            {/* ========================================================= */}
            <div className="pt-6 border-t border-gray-200 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 text-center">
                FoodLo Partner Portals
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cafe Owner Portal */}
                <Link
                  href="/merchant"
                  className="p-3 bg-white hover:bg-emerald-50/50 border border-gray-200 hover:border-emerald-200 rounded-2xl flex items-center justify-between transition-all tap-feedback group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 group-hover:text-emerald-700">
                        Cafe Owner POS
                      </h4>
                      <p className="text-[10px] text-gray-400">Kitchen &amp; Order Dashboard</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
                </Link>

                {/* Rider App */}
                <Link
                  href="/rider"
                  className="p-3 bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-200 rounded-2xl flex items-center justify-between transition-all tap-feedback group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-700">
                        Student Rider App
                      </h4>
                      <p className="text-[10px] text-gray-400">Delivery &amp; Courier Jobs</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
