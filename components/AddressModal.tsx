'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  MapPin,
  Home,
  Briefcase,
  GraduationCap,
  Plus,
  Check,
  Trash2,
  Edit2,
  Navigation,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import type { UserAddress } from '@/lib/supabase/types'
import {
  getStoredAddresses,
  getActiveAddress,
  saveUserAddress,
  deleteUserAddress,
  setActiveAddress as persistActiveAddress,
  calculateDeliveryFee,
  SAGA_ADDRESS_EVENT,
} from '@/lib/services/addressService'
import { useAuth } from '@/lib/context/AuthContext'

interface AddressModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectAddress?: (address: UserAddress) => void
}

const LOCALITY_PRESETS = [
  { area: 'Koramangala 4th/5th Block', distance: 2.4, landmark: 'Near Sony World' },
  { area: 'Indiranagar 100ft Road', distance: 6.2, landmark: 'Near Metro Station' },
  { area: 'HSR Layout Sector 1', distance: 4.8, landmark: 'Near 27th Main' },
  { area: 'Christ University Campus, Hosur Rd', distance: 3.5, landmark: 'Central Gate' },
  { area: 'BTM Layout 2nd Stage', distance: 5.4, landmark: 'Near Udupi Garden' },
  { area: 'Bellandur EcoSpace', distance: 7.8, landmark: 'Outer Ring Rd' },
]

export default function AddressModal({ isOpen, onClose, onSelectAddress }: AddressModalProps) {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<UserAddress[]>(() => getStoredAddresses())
  const [activeAddressId, setActiveAddressId] = useState<string>(() => getActiveAddress()?.id || '')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [label, setLabel] = useState<'Home' | 'Work' | 'Hostel' | 'Other'>('Home')
  const [recipientName, setRecipientName] = useState(user?.full_name || 'Arjun Nair')
  const [phone, setPhone] = useState(user?.phone || '+91 99000 12345')
  const [flatHouseNo, setFlatHouseNo] = useState('')
  const [buildingName, setBuildingName] = useState('')
  const [areaStreet, setAreaStreet] = useState('')
  const [landmark, setLandmark] = useState('')
  const [city, setCity] = useState('Bengaluru')
  const [postalCode, setPostalCode] = useState('560095')
  const [distanceKm, setDistanceKm] = useState<number>(2.8)
  const [isDefault, setIsDefault] = useState(false)
  const [formError, setFormError] = useState('')

  // Sync addresses on storage and custom SAGA events
  useEffect(() => {
    const handleSync = () => {
      setAddresses(getStoredAddresses())
      setActiveAddressId(getActiveAddress()?.id || '')
    }
    window.addEventListener(SAGA_ADDRESS_EVENT, handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener(SAGA_ADDRESS_EVENT, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  if (!isOpen) return null

  const handleSelect = (addr: UserAddress) => {
    persistActiveAddress(addr.id)
    setActiveAddressId(addr.id)
    if (onSelectAddress) {
      onSelectAddress(addr)
    }
    onClose()
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (addresses.length <= 1) {
      alert('You must keep at least one delivery address.')
      return
    }
    const success = deleteUserAddress(id)
    if (success) {
      const updated = getStoredAddresses()
      setAddresses(updated)
      const currentActive = getActiveAddress()
      setActiveAddressId(currentActive?.id || updated[0].id)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    setLabel('Home')
    setRecipientName(user?.full_name || 'Arjun Nair')
    setPhone(user?.phone || '+91 99000 12345')
    setFlatHouseNo('')
    setBuildingName('')
    setAreaStreet('Koramangala 5th Block')
    setLandmark('')
    setCity('Bengaluru')
    setPostalCode('560095')
    setDistanceKm(2.8)
    setIsDefault(addresses.length === 0)
    setFormError('')
    setIsFormOpen(true)
  }

  const handleOpenEdit = (e: React.MouseEvent, addr: UserAddress) => {
    e.stopPropagation()
    setEditingId(addr.id)
    setLabel(addr.label)
    setRecipientName(addr.recipient_name)
    setPhone(addr.phone)
    setFlatHouseNo(addr.flat_house_no)
    setBuildingName(addr.building_name)
    setAreaStreet(addr.area_street)
    setLandmark(addr.landmark || '')
    setCity(addr.city)
    setPostalCode(addr.postal_code)
    setDistanceKm(addr.distance_km)
    setIsDefault(addr.is_default)
    setFormError('')
    setIsFormOpen(true)
  }

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientName.trim()) {
      setFormError('Please enter recipient name')
      return
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setFormError('Please enter a valid 10-digit mobile number')
      return
    }
    if (!flatHouseNo.trim()) {
      setFormError('Please enter Flat / Room / House No.')
      return
    }
    if (!areaStreet.trim()) {
      setFormError('Please enter Area / Locality')
      return
    }

    const saved = saveUserAddress({
      id: editingId || undefined,
      label,
      recipient_name: recipientName.trim(),
      phone: phone.trim(),
      flat_house_no: flatHouseNo.trim(),
      building_name: buildingName.trim() || 'Residential',
      area_street: areaStreet.trim(),
      landmark: landmark.trim() || undefined,
      city: city.trim() || 'Bengaluru',
      postal_code: postalCode.trim() || '560095',
      distance_km: Number(distanceKm) || 2.8,
      is_default: isDefault,
    })

    const updatedList = getStoredAddresses()
    setAddresses(updatedList)
    setActiveAddressId(saved.id)
    if (onSelectAddress) {
      onSelectAddress(saved)
    }
    setIsFormOpen(false)
    setEditingId(null)
  }

  const deliveryCalc = calculateDeliveryFee(distanceKm)

  const getLabelIcon = (type: string) => {
    switch (type) {
      case 'Work':
        return <Briefcase className="w-4 h-4 text-sky-600" />
      case 'Hostel':
        return <GraduationCap className="w-4 h-4 text-purple-600" />
      case 'Home':
      default:
        return <Home className="w-4 h-4 text-emerald-600" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col z-10 max-h-[90vh] overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                {isFormOpen
                  ? editingId
                    ? 'Edit Delivery Address'
                    : 'Add New Address'
                  : 'Select Delivery Location'}
              </h3>
              <p className="text-xs text-gray-500">
                {isFormOpen
                  ? 'Bengaluru 0–10 km courier radius'
                  : 'Delivering from Koramangala & Indiranagar kitchens'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors tap-feedback cursor-pointer"
            aria-label="Close address modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Rate Notice Alert */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-emerald-950">Transparent Distance Pricing:</span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                • <strong>Under 5 km</strong>: Fixed ₹25 delivery charge (₹5/km flat rate)
                <br />• <strong>5 km to 10 km</strong>: ₹25 for first 5 km + ₹6/km for additional distance
              </p>
            </div>
          </div>

          {!isFormOpen ? (
            /* ADDRESS LIST VIEW */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Saved Addresses ({addresses.length})
                </span>
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 transition-colors tap-feedback cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Address</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {addresses.map((addr) => {
                  const isSelected = addr.id === activeAddressId
                  const calc = calculateDeliveryFee(addr.distance_km)

                  return (
                    <div
                      key={addr.id}
                      onClick={() => handleSelect(addr)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                            {getLabelIcon(addr.label)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-gray-900">
                                {addr.label}
                              </span>
                              {addr.is_default && (
                                <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded">
                                  Default
                                </span>
                              )}
                              {calc.isDeliverable ? (
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full flex items-center gap-1">
                                  <Navigation className="w-2.5 h-2.5" />
                                  {addr.distance_km} km • ₹{calc.fee} fee
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.2 rounded-full">
                                  {addr.distance_km} km • Beyond 10 km
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-900 font-medium">
                              {addr.recipient_name} • {addr.phone}
                            </p>

                            <p className="text-xs text-gray-500 leading-relaxed">
                              {addr.flat_house_no}, {addr.building_name}, {addr.area_street}
                              {addr.landmark ? `, Landmark: ${addr.landmark}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(e, addr)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Address"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, addr.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Address"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Select CTA */}
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">
                          {calc.breakdown}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelect(addr)
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>{isSelected ? 'Delivering Here' : 'Deliver Here'}</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* ADD / EDIT ADDRESS FORM */
            <form onSubmit={handleSaveForm} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tag / Label selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Save Address As</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Home', 'Work', 'Hostel', 'Other'] as const).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setLabel(tag)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        label === tag
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {getLabelIcon(tag)}
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Arjun Nair"
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">10-Digit Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 99000 12345"
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Flat & Building */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Flat / Room / House No.</label>
                  <input
                    type="text"
                    value={flatHouseNo}
                    onChange={(e) => setFlatHouseNo(e.target.value)}
                    placeholder="e.g. Flat 302 or Room 412"
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Building / Apartment / PG</label>
                  <input
                    type="text"
                    value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)}
                    placeholder="e.g. Palm Grove Apt"
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Area / Locality Presets */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-700">Quick Bengaluru Localities</label>
                  <span className="text-[10px] text-gray-400">Tap to auto-fill distance</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LOCALITY_PRESETS.map((item) => (
                    <button
                      key={item.area}
                      type="button"
                      onClick={() => {
                        setAreaStreet(item.area)
                        setDistanceKm(item.distance)
                        if (item.landmark && !landmark) setLandmark(item.landmark)
                      }}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-medium text-gray-700 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                    >
                      {item.area.split(',')[0]} ({item.distance} km)
                    </button>
                  ))}
                </div>
              </div>

              {/* Area & Street */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Area / Street / Locality</label>
                <input
                  type="text"
                  value={areaStreet}
                  onChange={(e) => setAreaStreet(e.target.value)}
                  placeholder="e.g. 12th Cross, 5th Block, Koramangala"
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Landmark & Pincode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Landmark (Optional)</label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Sony World Signal"
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">City / Postal PIN</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="560095"
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Distance Slider & Realtime Fee Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">
                    Distance from Cafe Kitchen:
                  </span>
                  <span className="text-xs font-black text-emerald-700 font-mono bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                    {distanceKm.toFixed(1)} km
                  </span>
                </div>

                <input
                  type="range"
                  min="0.5"
                  max="12"
                  step="0.1"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>0.5 km</span>
                  <span>5 km (Flat ₹25)</span>
                  <span>10 km (Max Radius)</span>
                </div>

                {/* Calculation breakdown */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600">{deliveryCalc.breakdown}</span>
                  <span className="font-extrabold text-emerald-700">
                    {deliveryCalc.isDeliverable ? `₹${deliveryCalc.fee}` : 'Unavailable'}
                  </span>
                </div>
              </div>

              {/* Default checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="defaultAddrCheck"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="defaultAddrCheck" className="text-xs text-gray-700 cursor-pointer">
                  Set as default delivery address
                </label>
              </div>

              {/* Form Actions */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-1/3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors tap-feedback cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Save Changes' : 'Save & Deliver Here'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
