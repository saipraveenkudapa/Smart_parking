'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { requireAuth, getUser } from '@/lib/clientAuth'
import Header from '@/components/Header'
import AddressAutocomplete from '@/components/AddressAutocomplete'

export default function ListSpacePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    spaceType: 'DRIVEWAY',
    vehicleSize: 'STANDARD',
    hourlyRate: '',
    dailyRate: '',
    weeklyRate: '',
    monthlyRate: '',
    description: '',
    isGated: false,
    hasCCTV: false,
    isCovered: false,
    hasEVCharging: false,
  })

  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedListing, setSavedListing] = useState<any>(null)

  // Check authentication on mount
  useEffect(() => {
    if (!requireAuth('/host/list-space')) {
      return
    }
  }, [router])

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
      // Validate images
      if (images.length === 0) {
        setError('Please upload at least one photo of your parking space')
        setIsSubmitting(false)
        return
      }

      // Get JWT token from localStorage
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login?redirect=/host/list-space&message=Please log in to continue')
        return
      }

      // Create FormData to handle both text and file uploads
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('address', formData.address)
      formDataToSend.append('city', formData.city)
      formDataToSend.append('state', formData.state)
      formDataToSend.append('zipCode', formData.zipCode)
      
      if (formData.latitude) formDataToSend.append('latitude', formData.latitude.toString())
      if (formData.longitude) formDataToSend.append('longitude', formData.longitude.toString())
      
      formDataToSend.append('spaceType', formData.spaceType)
      formDataToSend.append('vehicleSize', formData.vehicleSize)
      formDataToSend.append('hourlyRate', formData.hourlyRate)
      formDataToSend.append('dailyRate', formData.dailyRate)
      formDataToSend.append('weeklyRate', formData.weeklyRate)
      formDataToSend.append('monthlyRate', formData.monthlyRate)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('isGated', formData.isGated.toString())
      formDataToSend.append('hasCCTV', formData.hasCCTV.toString())
      formDataToSend.append('isCovered', formData.isCovered.toString())
      formDataToSend.append('hasEVCharging', formData.hasEVCharging.toString())
      
      // Add images
      images.forEach((image) => {
        formDataToSend.append('images', image)
      })

      // Submit to API
      const response = await fetch('/api/listings/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create listing')
      }

      // Success - show modal
      setSavedListing(data.listing)
      setShowSuccessModal(true)
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/host/dashboard')
      }, 3000)
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message || 'Failed to create listing. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-green-50 to-white">
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
                  Street Address *
                </label>
                <AddressAutocomplete
                  onAddressSelect={handleAddressSelect}
                  defaultValue={formData.address}
                  placeholder="Start typing an address..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Start typing to see Google Maps address suggestions
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

              {/* Pricing - All Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Pricing (USD) *
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Fill in one rate and click "Auto-Calculate" to fill the rest, or enter each rate manually.
                  <br />
                  <span className="text-xs text-gray-500">Formula: Daily = Hourly × 5 | Weekly = Daily × 4 | Monthly = Weekly × 3</span>
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate *
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          placeholder="5.00"
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          value={formData.hourlyRate}
                          onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const hourly = parseFloat(formData.hourlyRate) || 0
                          if (hourly > 0) {
                            const daily = (hourly * 5).toFixed(2)
                            const weekly = (parseFloat(daily) * 4).toFixed(2)
                            const monthly = (parseFloat(weekly) * 3).toFixed(2)
                            setFormData({
                              ...formData,
                              dailyRate: daily,
                              weeklyRate: weekly,
                              monthlyRate: monthly,
                            })
                          }
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 whitespace-nowrap text-sm"
                      >
                        Auto-Calculate
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Daily Rate *
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          placeholder="25.00"
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          value={formData.dailyRate}
                          onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const daily = parseFloat(formData.dailyRate) || 0
                          if (daily > 0) {
                            const hourly = (daily / 5).toFixed(2)
                            const weekly = (daily * 4).toFixed(2)
                            const monthly = (parseFloat(weekly) * 3).toFixed(2)
                            setFormData({
                              ...formData,
                              hourlyRate: hourly,
                              weeklyRate: weekly,
                              monthlyRate: monthly,
                            })
                          }
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 whitespace-nowrap text-sm"
                      >
                        Auto-Calculate
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weekly Rate *
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          placeholder="100.00"
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          value={formData.weeklyRate}
                          onChange={(e) => setFormData({ ...formData, weeklyRate: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const weekly = parseFloat(formData.weeklyRate) || 0
                          if (weekly > 0) {
                            const daily = (weekly / 4).toFixed(2)
                            const hourly = (parseFloat(daily) / 5).toFixed(2)
                            const monthly = (weekly * 3).toFixed(2)
                            setFormData({
                              ...formData,
                              hourlyRate: hourly,
                              dailyRate: daily,
                              monthlyRate: monthly,
                            })
                          }
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 whitespace-nowrap text-sm"
                      >
                        Auto-Calculate
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Rate *
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          placeholder="300.00"
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          value={formData.monthlyRate}
                          onChange={(e) => setFormData({ ...formData, monthlyRate: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const monthly = parseFloat(formData.monthlyRate) || 0
                          if (monthly > 0) {
                            const weekly = (monthly / 3).toFixed(2)
                            const daily = (parseFloat(weekly) / 4).toFixed(2)
                            const hourly = (parseFloat(daily) / 5).toFixed(2)
                            setFormData({
                              ...formData,
                              hourlyRate: hourly,
                              dailyRate: daily,
                              weeklyRate: weekly,
                            })
                          }
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 whitespace-nowrap text-sm"
                      >
                        Auto-Calculate
                      </button>
                    </div>
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
                  placeholder="Describe your parking space, access instructions, and any special features..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Parking Space Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parking Space Images (Upload 2 photos) *
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  At least one photo is required to create a listing
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length > 2) {
                      alert('Please select only 2 images')
                      e.target.value = ''
                      return
                    }
                    
                    setImages(files)
                    
                    // Create preview URLs
                    const previews = files.map(file => URL.createObjectURL(file))
                    setImagePreviews(previews)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = images.filter((_, i) => i !== index)
                            const newPreviews = imagePreviews.filter((_, i) => i !== index)
                            setImages(newImages)
                            setImagePreviews(newPreviews)
                            URL.revokeObjectURL(preview)
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Success Modal */}
      {showSuccessModal && savedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-in">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 rounded-full p-4">
                <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            {/* Success Message */}
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">
              Success! 🎉
            </h2>
            <p className="text-center text-gray-600 mb-6">
              Your parking space has been listed successfully!
            </p>
            
            {/* Listing Details */}
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-900 mb-2">{savedListing.title}</h3>
              <p className="text-sm text-green-700">
                📍 {savedListing.location?.address}, {savedListing.location?.city}, {savedListing.location?.state}
              </p>
              <div className="text-sm text-green-700 mt-2 space-y-1">
                <p>💰 Pricing:</p>
                <div className="ml-4 grid grid-cols-2 gap-1">
                  <span>Hourly: ${savedListing.pricing?.hourlyRate}</span>
                  <span>Daily: ${savedListing.pricing?.dailyRate}</span>
                  <span>Weekly: ${savedListing.pricing?.weeklyRate || 'N/A'}</span>
                  <span>Monthly: ${savedListing.pricing?.monthlyRate}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => router.push('/host/dashboard')}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  window.location.reload()
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-semibold transition-colors"
              >
                List Another Space
              </button>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              Redirecting to dashboard in 3 seconds...
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 Park-Connect. College Project Demo.</p>
        </div>
      </footer>
    </div>
  )
}
