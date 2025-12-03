'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { requireAuth } from '@/lib/clientAuth'
import Header from '@/components/Header'
import AddressAutocomplete from '@/components/AddressAutocomplete'

export default function EditListingPage() {
  const router = useRouter()
  const params = useParams()
  const listingId = params.id as string

  const [formData, setFormData] = useState({
    title: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    spaceType: 'DRIVEWAY',
    hourlyPrice: '',
    dailyPrice: '',
    weeklyPrice: '',
    monthlyPrice: '',
    description: '',
    hasCCTV: false,
    hasEVCharging: false,
    availableFrom: '',
    availableTo: '',
    isActive: true,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!requireAuth('/host/edit-listing/' + listingId)) {
      return
    }
    fetchListing()
  }, [listingId])

  const fetchListing = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/listings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch listing')
      }

      const listing = data.listing
      setFormData({
        title: listing.title,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        zipCode: listing.zipCode,
        latitude: listing.latitude,
        longitude: listing.longitude,
        spaceType: listing.spaceType,
        hourlyPrice: listing.hourlyPrice?.toString() || '',
        dailyPrice: listing.dailyPrice?.toString() || '',
        weeklyPrice: listing.weeklyPrice?.toString() || '',
        monthlyPrice: listing.monthlyPrice?.toString() || '',
        description: listing.description,
        hasCCTV: listing.hasCCTV,
        hasEVCharging: listing.hasEVCharging,
        availableFrom: listing.availableFrom || '',
        availableTo: listing.availableTo || '',
        isActive: typeof listing.isActive === 'boolean' ? listing.isActive : true,
      })
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(err.message || 'Failed to load listing')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddressSelect = (addressComponents: {
    fullAddress: string
    streetAddress: string
    city: string
    state: string
    zipCode: string
    latitude?: number
    longitude?: number
  }) => {
    setFormData({
      ...formData,
      address: addressComponents.streetAddress || addressComponents.fullAddress,
      city: addressComponents.city,
      state: addressComponents.state,
      zipCode: addressComponents.zipCode,
      latitude: addressComponents.latitude,
      longitude: addressComponents.longitude,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login?redirect=/host/edit-listing/' + listingId)
        return
      }

      const updateData = {
        title: formData.title,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        spaceType: formData.spaceType,
        hourlyPrice: parseFloat(formData.hourlyPrice),
        dailyPrice: parseFloat(formData.dailyPrice),
        weeklyPrice: formData.weeklyPrice ? parseFloat(formData.weeklyPrice) : 0,
        monthlyPrice: parseFloat(formData.monthlyPrice),
        description: formData.description,
        hasCCTV: formData.hasCCTV,
        hasEVCharging: formData.hasEVCharging,
        availableFrom: formData.availableFrom,
        availableTo: formData.availableTo,
        isActive: formData.isActive,
      }

      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update listing')
      }

      alert('Listing updated successfully!')
      router.push('/host/dashboard')
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message || 'Failed to update listing. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-4">Loading listing...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-green-50 to-white">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => router.push('/host/dashboard')}
              className="text-green-600 hover:underline mb-4"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-center mb-4">Edit Listing</h1>
            <p className="text-center text-gray-600 mb-8">
              Update your parking space information
            </p>
          </div>

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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <AddressAutocomplete
                  onAddressSelect={handleAddressSelect}
                  defaultValue={formData.address}
                  placeholder="Start typing an address..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    required
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
                    pattern="[0-9]{5}"
                    maxLength={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  />
                </div>
              </div>

              {/* Space Details */}
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

              {/* Pricing */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Pricing *
                  </label>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Set your pricing rates. All rates are independent and stored in the database.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hourly Rate (USD)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g., 5.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      value={formData.hourlyPrice}
                      onChange={(e) => setFormData({ ...formData, hourlyPrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Daily Rate (USD)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g., 30.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      value={formData.dailyPrice}
                      onChange={(e) => setFormData({ ...formData, dailyPrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Weekly Rate (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      value={formData.weeklyPrice}
                      onChange={(e) => setFormData({ ...formData, weeklyPrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Monthly Rate (USD)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g., 200.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      value={formData.monthlyPrice}
                      onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                    />
                  </div>
                </div>
              </div>


              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
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
                      checked={formData.hasCCTV}
                      onChange={(e) => setFormData({ ...formData, hasCCTV: e.target.checked })}
                    />
                    <span className="ml-2 text-gray-700">CCTV/Security Camera</span>
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

              {/* Listing Active Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Listing Status
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span className="ml-2 text-gray-700">
                    {formData.isActive ? 'Active (Bookable)' : 'Inactive (Not Bookable)'}
                  </span>
                </label>
              </div>
              {/* Availability Dates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Availability Period
                </label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Available From</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      value={formData.availableFrom}
                      onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Available To</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      value={formData.availableTo}
                      onChange={(e) => setFormData({ ...formData, availableTo: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank for continuous availability
                </p>
              </div>

              {/* Submit */}
              <div className="pt-4">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => router.push('/host/dashboard')}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                  >
                    {isSubmitting ? 'Updating...' : 'Update Listing'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 Park-Connect. College Project Demo.</p>
        </div>
      </footer>
    </div>
  )
}
