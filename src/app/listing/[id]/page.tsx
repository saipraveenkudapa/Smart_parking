'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated, getUser } from '@/lib/clientAuth'
import Header from '@/components/Header'

interface Listing {
  id: string
  title: string
  description: string
  address: string
  city: string
  state: string
  zipCode: string
  spaceType: string
  vehicleSize: string
  monthlyPrice: number
  isGated: boolean
  hasCCTV: boolean
  isCovered: boolean
  hasEVCharging: boolean
  isActive: boolean
  createdAt: string
  host: {
    id: string
    fullName: string
    email: string
    phoneNumber: string
    phoneVerified: boolean
  }
}

export default function ListingDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const listingId = params.id as string

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bookingData, setBookingData] = useState({
    startDate: '',
    endDate: '',
    vehicleDetails: '',
  })
  const [bookingSubmitting, setBookingSubmitting] = useState(false)

  useEffect(() => {
    fetchListing()
  }, [listingId])

  const fetchListing = async () => {
    try {
      const response = await fetch(`/api/listings/${listingId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch listing')
      }

      setListing(data.listing)
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(err.message || 'Failed to load listing')
    } finally {
      setLoading(false)
    }
  }

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated()) {
      router.push(`/login?redirect=/listing/${listingId}&message=Please log in to book this parking space`)
      return
    }

    setBookingSubmitting(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId,
          startDate: bookingData.startDate,
          endDate: bookingData.endDate,
          vehicleDetails: bookingData.vehicleDetails,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking')
      }

      alert('Booking request sent successfully! The host will review and respond.')
      router.push('/renter/bookings')
    } catch (err: any) {
      console.error('Booking error:', err)
      setError(err.message || 'Failed to create booking request')
    } finally {
      setBookingSubmitting(false)
    }
  }

  const getFeatureBadges = () => {
    if (!listing) return []
    const features = []
    if (listing.isGated) features.push('🔒 Gated')
    if (listing.hasCCTV) features.push('📹 CCTV')
    if (listing.isCovered) features.push('🏠 Covered')
    if (listing.hasEVCharging) features.push('⚡ EV Charging')
    return features
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-4">Loading listing...</p>
        </main>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-2">Listing Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'This listing does not exist or has been removed'}</p>
          <Link href="/search" className="text-green-600 hover:underline">
            ← Back to Search
          </Link>
        </main>
      </div>
    )
  }

  const user = getUser()
  const isOwnListing = user?.userId === listing.host.id

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/search" className="text-green-600 hover:underline">
            ← Back to Search
          </Link>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Image Section */}
            <div className="h-96 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <span className="text-white text-9xl">🅿️</span>
            </div>

            <div className="p-8">
              {/* Status Badge */}
              {!listing.isActive && (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 text-sm font-semibold rounded bg-red-100 text-red-800">
                    Currently Unavailable
                  </span>
                </div>
              )}

              {/* Title and Price */}
              <div className="mb-6">
                <h1 className="text-4xl font-bold mb-4">{listing.title}</h1>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-green-600">${listing.monthlyPrice}</span>
                  <span className="text-2xl text-gray-500">/month</span>
                </div>
              </div>

              {/* Location */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">📍 Location</h3>
                <p className="text-gray-700">{listing.address}</p>
                <p className="text-gray-600">{listing.city}, {listing.state} {listing.zipCode}</p>
              </div>

              {/* Space Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Space Type</h3>
                  <span className="inline-block px-3 py-1 bg-gray-100 rounded">
                    {listing.spaceType}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Vehicle Size</h3>
                  <span className="inline-block px-3 py-1 bg-gray-100 rounded">
                    {listing.vehicleSize}
                  </span>
                </div>
              </div>

              {/* Features */}
              {getFeatureBadges().length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {getFeatureBadges().map((feature) => (
                      <span
                        key={feature}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
              </div>

              {/* Host Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Hosted by</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div>
                    <p className="font-medium">{listing.host.fullName}</p>
                    {listing.host.phoneVerified && (
                      <p className="text-sm text-green-600">✓ Phone Verified</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Booking Section */}
              {!isOwnListing && listing.isActive && (
                <div className="border-t pt-6">
                  {!showBookingForm ? (
                    <button
                      onClick={() => setShowBookingForm(true)}
                      className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 font-semibold text-lg"
                    >
                      Request to Book
                    </button>
                  ) : (
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Request Booking</h3>
                      {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                          {error}
                        </div>
                      )}
                      <form onSubmit={handleBooking} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date *
                          </label>
                          <input
                            type="date"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            value={bookingData.startDate}
                            onChange={(e) => setBookingData({ ...bookingData, startDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date *
                          </label>
                          <input
                            type="date"
                            required
                            min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            value={bookingData.endDate}
                            onChange={(e) => setBookingData({ ...bookingData, endDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vehicle Details *
                          </label>
                          <textarea
                            required
                            rows={3}
                            placeholder="e.g., 2020 Honda Civic, Blue, License Plate: ABC123"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            value={bookingData.vehicleDetails}
                            onChange={(e) => setBookingData({ ...bookingData, vehicleDetails: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowBookingForm(false)}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={bookingSubmitting}
                            className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                          >
                            {bookingSubmitting ? 'Sending...' : 'Send Request'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {isOwnListing && (
                <div className="border-t pt-6">
                  <p className="text-center text-gray-600 py-4">
                    This is your listing. 
                    <Link href="/host/dashboard" className="text-green-600 hover:underline ml-2">
                      Go to Dashboard
                    </Link>
                  </p>
                </div>
              )}
            </div>
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
