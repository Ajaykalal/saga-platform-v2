'use client'

import React, { useState, useEffect } from 'react'
import {
  MapPin,
  ExternalLink,
  Bike,
  Store,
  Layers,
  ZoomIn,
  ZoomOut,
  Compass,
} from 'lucide-react'

interface LiveDeliveryMapProps {
  cafeName: string
  cafeAddress?: string
  cafeCoordinates?: { lat: number; lng: number }
  customerAddress: string
  customerCoordinates?: { lat: number; lng: number }
  orderStatus: string
  riderName?: string
}

export default function LiveDeliveryMap({
  cafeName,
  cafeCoordinates = { lat: 12.934533, lng: 77.626579 }, // Koramangala 4th Block
  customerAddress,
  customerCoordinates = { lat: 12.9382, lng: 77.6195 }, // Koramangala 5th Block
  orderStatus,
  riderName = 'Vikram Singh (Student Courier)',
}: LiveDeliveryMapProps) {
  // Rider progress along the route (0 to 1)
  const [progress, setProgress] = useState<number>(() => {
    if (orderStatus === 'delivered') return 1.0
    if (orderStatus === 'out_for_delivery') return 0.65
    return 0.05
  })
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets')

  // Smooth movement animation simulating real-time GPS tracking when en route
  useEffect(() => {
    if (orderStatus !== 'out_for_delivery') return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 0.95) return 0.25 // Loop route simulation
        return Number((prev + 0.008).toFixed(4))
      })
    }, 800)

    return () => clearInterval(interval)
  }, [orderStatus])

  // Waypoints connecting Cafe -> Customer
  // Waypoint 0: Cafe (80ft Road)
  // Waypoint 1: 100ft Inner Ring Road turn
  // Waypoint 2: Sony World Signal
  // Waypoint 3: 5th Block Junction
  // Waypoint 4: Customer Residence
  const waypoints = [
    { x: 15, y: 78, name: cafeName, label: 'Cafe' },
    { x: 32, y: 62, name: '80 Feet Road' },
    { x: 48, y: 52, name: 'Sony World Junction' },
    { x: 68, y: 35, name: 'Koramangala 5th Block' },
    { x: 86, y: 22, name: customerAddress, label: 'Drop' },
  ]

  // Calculate current rider position along waypoints
  const getRiderPosition = (p: number) => {
    const totalSegments = waypoints.length - 1
    const scaled = p * totalSegments
    const segIndex = Math.min(Math.floor(scaled), totalSegments - 1)
    const segT = scaled - segIndex

    const p1 = waypoints[segIndex]
    const p2 = waypoints[segIndex + 1]

    return {
      x: p1.x + (p2.x - p1.x) * segT,
      y: p1.y + (p2.y - p1.y) * segT,
    }
  }

  const riderPos = getRiderPosition(progress)

  // Free Google Maps Direction URL (requires ZERO api keys or billing)
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${cafeCoordinates.lat},${cafeCoordinates.lng}&destination=${customerCoordinates.lat},${customerCoordinates.lng}&travelmode=two_wheeler`

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs relative">
      {/* Top Map Action Bar */}
      <div className="p-3 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-black text-slate-800 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-emerald-600" /> Live GPS Dispatch
          </span>
          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            {orderStatus === 'out_for_delivery'
              ? 'Rider En Route (~8 mins)'
              : orderStatus === 'delivered'
              ? 'Delivered'
              : 'Kitchen Prep'}
          </span>
        </div>

        {/* Free Google Maps Direct Navigation Link */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 shadow-2xs"
          title="Open directions in Google Maps free app"
        >
          <span>Open in Google Maps</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Interactive Map Visual Area */}
      <div
        className={`relative w-full h-64 select-none overflow-hidden transition-all duration-300 ${
          mapMode === 'satellite' ? 'bg-slate-900' : 'bg-[#F2F4F8]'
        }`}
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Street Grid Graphic Underlay */}
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id="grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke={mapMode === 'satellite' ? '#1E293B' : '#E2E8F0'}
                strokeWidth="0.5"
              />
            </pattern>
            {/* Emerald Gradient for Route */}
            <linearGradient id="routeGradient" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Grid Background */}
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Simulated Urban Road Network */}
          <line x1="0" y1="80" x2="100" y2="80" stroke="#CBD5E1" strokeWidth="2.5" />
          <line x1="15" y1="0" x2="15" y2="100" stroke="#CBD5E1" strokeWidth="2" />
          <line x1="48" y1="0" x2="48" y2="100" stroke="#CBD5E1" strokeWidth="2" />
          <line x1="86" y1="0" x2="86" y2="100" stroke="#CBD5E1" strokeWidth="2" />
          <line x1="0" y1="35" x2="100" y2="35" stroke="#CBD5E1" strokeWidth="1.8" />

          {/* Live Delivery Route Polyline */}
          <polyline
            points={waypoints.map((w) => `${w.x},${w.y}`).join(' ')}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="3 1.5"
            className="animate-pulse"
          />
        </svg>

        {/* 1. Cafe Location Pin */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-20"
          style={{ left: `${waypoints[0].x}%`, top: `${waypoints[0].y}%` }}
        >
          <div className="px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-black shadow-md whitespace-nowrap mb-1">
            {cafeName}
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-emerald-500/40">
            <Store className="w-4 h-4" />
          </div>
        </div>

        {/* 2. Customer Drop Pin */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-20"
          style={{
            left: `${waypoints[waypoints.length - 1].x}%`,
            top: `${waypoints[waypoints.length - 1].y}%`,
          }}
        >
          <div className="px-2 py-0.5 rounded-md bg-blue-700 text-white text-[10px] font-black shadow-md whitespace-nowrap mb-1">
            Drop Location
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-blue-500/40">
            <MapPin className="w-4 h-4" />
          </div>
        </div>

        {/* 3. Live Animated Student Rider Courier */}
        {orderStatus === 'out_for_delivery' && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 z-30 pointer-events-none"
            style={{ left: `${riderPos.x}%`, top: `${riderPos.y}%` }}
          >
            {/* Radar Pulsing Rings */}
            <span className="absolute -inset-3 rounded-full bg-emerald-500/20 animate-ping" />
            <span className="absolute -inset-1.5 rounded-full bg-emerald-500/30 animate-pulse" />

            {/* Rider Electric Bike Marker */}
            <div className="relative w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl border-2 border-white">
              <Bike className="w-5 h-5 animate-bounce" />
            </div>

            {/* Rider Info Floating Pill */}
            <div className="absolute left-1/2 -bottom-6 transform -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
              <span>{riderName.split(' ')[0]}</span>
              <span className="text-emerald-400 font-black">• 24 km/h</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Control Buttons (Overlay) */}
      <div className="absolute right-3 top-16 z-30 flex flex-col gap-1.5">
        <button
          onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.3))}
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50 cursor-pointer"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.9))}
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50 cursor-pointer"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoomLevel(1)
            setMapMode((m) => (m === 'streets' ? 'satellite' : 'streets'))
          }}
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50 cursor-pointer"
          aria-label="Toggle Map View"
          title="Toggle view"
        >
          <Layers className="w-4 h-4 text-emerald-600" />
        </button>
      </div>

      {/* Bottom Dispatch Route Details */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
            <Bike className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 block leading-tight">
              {riderName}
            </span>
            <span className="text-[11px] text-slate-500">
              Hero Electric Scooter • Eco-Dispatch (Zero Emissions)
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-emerald-700 font-black text-sm block">1.2 km</span>
          <span className="text-[10px] text-slate-400">~8 min arrival</span>
        </div>
      </div>
    </div>
  )
}
