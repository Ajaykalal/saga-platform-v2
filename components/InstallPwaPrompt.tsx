'use client'

import React, { useState, useEffect } from 'react'
import { Download, X, Share2, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react'

const DISMISS_KEY = 'foodlo_install_prompt_dismissed_v1'
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000 // 3 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)

  useEffect(() => {
    // 1. Check if app is already running in standalone PWA mode
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true
      return isStandaloneMedia || isIOSStandalone
    }

    if (checkStandalone()) {
      setIsInstalled(true)
      return
    }

    // 2. Detect iOS / iPadOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream
    setIsIOS(isIosDevice)

    // 3. Check if user dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const timeSinceDismiss = Date.now() - parseInt(dismissedAt, 10)
      if (timeSinceDismiss < DISMISS_DURATION_MS) {
        return
      }
    }

    // 4. Capture native Android / Chrome beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Delay showing prompt slightly (2.5 seconds) for natural user experience
      setTimeout(() => {
        setShowPrompt(true)
      }, 2500)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // 5. For iOS Safari, show prompt after 4 seconds if not dismissed
    if (isIosDevice) {
      const iosTimer = setTimeout(() => {
        setShowPrompt(true)
      }, 4000)
      return () => {
        clearTimeout(iosTimer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      }
    }

    // Custom event listener so any button in the app can open the install prompt
    const handleManualOpen = () => setShowPrompt(true)
    window.addEventListener('foodlo:open-install-prompt', handleManualOpen)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('foodlo:open-install-prompt', handleManualOpen)
    }
  }, [])

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstallSuccess(true)
        setTimeout(() => {
          setShowPrompt(false)
          setIsInstalled(true)
        }, 2000)
      } else {
        handleDismiss()
      }
    } catch (err) {
      console.warn('[FoodLo PWA] Install prompt error:', err)
      handleDismiss()
    }
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-emerald-100 animate-slideUp relative overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          aria-label="Close install prompt"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors tap-feedback cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {installSuccess ? (
          /* Success Screen */
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-lg font-black text-gray-900">FoodLo App Installed!</h3>
            <p className="text-xs text-gray-600">
              FoodLo has been added to your Home Screen. You can now open it anytime with 1-tap!
            </p>
          </div>
        ) : (
          /* Main Install Prompt Content */
          <div className="space-y-4">
            {/* Header: FoodLo Logo & Title */}
            <div className="flex items-center gap-3.5 pr-6">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-md shrink-0 flex items-center justify-center text-white">
                <div className="w-full h-full rounded-2xl bg-emerald-600 flex flex-col items-center justify-center font-black">
                  <span className="text-base tracking-tighter">Food</span>
                  <span className="text-[10px] -mt-1 text-emerald-200 font-extrabold">LO</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-black text-gray-900 leading-tight">
                    Install FoodLo App
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> PWA
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sagwara’s Local Food Delivery
                </p>
              </div>
            </div>

            {/* Benefit Highlights */}
            <div className="bg-emerald-50/80 rounded-2xl p-3 border border-emerald-100/80 text-xs text-gray-700 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>1-Tap Instant Ordering:</strong> No need to search on browser</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Live Order Tracking:</strong> Real-time rider ETA on your home screen</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Zero Storage:</strong> Ultra-lightweight & lightning fast</span>
              </div>
            </div>

            {/* Android / Desktop Install Action */}
            {!isIOS ? (
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 tap-feedback transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Add to Home Screen (Free)</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full text-center text-xs font-semibold text-gray-400 hover:text-gray-600 py-1 transition-colors"
                >
                  Maybe later
                </button>
              </div>
            ) : (
              /* iOS Step-by-Step Instructions */
              <div className="space-y-3 pt-1">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-left space-y-2.5">
                  <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span>📲</span> Follow these 2 steps in Safari:
                  </p>
                  <div className="flex items-start gap-2.5 text-xs text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <span className="flex-1">
                      Tap the <strong className="text-gray-900 inline-flex items-center gap-0.5"><Share2 className="w-3.5 h-3.5 text-blue-500 inline" /> Share</strong> button at the bottom of your Safari screen.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <span className="flex-1">
                      Scroll down and tap <strong className="text-gray-900 inline-flex items-center gap-0.5"><PlusSquare className="w-3.5 h-3.5 text-gray-800 inline" /> Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-2.5 px-4 rounded-xl shadow-md tap-feedback transition-all cursor-pointer"
                >
                  Got It!
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
