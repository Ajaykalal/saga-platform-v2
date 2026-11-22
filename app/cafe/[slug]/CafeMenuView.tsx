'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import {
  Star,
  Clock,
  MapPin,
  Search,
  Plus,
  Minus,
  ArrowLeft,
  Info,
} from 'lucide-react'
import { useCart } from '@/lib/context/CartContext'
import type { Cafe, MenuItem } from '@/lib/supabase/types'

interface CafeMenuViewProps {
  cafe: Cafe
  menuItems: MenuItem[]
}

export default function CafeMenuView({ cafe, menuItems }: CafeMenuViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const { addItem, updateQuantity, getItemQuantity } = useCart()

  // Extract unique categories available in this cafe's menu
  const cafeCategories = useMemo(() => {
    const set = new Set<string>()
    menuItems.forEach((item) => set.add(item.category))
    return ['All', ...Array.from(set)]
  }, [menuItems])

  // Filter items by category & search
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat =
        selectedCategory === 'All' ||
        item.category.toLowerCase() === selectedCategory.toLowerCase()
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCat && matchSearch
    })
  }, [menuItems, selectedCategory, searchQuery])

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-16">
      {/* Top App Bar */}
      <Navbar
        cafeName={cafe.name}
        deliveryTime={cafe.delivery_time_min}
        isOpen={cafe.is_open}
        showBack={true}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Cafe Banner Header (Matching Stitch menu_screen header aesthetic) */}
        <section className="bg-white rounded-3xl overflow-hidden border border-gray-200/80 shadow-xs">
          <div className="relative h-48 sm:h-64 w-full bg-gray-100">
            <img
              src={cafe.banner_url || ''}
              alt={cafe.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Back link floating on banner */}
            <Link
              href="/"
              className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-gray-800 hover:bg-white transition-all tap-feedback"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Floating Open Status */}
            <div className="absolute top-4 right-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md flex items-center gap-1.5 ${
                  cafe.is_open
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-900/80 text-gray-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    cafe.is_open ? 'bg-white animate-pulse' : 'bg-gray-400'
                  }`}
                />
                {cafe.is_open ? 'Open Now • 25 min' : 'Closed'}
              </span>
            </div>

            {/* Banner bottom details */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight drop-shadow-xs">
                {cafe.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-200 drop-shadow-xs mt-0.5 line-clamp-1">
                {cafe.tagline}
              </p>
            </div>
          </div>

          {/* Metadata bar */}
          <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-gray-100">
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-1 text-gray-900 font-bold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{cafe.rating.toFixed(1)}</span>
                <span className="text-gray-400 font-normal">
                  ({cafe.rating_count}+ reviews)
                </span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1 text-gray-600 font-medium">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{cafe.delivery_time_min} mins delivery</span>
              </div>
              <span className="text-gray-300 hidden sm:inline">•</span>
              <div className="text-gray-500 hidden sm:inline">
                Min Order ₹{cafe.min_order_amount_inr || 200}
              </div>
            </div>

            <div className="text-gray-500 flex items-center gap-1 text-[11px] truncate max-w-xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">{cafe.address}</span>
            </div>
          </div>
        </section>

        {/* Search within menu & Category Tabs (Matching Stitch menu_screen line 130) */}
        <section className="sticky top-16 z-30 bg-[#F9FAFB]/95 backdrop-blur-md pt-2 pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 space-y-3">
          {/* Menu Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${cafe.name}...`}
              className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
            />
          </div>

          {/* Sticky Category Tabs */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar min-w-full">
            {cafeCategories.map((cat) => {
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase()
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all tap-feedback cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </section>

        {/* Menu Items Grid (Matching Stitch menu_screen line 151) */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">
              {selectedCategory === 'All' ? 'Full Menu' : `${selectedCategory} Dishes`}
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              {filteredItems.length} dishes
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-200">
              <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No dishes found</p>
              <p className="text-xs text-gray-400 mt-1">
                Try searching for another keyword or change category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const qty = getItemQuantity(item.id)

                return (
                  <article
                    key={item.id}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between group"
                  >
                    {/* Item Image with Veg Badge */}
                    <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                      />

                      {/* Veg indicator dot (Matching Stitch line 156) */}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs p-1 rounded-sm border border-emerald-500/20 shadow-xs">
                        <div
                          className={`w-3 h-3 rounded-full ring-2 ring-white ${
                            item.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        />
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="absolute top-3 left-3 flex gap-1">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-emerald-900/80 backdrop-blur-xs text-emerald-100 text-[10px] font-bold rounded-md"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-base font-extrabold text-gray-900 group-hover:text-emerald-700 transition-colors">
                            {item.name}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Price & Interactive Cart Stepper (Matching Stitch menu_screen line 169) */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-base font-black text-emerald-700">
                            ₹{item.price_inr}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Prep: ~{item.preparation_time_min} mins
                          </span>
                        </div>

                        <div className="min-w-[90px]">
                          {qty === 0 ? (
                            <button
                              onClick={() =>
                                addItem(item, {
                                  id: cafe.id,
                                  name: cafe.name,
                                  slug: cafe.slug,
                                })
                              }
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs tap-feedback flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              ADD
                            </button>
                          ) : (
                            <div className="flex items-center justify-between bg-emerald-600 text-white rounded-xl px-2 py-1 shadow-xs">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-7 h-7 flex items-center justify-center font-bold text-sm tap-feedback cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2 text-xs font-extrabold">{qty}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-7 h-7 flex items-center justify-center font-bold text-sm tap-feedback cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
