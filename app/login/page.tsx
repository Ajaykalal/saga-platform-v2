'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Utensils,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Store,
  Bike,
  User,
  Eye,
  EyeOff,
  MessageCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'

export default function LoginPage() {
  const {
    loginWithEmail,
    loginWithPhonePin,
    registerWithPhonePin,
    loginAsDemoRole,
    isPhoneRegistered,
  } = useAuth()

  const [authMethod, setAuthMethod] = useState<'pin' | 'demo' | 'email'>('pin')
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('9900012345')
  const [fullName, setFullName] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [email, setEmail] = useState('owner.sagwara@foodlo.in')
  const [password, setPassword] = useState('••••••••')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Handle Phone + PIN submit
  const handlePhonePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setIsLoading(true)

    try {
      if (isRegisterMode) {
        const result = await registerWithPhonePin(fullName, phoneNumber, pin)
        if (!result.success) {
          setErrorMsg(result.message || 'Registration failed')
        } else {
          setSuccessMsg('Account created! Logging in...')
        }
      } else {
        const result = await loginWithPhonePin(phoneNumber, pin)
        if (!result.success) {
          setErrorMsg(result.message || 'Login failed')
        } else {
          setSuccessMsg('PIN verified! Welcome back...')
        }
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Email Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address')
      return
    }
    setErrorMsg('')
    setIsLoading(true)
    const success = await loginWithEmail(email)
    setIsLoading(false)
    if (!success) {
      setErrorMsg('Unable to sign in. Please verify your credentials.')
    }
  }

  const cleanNum = phoneNumber.replace(/\D/g, '')
  const isExistingNumber = cleanNum.length >= 10 && isPhoneRegistered(cleanNum)

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Ambient decorative blurs */}
      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-md mb-2 tap-feedback hover:bg-emerald-700 transition-colors"
          >
            <Utensils className="w-7 h-7" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            FoodLo Platform
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Sagwara&apos;s Local Food Delivery &amp; Multi-Storefront Network
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-[0px_4px_25px_rgba(0,0,0,0.06)] space-y-6">
          {/* Method Tabs */}
          <div className="grid grid-cols-3 bg-gray-100/80 p-1 rounded-2xl text-xs font-bold text-gray-600">
            <button
              onClick={() => {
                setAuthMethod('pin')
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className={`py-2 rounded-xl transition-all tap-feedback cursor-pointer ${
                authMethod === 'pin' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-gray-900'
              }`}
            >
              Phone &amp; PIN
            </button>
            <button
              onClick={() => {
                setAuthMethod('demo')
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className={`py-2 rounded-xl transition-all tap-feedback cursor-pointer ${
                authMethod === 'demo' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:text-emerald-700'
              }`}
            >
              1-Click Demo
            </button>
            <button
              onClick={() => {
                setAuthMethod('email')
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className={`py-2 rounded-xl transition-all tap-feedback cursor-pointer ${
                authMethod === 'email' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-gray-900'
              }`}
            >
              Staff Email
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Phone + Security PIN (Frictionless, 100% Free, Zero SMS Hassle) */}
          {authMethod === 'pin' && (
            <div className="space-y-4">
              {/* Mode Switcher Pill */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false)
                    setErrorMsg('')
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    !isRegisterMode
                      ? 'bg-white text-emerald-800 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true)
                    setErrorMsg('')
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    isRegisterMode
                      ? 'bg-white text-emerald-800 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  New Customer Sign-Up
                </button>
              </div>

              <form onSubmit={handlePhonePinSubmit} className="space-y-4">
                {/* Full Name for New Customer Registration */}
                {isRegisterMode && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Ajay Kalal"
                        className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        required={isRegisterMode}
                      />
                    </div>
                  </div>
                )}

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      10-Digit Mobile Number
                    </label>
                    {cleanNum.length === 10 && (
                      <span className={`text-[10px] font-bold ${isExistingNumber ? 'text-emerald-700' : 'text-blue-600'}`}>
                        {isExistingNumber ? '✓ Registered Account' : '★ New Number'}
                      </span>
                    )}
                  </div>
                  <div className="relative flex">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-100 text-gray-600 font-bold text-xs">
                      +91
                    </span>
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="98294 35386"
                        className="w-full h-12 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-r-xl text-sm font-bold tracking-wide focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 4-Digit Security PIN */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      {isRegisterMode ? 'Create 4-Digit Security PIN' : 'Enter 4-Digit Security PIN'}
                    </label>
                    {!isRegisterMode && (
                      <a
                        href={`https://wa.me/919900012345?text=Hello%20FoodLo%20Support,%20I%20forgot%20my%20account%20PIN%20for%20mobile%20+91${cleanNum}.%20Please%20help%20me%20reset%20it.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>Forgot PIN?</span>
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder={isRegisterMode ? 'e.g. 4829' : 'Enter 4 digits'}
                      className="w-full h-12 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      title={showPin ? 'Hide PIN' : 'Show PIN'}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {isRegisterMode
                      ? '🔒 Your PIN is saved safely. Next time, just enter your phone number and PIN.'
                      : 'Demo auto-pass: Enter 1234 or your registered PIN.'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-full shadow-md flex items-center justify-center gap-2 transition-all tap-feedback cursor-pointer disabled:opacity-60"
                >
                  <span>
                    {isLoading
                      ? 'Verifying...'
                      : isRegisterMode
                      ? 'Create Account & Start Ordering'
                      : 'Sign In to FoodLo'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: 1-Click Demo Profiles */}
          {authMethod === 'demo' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-2">
                Fast-track demo portals across the FoodLo multi-cafe ecosystem:
              </p>

              {/* Customer */}
              <button
                type="button"
                onClick={() => loginAsDemoRole('customer')}
                className="w-full p-3 bg-gray-50 hover:bg-emerald-50/50 border border-gray-200 hover:border-emerald-200 rounded-2xl flex items-center justify-between text-left transition-all tap-feedback cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      Customer Storefront (/)
                    </h4>
                    <p className="text-[11px] text-gray-500">Arjun Nair • Sagwara Local Food Delivery</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
              </button>

              {/* Cafe Owner */}
              <button
                type="button"
                onClick={() => loginAsDemoRole('cafe_owner')}
                className="w-full p-3 bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200 rounded-2xl flex items-center justify-between text-left transition-all tap-feedback cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      Cafe Owner POS (/merchant)
                    </h4>
                    <p className="text-[11px] text-emerald-700">Rohan Mehta • Meesaavi Kitchen, Sagwara</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
              </button>

              {/* Student Rider */}
              <button
                type="button"
                onClick={() => loginAsDemoRole('rider')}
                className="w-full p-3 bg-gray-50 hover:bg-blue-50/50 border border-gray-200 hover:border-blue-200 rounded-2xl flex items-center justify-between text-left transition-all tap-feedback cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                      Student Rider App (/rider)
                    </h4>
                    <p className="text-[11px] text-gray-500">Vikram Singh • Sagwara Central Hub</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
              </button>

              {/* Platform Admin */}
              <button
                type="button"
                onClick={() => loginAsDemoRole('admin')}
                className="w-full p-3 bg-gray-50 hover:bg-purple-50/50 border border-gray-200 hover:border-purple-200 rounded-2xl flex items-center justify-between text-left transition-all tap-feedback cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                      Super Admin Control (/admin)
                    </h4>
                    <p className="text-[11px] text-gray-500">Chief Operator • Platform Settlement &amp; KYC</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600" />
              </button>
            </div>
          )}

          {/* TAB 3: Email Sign-In */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@foodlo.in"
                    className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-full shadow-md flex items-center justify-center gap-2 transition-all tap-feedback cursor-pointer disabled:opacity-60"
              >
                <span>{isLoading ? 'Authenticating...' : 'Sign In with Email'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Trust Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Secured by FoodLo Auth &amp; Supabase RLS</span>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-gray-500 hover:text-emerald-700 transition-colors inline-flex items-center gap-1"
          >
            ← Back to FoodLo Storefront
          </Link>
        </div>
      </main>
    </div>
  )
}
