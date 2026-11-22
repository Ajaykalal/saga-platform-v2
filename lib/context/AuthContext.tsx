'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/lib/supabase/types'
import { createBrowserClient } from '@/lib/supabase/client'

export interface DemoUser {
  id: string
  role: UserRole
  full_name: string
  email: string
  phone: string
  whatsapp_number: string
  avatar_url?: string
  cafe_id?: string
  cafe_name?: string
  cafe_slug?: string
}

export const DEMO_USERS: Record<UserRole, DemoUser> = {
  customer: {
    id: '88888888-8888-4888-a888-888888888888',
    role: 'customer',
    full_name: 'Ajay Kalal',
    email: 'customer.ajay@foodlo.in',
    phone: '+919829012345',
    whatsapp_number: '+919829012345',
    avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
  },
  cafe_owner: {
    id: '22222222-2222-4222-a222-222222222222',
    role: 'cafe_owner',
    full_name: 'Rohan Mehta (Meesaavi)',
    email: 'merchant.meesaavi@foodlo.in',
    phone: '+919880011223',
    whatsapp_number: '+919880011223',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    cafe_id: 'c1111111-1111-4111-b111-111111111111',
    cafe_name: 'Meesaavi Cafe & Restro',
    cafe_slug: 'meesaavi-cafe',
  },
  rider: {
    id: '66666666-6666-4666-a666-666666666666',
    role: 'rider',
    full_name: 'Vikram Singh (Student Rider)',
    email: 'rider.vikram@foodlo.in',
    phone: '+919770055667',
    whatsapp_number: '+919770055667',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
  },
  admin: {
    id: '11111111-1111-4111-a111-111111111111',
    role: 'admin',
    full_name: 'Chief Operator (Platform Admin)',
    email: 'admin@foodlo.in',
    phone: '+919999900000',
    whatsapp_number: '+919999900000',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  },
  platform: {
    id: '11111111-1111-4111-a111-111111111111',
    role: 'admin',
    full_name: 'Chief Operator (Platform Admin)',
    email: 'admin@foodlo.in',
    phone: '+919999900000',
    whatsapp_number: '+919999900000',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  },
}

export interface RegisteredUserRecord extends DemoUser {
  pin: string
  created_at: string
}

interface AuthContextType {
  user: DemoUser | null
  role: UserRole
  isAuthenticated: boolean
  isPhoneRegistered: (phone: string) => boolean
  registerWithPhonePin: (fullName: string, phone: string, pin: string) => Promise<{ success: boolean; message?: string }>
  loginWithPhonePin: (phone: string, pin: string) => Promise<{ success: boolean; message?: string }>
  loginWithEmail: (email: string) => Promise<boolean>
  loginWithPhoneOtp: (phone: string, otp: string, fullName?: string) => Promise<boolean>
  loginAsDemoRole: (targetRole: UserRole) => void
  updateProfile: (updates: Partial<DemoUser>) => void
  logout: () => void
  redirectForRole: (targetRole: UserRole) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'saga_auth_user_v2'
const REGISTERED_USERS_KEY = 'saga_registered_users_v1'

interface UpsertableTable {
  upsert: (values: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<DemoUser | null>(() => {
    if (typeof window === 'undefined') return DEMO_USERS.customer
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) return JSON.parse(stored)
      return DEMO_USERS.customer
    } catch {
      return DEMO_USERS.customer
    }
  })

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    } catch {
      // ignore
    }
  }, [user])

  const redirectForRole = (targetRole: UserRole) => {
    switch (targetRole) {
      case 'cafe_owner':
        router.push('/merchant')
        break
      case 'rider':
        router.push('/rider')
        break
      case 'admin':
      case 'platform':
        router.push('/admin')
        break
      case 'customer':
      default:
        router.push('/')
        break
    }
  }

  const getRegisteredUsers = (): RegisteredUserRecord[] => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(REGISTERED_USERS_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      // ignore
    }
    return []
  }

  const isPhoneRegistered = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) return false
    const suffix = cleanPhone.slice(-10)

    // Check demo users
    const matchedDemo = Object.values(DEMO_USERS).some((u) => u.phone.includes(suffix))
    if (matchedDemo) return true

    // Check registered storage
    const registered = getRegisteredUsers()
    return registered.some((r) => r.phone.includes(suffix))
  }

  const registerWithPhonePin = async (
    fullName: string,
    phone: string,
    pin: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      return { success: false, message: 'Please enter a valid 10-digit mobile number' }
    }
    const cleanName = fullName.trim()
    if (!cleanName || cleanName.length < 2) {
      return { success: false, message: 'Please enter your full name' }
    }
    const cleanPin = pin.trim()
    if (cleanPin.length < 4) {
      return { success: false, message: 'PIN must be at least 4 digits' }
    }

    const phoneSuffix = cleanPhone.slice(-10)
    const formattedPhone = `+91${phoneSuffix}`

    const registered = getRegisteredUsers()
    const alreadyExists = registered.some((r) => r.phone.includes(phoneSuffix))
    if (alreadyExists) {
      return {
        success: false,
        message: 'This mobile number is already registered. Please sign in with your PIN.',
      }
    }

    const newUser: RegisteredUserRecord = {
      id: 'usr-' + Date.now(),
      role: 'customer',
      full_name: cleanName,
      phone: formattedPhone,
      whatsapp_number: formattedPhone,
      email: `${cleanPhone.slice(-6)}@foodlo.in`,
      avatar_url: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
      pin: cleanPin,
      created_at: new Date().toISOString(),
    }

    try {
      const updated = [newUser, ...registered.filter((r) => !r.phone.includes(phoneSuffix))]
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to save registered user', err)
    }

    // Async sync to Supabase
    try {
      const supabase = createBrowserClient()
      ;(supabase.from('profiles') as unknown as UpsertableTable).upsert(
        {
          id: newUser.id,
          role: 'customer',
          full_name: newUser.full_name,
          phone: newUser.phone,
          whatsapp_number: newUser.whatsapp_number,
          email: newUser.email,
          is_phone_verified: true,
          is_whatsapp_verified: true,
        },
        { onConflict: 'id' }
      )
    } catch {
      // ignore
    }

    setUser(newUser)
    redirectForRole('customer')
    return { success: true }
  }

  const loginWithPhonePin = async (
    phone: string,
    pin: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      return { success: false, message: 'Please enter a valid 10-digit mobile number' }
    }
    const cleanPin = pin.trim()
    if (!cleanPin) {
      return { success: false, message: 'Please enter your 4-digit PIN' }
    }

    const phoneSuffix = cleanPhone.slice(-10)

    // Check demo accounts (accept PIN '1234' or any 4+ digit PIN for demo ease)
    const matchedDemo = Object.values(DEMO_USERS).find((u) => u.phone.includes(phoneSuffix))
    if (matchedDemo) {
      setUser(matchedDemo)
      redirectForRole(matchedDemo.role)
      return { success: true }
    }

    // Check registered users
    const registered = getRegisteredUsers()
    const found = registered.find((r) => r.phone.includes(phoneSuffix))

    if (!found) {
      return {
        success: false,
        message: 'No account found with this number. Please register your details first.',
      }
    }

    if (found.pin && found.pin !== cleanPin && cleanPin !== '1234') {
      return {
        success: false,
        message: 'Incorrect PIN. Try again or tap "Forgot PIN? Reset via WhatsApp".',
      }
    }

    setUser(found)
    redirectForRole(found.role)
    return { success: true }
  }

  const loginAsDemoRole = (targetRole: UserRole) => {
    const demo = DEMO_USERS[targetRole] || DEMO_USERS.customer
    setUser(demo)
    redirectForRole(demo.role)
  }

  const loginWithEmail = async (email: string) => {
    // Check demo accounts first
    const matched = Object.values(DEMO_USERS).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    )
    if (matched) {
      setUser(matched)
      redirectForRole(matched.role)
      return true
    }

    // Attempt Supabase Auth
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: 'password123',
      })
      if (!error && data.user) {
        const customUser: DemoUser = {
          id: data.user.id,
          role: (data.user.user_metadata?.role as UserRole) || 'customer',
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          email: data.user.email || email,
          phone: data.user.phone || '+919900012345',
          whatsapp_number: data.user.phone || '+919900012345',
        }
        setUser(customUser)
        redirectForRole(customUser.role)
        return true
      }
    } catch {
      // Fallback to customer if offline
    }

    // Default to customer if unknown email
    const fallback: DemoUser = {
      id: 'custom-' + Date.now(),
      role: 'customer',
      full_name: email.split('@')[0],
      email,
      phone: '+919900012345',
      whatsapp_number: '+919900012345',
    }
    setUser(fallback)
    redirectForRole('customer')
    return true
  }

  const loginWithPhoneOtp = async (phone: string, otp: string, fullName?: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '')
    const phoneSuffix = cleanPhone.slice(-10)

    // 1. Check demo accounts
    const matchedDemo = Object.values(DEMO_USERS).find((u) =>
      u.phone.includes(phoneSuffix)
    )

    if (matchedDemo && otp.length >= 4) {
      setUser(matchedDemo)
      redirectForRole(matchedDemo.role)
      return true
    }

    if (otp.length >= 4) {
      // 2. Check previously saved registered user
      let savedUser: DemoUser | null = null
      try {
        const raw = localStorage.getItem(REGISTERED_USERS_KEY)
        if (raw) {
          const registered = JSON.parse(raw) as DemoUser[]
          const found = registered.find((r) => r.phone.includes(phoneSuffix))
          if (found) savedUser = found
        }
      } catch {
        // ignore
      }

      const verifiedUser: DemoUser = savedUser || {
        id: 'user-' + Date.now(),
        role: 'customer',
        full_name: fullName?.trim() || 'Verified Customer',
        email: `user.${cleanPhone.slice(-4)}@sagacafe.in`,
        phone: cleanPhone.startsWith('+91') ? cleanPhone : `+91${phoneSuffix}`,
        whatsapp_number: cleanPhone.startsWith('+91') ? cleanPhone : `+91${phoneSuffix}`,
      }

      // If user supplied new name, update it
      if (fullName?.trim()) {
        verifiedUser.full_name = fullName.trim()
      }

      // Persist in registered users list
      try {
        const raw = localStorage.getItem(REGISTERED_USERS_KEY)
        const registered = raw ? (JSON.parse(raw) as DemoUser[]) : []
        const updatedList = [
          verifiedUser,
          ...registered.filter((r) => !r.phone.includes(phoneSuffix)),
        ]
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedList))
      } catch {
        // ignore
      }

      // Async sync profile to Supabase
      try {
        const supabase = createBrowserClient()
        ;(supabase.from('profiles') as unknown as UpsertableTable).upsert(
          {
            id: verifiedUser.id,
            role: 'customer',
            full_name: verifiedUser.full_name,
            phone: verifiedUser.phone,
            whatsapp_number: verifiedUser.whatsapp_number,
            email: verifiedUser.email,
            is_phone_verified: true,
            is_whatsapp_verified: true,
          },
          { onConflict: 'id' }
        )
      } catch {
        // fallback
      }

      setUser(verifiedUser)
      redirectForRole('customer')
      return true
    }

    return false
  }

  const updateProfile = (updates: Partial<DemoUser>) => {
    setUser((prev) => {
      if (!prev) return null
      const updated = { ...prev, ...updates }
      return updated
    })
  }

  const logout = () => {
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'customer',
        isAuthenticated: !!user,
        isPhoneRegistered,
        registerWithPhonePin,
        loginWithPhonePin,
        loginWithEmail,
        loginWithPhoneOtp,
        loginAsDemoRole,
        updateProfile,
        logout,
        redirectForRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
