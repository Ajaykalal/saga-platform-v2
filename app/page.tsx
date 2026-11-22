'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import {
  Search,
  Star,
  Clock,
  MapPin,
  ChevronRight,
  Plus,
  Sparkles,
  Flame,
} from 'lucide-react'
import { SEED_CAFES, SEED_MENU_ITEMS, CATEGORIES } from '@/lib/data/mockData'
import { useCart } from '@/lib/context/CartContext'
import type { MenuItem } from '@/lib/supabase/types'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const { addItem, getItemQuantity, updateQuantity } = useCart()

  // Filter menu items by search & category
  const filteredMenuItems = useMemo(() => {
    return SEED_MENU_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase()
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery])

  // Filter cafes by search query
  const filteredCafes = useMemo(() => {
    if (!searchQuery) return SEED_CAFES
    return SEED_CAFES.filter(
      (cafe) =>
        cafe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cafe.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cafe.address.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery])

  // Best Sellers selection
  const bestSellers = useMemo(() => {
    return SEED_MENU_ITEMS.filter((item) => item.tags.includes('Bestseller')).slice(0, 5)
  }, [])

  const handleAddBestSeller = (item: MenuItem) => {
    const cafe = SEED_CAFES.find((c) => c.id === item.cafe_id) || SEED_CAFES[0]
    addItem(item, { id: cafe.id, name: cafe.name, slug: cafe.slug })
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Top Navbar */}
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-12 space-y-7">
        {/* Hero Banner Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 text-white p-6 sm:p-8 shadow-md">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl transform translate-x-20 -translate-y-20 pointer-events-none" />
          <div className="relative z-10 max-w-lg space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md text-emerald-200 text-xs font-semibold rounded-full border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              SAGA Multi-Cafe Delivery
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Artisan Crusts, Smash Burgers & Specialty Brews
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm font-normal">
              Direct delivery from curated Bengaluru micro-kitchens with live tracking & 3-day merchant escrow holds.
            </p>
          </div>
        </div>

        {/* Search Input Bar (Matching Stitch home_screen line 139) */}
        <section>
          <div className="relative group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, sourdough pizzas, cold brews, or cafes..."
              className="w-full h-13 pl-12 pr-4 bg-white border border-gray-200/90 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>
        </section>

        {/* Category Horizontal Chips (Matching Stitch home_screen line 146) */}
        <section className="py-1 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase()
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all tap-feedback cursor-pointer ${
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

        {/* Multi-Cafe Storefront Directory (Requirement 3: Multi-Cafe Storefront) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Artisan Cafe Storefronts
              </h2>
              <p className="text-xs text-gray-500">
                Choose a dedicated cafe kitchen to browse full custom menus
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              {filteredCafes.length} Locations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCafes.map((cafe) => (
              <Link
                key={cafe.id}
                href={`/cafe/${cafe.slug}`}
                className="group bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all tap-feedback flex flex-col justify-between"
              >
                {/* Banner image */}
                <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                  <img
                    src={cafe.banner_url || ''}
                    alt={cafe.name}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  {/* Status Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md flex items-center gap-1 ${
                        cafe.is_open
                          ? 'bg-white/95 text-emerald-700 shadow-xs'
                          : 'bg-gray-900/80 text-gray-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          cafe.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                        }`}
                      />
                      {cafe.is_open ? 'Open Now' : 'Closed'}
                    </span>
                  </div>

                  {/* Rating badge */}
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-extrabold text-gray-900 flex items-center gap-1 shadow-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{cafe.rating.toFixed(1)}</span>
                    <span className="text-gray-400 font-normal">({cafe.rating_count})</span>
                  </div>

                  {/* Delivery time pill */}
                  <div className="absolute bottom-3 right-3 bg-gray-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>{cafe.delivery_time_min} mins</span>
                  </div>
                </div>

                {/* Cafe Meta */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {cafe.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {cafe.tagline}
                    </p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      {cafe.address}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-500">
                      Min Order ₹{cafe.min_order_amount_inr}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      View Menu
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Best Sellers Horizontal Scroll (Matching Stitch home_screen line 189) */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Best Sellers</h2>
            </div>
            <span className="text-xs font-semibold text-emerald-700">Top Rated</span>
          </div>

          <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 py-1">
            {bestSellers.map((item) => {
              const qty = getItemQuantity(item.id)
              return (
                <div
                  key={item.id}
                  className="min-w-[240px] sm:min-w-[260px] bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-xs flex-shrink-0 flex flex-col justify-between"
                >
                  <div className="h-38 w-full relative bg-gray-100 overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-xs p-1 rounded-sm border border-emerald-500/20">
                      <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-1">
                          {item.name}
                        </h3>
                        <span className="text-sm font-extrabold text-emerald-700 whitespace-nowrap">
                          ₹{item.price_inr}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-3">
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAddBestSeller(item)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors tap-feedback flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          ADD TO CART
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-2 py-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-6 flex items-center justify-center font-bold text-emerald-800 text-sm"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-emerald-900">
                            {qty} added
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-6 flex items-center justify-center font-bold text-emerald-800 text-sm"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Menu Items Directory / Preview (Matching Stitch home_screen line 222) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {selectedCategory === 'All'
                ? 'All Dishes & Beverages'
                : `${selectedCategory} Selection`}
            </h2>
            <span className="text-xs text-gray-500">
              {filteredMenuItems.length} items
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredMenuItems.map((item) => {
              const qty = getItemQuantity(item.id)
              const cafe =
                SEED_CAFES.find((c) => c.id === item.cafe_id) || SEED_CAFES[0]

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-3 border border-gray-200/70 shadow-xs flex gap-3.5 items-center hover:border-emerald-200 transition-all"
                >
                  <div className="relative w-22 h-22 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5 bg-white/90 p-0.5 rounded-xs">
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-sm font-bold text-gray-900 truncate">
                        {item.name}
                      </h4>
                      <span className="text-sm font-extrabold text-emerald-700 whitespace-nowrap">
                        ₹{item.price_inr}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between mt-2.5">
                      <Link
                        href={`/cafe/${cafe.slug}`}
                        className="text-[11px] text-gray-400 hover:text-emerald-700 truncate max-w-[120px]"
                      >
                        {cafe.name}
                      </Link>

                      {qty === 0 ? (
                        <button
                          onClick={() =>
                            addItem(item, {
                              id: cafe.id,
                              name: cafe.name,
                              slug: cafe.slug,
                            })
                          }
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 hover:border-emerald-600 rounded-lg text-xs font-bold transition-all tap-feedback cursor-pointer"
                        >
                          + ADD
                        </button>
                      ) : (
                        <div className="flex items-center border border-emerald-300 bg-emerald-50 rounded-lg px-1.5 py-0.5">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-5 h-5 flex items-center justify-center font-bold text-emerald-800 text-xs"
                          >
                            -
                          </button>
                          <span className="px-1.5 text-xs font-bold text-emerald-900">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-5 h-5 flex items-center justify-center font-bold text-emerald-800 text-xs"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
