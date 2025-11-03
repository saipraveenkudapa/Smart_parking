'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { requireAuth, getUser } from '@/lib/clientAuth'
import Header from '@/components/Header'

const addressSuggestions = [
  '123 Main St, New York, NY 10001',
  '456 Broadway, New York, NY 10013',
  '789 Park Ave, New York, NY 10021',
  '321 5th Ave, New York, NY 10016',
  '654 Madison Ave, New York, NY 10065',
  '987 Lexington Ave, New York, NY 10075',
  '147 Wall St, New York, NY 10005',
  '258 Times Square, New York, NY 10036',
  '369 Columbus Ave, New York, NY 10023',
  '741 Amsterdam Ave, New York, NY 10025',
  '852 Atlantic Ave, Brooklyn, NY 11238',
  '963 Northern Blvd, Queens, NY 11372',
  '159 Grand Concourse, Bronx, NY 10451',
  '753 Victory Blvd, Staten Island, NY 10301',
  '246 Washington St, Newark, NJ 07102',
  '357 Grove St, Jersey City, NJ 07302',
  '468 Market St, Paterson, NJ 07505',
  '579 Broad St, Elizabeth, NJ 07201',
  '680 State St, Trenton, NJ 08608',
  '791 Hudson St, Hoboken, NJ 07030',
]

export default function ListSpacePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    spaceType: 'DRIVEWAY',
    vehicleSize: 'STANDARD',
    monthlyPrice: '',
    description: '',
    isGated: false,
    hasCCTV: false,
    isCovered: false,
    hasEVCharging: false,
  })

  const [filteredAddresses, setFilteredAddresses] = useState<string[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Check authentication on mount
  useEffect(() => {
    if (!requireAuth('/host/list-space')) {
      return
    }
  }, [router])

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData({ ...formData, address: value })

    if (value.length > 0) {
      const filtered = addressSuggestions.filter((addr) =>
        addr.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredAddresses(filtered)
      setShowAddressSuggestions(true)
    } else {
      setFilteredAddresses([])
      setShowAddressSuggestions(false)
    }
  }

  const handleAddressSelect = (address: string) => {
    setFormData({ ...formData, address })
    setShowAddressSuggestions(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login?redirect=/host/list-space&message=Please log in to continue')
        return
      }

      // Prepare listing data
      const listingData = {
        title: formData.title,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        spaceType: formData.spaceType,
        vehicleSize: formData.vehicleSize,
        monthlyPrice: parseFloat(formData.monthlyPrice),
        description: formData.description,
        features: {
          isGated: formData.isGated,
          hasCCTV: formData.hasCCTV,
          isCovered: formData.isCovered,
          hasEVCharging: formData.hasEVCharging,
        },
      }

      // Submit to API
      const response = await fetch('/api/listings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(listingData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create listing')
      }

      // Success - redirect to dashboard
      alert(`Success! Your parking space "${data.listing.title}" is now listed.`)
      router.push('/host/dashboard')
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message || 'Failed to create listing. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4">List Your Parking Space</h1>
          <p className="text-center text-gray-600 mb-8">
            Earn money from your unused parking space. It only takes a few minutes!
          </p>

          <div className="bg-white rounded-lg shadow-md p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Listing Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Secure Covered Parking Near Downtown"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address (with ZIP code) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Start typing address... e.g., 123 Main St, New York, NY 10001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    value={formData.address}
                    onChange={handleAddressChange}
                    onFocus={() => formData.address && setShowAddressSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                    autoComplete="off"
                  />
                  {showAddressSuggestions && filteredAddresses.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredAddresses.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-green-50 cursor-pointer text-gray-700"
                          onMouseDown={() => handleAddressSelect(suggestion)}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Type to see suggestions with ZIP codes
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="New York"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="NY"
                    maxLength={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="10001"
                    pattern="[0-9]{5}"
                    maxLength={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  />
                </div>
              </div>

              {/* Space Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Space Type *
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    value={formData.spaceType}
                    onChange={(e) => setFormData({ ...formData, spaceType: e.target.value })}
                  >
                    <option value="DRIVEWAY">Driveway</option>
                    <option value="GARAGE">Garage</option>
                    <option value="CARPORT">Carport</option>
                    <option value="STREET">Street Parking</option>
                    <option value="LOT">Parking Lot</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Size *
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    value={formData.vehicleSize}
                    onChange={(e) => setFormData({ ...formData, vehicleSize: e.target.value })}
                  >
                    <option value="MOTORCYCLE">Motorcycle</option>
                    <option value="STANDARD">Standard Car</option>
                    <option value="SUV">SUV</option>
                    <option value="TRUCK">Truck</option>
                  </select>
                </div>
              </div>

              {/* Monthly Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Price (USD) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="150.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your parking space, access instructions, and any special features..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Features & Amenities
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      checked={formData.isGated}
                      onChange={(e) => setFormData({ ...formData, isGated: e.target.checked })}
                    />
                    <span className="ml-2 text-gray-700">Gated/Secure Entry</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      checked={formData.hasCCTV}
                      onChange={(e) => setFormData({ ...formData, hasCCTV: e.target.checked })}
                    />
                    <span className="ml-2 text-gray-700">CCTV/Security Camera</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      checked={formData.isCovered}
                      onChange={(e) => setFormData({ ...formData, isCovered: e.target.checked })}
                    />
                    <span className="ml-2 text-gray-700">Covered/Indoor</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      checked={formData.hasEVCharging}
                      onChange={(e) => setFormData({ ...formData, hasEVCharging: e.target.checked })}
                    />
                    <span className="ml-2 text-gray-700">EV Charging Available</span>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating Listing...' : 'List My Space'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 Park-Connect. College Project Demo.</p>
        </div>
      </footer>
    </div>
  )
}
