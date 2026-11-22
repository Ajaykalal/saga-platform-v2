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
  Shield,
  KeyRound,
} from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'

export default function LoginPage() {
  const { loginWithEmail, loginWithPhoneOtp, loginAsDemoRole } = useAuth()

  const [authMethod, setAuthMethod] = useState<'otp' | 'email' | 'demo'>('otp')
  const [phoneNumber, setPhoneNumber] = useState('+91 99000 12345')
  const [fullName, setFullName] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [email, setEmail] = useState('owner.koramangala@sagacafe.in')
  const [password, setPassword] = useState('••••••••')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile or WhatsApp number')
      return
    }
    setErrorMsg('')
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setOtpSent(true)
      setOtpCode('1234') // Default fast OTP
    }, 500)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length < 4) {
      setErrorMsg('Please enter the 4-digit verification code')
      return
    }
    setErrorMsg('')
    setIsLoading(true)
    const success = await loginWithPhoneOtp(phoneNumber, otpCode, fullName)
    setIsLoading(false)
    if (!success) {
      setErrorMsg('Invalid verification code. Try again.')
    }
  }

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

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Ambient decorative blurs matching Stitch aesthetic */}
      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-md mb-2 tap-feedback">
            <Utensils className="w-7 h-7" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            FoodLo Platform
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Sign in to access Customer, Merchant, Rider & Admin portals
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-[0px_4px_25px_rgba(0,0,0,0.06)] space-y-6">
          {/* Method Tabs */}
          <div className="grid grid-cols-3 bg-gray-100/80 p-1 rounded-2xl text-xs font-bold text-gray-600">
            <button
              onClick={() => { setAuthMethod('otp'); setErrorMsg('') }}
              className={`py-2 rounded-xl transition-all tap-feedback cursor-pointer ${
                authMethod === 'otp' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-gray-900'
              }`}
            >
              Phone / OTP
            </button>
            <button
              onClick={() => { setAuthMethod('email'); setErrorMsg('') }}
              className={`py-2 rounded-xl transition-all tap-feedback cursor-pointer ${
                authMethod === 'email' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-gray-900'
              }`}
            >
              Email Sign-In
            </button>
            <button
              onClick={() => { setAuthMethod('demo'); setErrorMsg('') }}
              className={`py-2 rounded-xl transition-all tap-feedback cursor-pointer ${
                authMethod === 'demo' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:text-emerald-700'
              }`}
            >
              1-Click Demo
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {errorMsg}
            </div>
          )}

          {/* TAB 1: Phone / WhatsApp OTP */}
          {authMethod === 'otp' && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  {/* Signup Name for new user */}
                  {isNewUser && (
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
                          required={isNewUser}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Mobile / WhatsApp Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+91 99000 12345"
                        className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        required
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400">Instant OTP auto-login</span>
                      <button
                        type="button"
                        onClick={() => setIsNewUser(!isNewUser)}
                        className="text-emerald-600 font-bold hover:underline cursor-pointer"
                      >
                        {isNewUser ? 'Already have account? Sign in' : '+ New Customer? Register'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-full shadow-md flex items-center justify-center gap-2 transition-all tap-feedback cursor-pointer disabled:opacity-60"
                  >
                    <span>{isLoading ? 'Sending Code...' : isNewUser ? 'Register with OTP' : 'Sign In with OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        Enter 4-Digit OTP
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-[11px] text-emerald-600 hover:underline font-semibold"
                      >
                        Change Number
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="1234"
                        className="w-full h-12 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold tracking-widest text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-emerald-600 font-medium">
                      Demo auto-fill: Use &apos;1234&apos; to continue.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-full shadow-md flex items-center justify-center gap-2 transition-all tap-feedback cursor-pointer disabled:opacity-60"
                  >
                    <span>{isLoading ? 'Verifying...' : 'Verify & Continue'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: Email Sign In */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@sagacafe.in"
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
                <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 3: 1-Click Demo Role Switcher */}
          {authMethod === 'demo' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Click any pre-configured role to immediately test its dedicated interface and features:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Customer */}
                <button
                  type="button"
                  onClick={() => loginAsDemoRole('customer')}
                  className="w-full p-3 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-2xl flex items-center justify-between text-left transition-all tap-feedback cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 group-hover:text-emerald-700">
                        Customer Storefront (/)
                      </h4>
                      <p className="text-[11px] text-gray-500">Arjun Nair • Cart & Multi-Cafe</p>
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
                      <p className="text-[11px] text-emerald-700">Rohan Mehta • Koramangala Kitchen</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-600" />
                </button>

                {/* Student Rider */}
                <button
                  type="button"
                  onClick={() => loginAsDemoRole('rider')}
                  className="w-full p-3 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 rounded-2xl flex items-center justify-between text-left transition-all tap-feedback cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 group-hover:text-amber-800">
                        Student Rider App (/rider)
                      </h4>
                      <p className="text-[11px] text-gray-500">Vikram Singh • Active Delivery Drops</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600" />
                </button>

                {/* Super Admin */}
                <button
                  type="button"
                  onClick={() => loginAsDemoRole('admin')}
                  className="w-full p-3 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-2xl flex items-center justify-between text-left transition-all tap-feedback cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 group-hover:text-purple-800">
                        Super Admin Panel (/admin)
                      </h4>
                      <p className="text-[11px] text-gray-500">Central Ops • KYC & Escrow Release</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600" />
                </button>
              </div>
            </div>
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
            className="text-xs font-semibold text-gray-500 hover:text-emerald-700 transition-colors"
          >
            ← Back to Customer Storefront
          </Link>
        </div>
      </main>
    </div>
  )
}
