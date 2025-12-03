'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated, getUser } from '@/lib/clientAuth'
import Header from '@/components/Header'
import Reviews from '@/components/Reviews'

async function userHasCompletedBooking(listingId: string) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return false

    const res = await fetch('/api/bookings')
    const data = await res.json()
    if (!data.bookings) return false

    const now = new Date()
    return data.bookings.some((b: any) =>
      b.listing.id?.toString() === listingId &&
      b.status === 'APPROVED' &&
      b.endDate && new Date(b.endDate) < now
    )
  } catch {
    return false
  }
}

interface Listing {
  id: string
  title: string
  description: string
  address: string
  city: string
  state: string
  zipCode: string
  spaceType: string
  monthlyPrice: number
  hasCCTV: boolean
  hasEVCharging: boolean
  isActive: boolean
  images?: string[]
  createdAt: string
  host: {
    id: string
    fullName: string
    email: string
    phoneNumber: string
    phoneVerified: boolean
  }
  distance?: number | null
  availableFrom?: string
  availableTo?: string
}

export default function ListingDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const listingId = params.id as string

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [canShowReviews, setCanShowReviews] = useState(false)
  const [bookingData, setBookingData] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    vehicleId: '',
    durationType: '1h', // '30m' | '1h' | '1d' | '1w' | '1m' | 'custom'
  })
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(false)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [bookingDetails, setBookingDetails] = useState<any>(null)
  const [bookingPreview, setBookingPreview] = useState({ startISO: '', endISO: '' })
  const [bookingErrors, setBookingErrors] = useState<{ startDate?: string; endDate?: string; vehicleId?: string }>({})

  useEffect(() => {
    (async () => {
      await fetchListing();
      // Check if user can see reviews (has completed booking)
      if (isAuthenticated()) {
        const ok = await userHasCompletedBooking(listingId)
        setCanShowReviews(ok)
      } else {
        setCanShowReviews(false)
      }
    })();
  }, [listingId])

  useEffect(() => {
    if (showBookingForm && isAuthenticated()) {
      fetchVehicles()
    }
  }, [showBookingForm])

  // Update booking preview and inline validation whenever bookingData changes
  useEffect(() => {
    const errors: { startDate?: string; endDate?: string; vehicleId?: string } = {}

    // Helper to build Date from date string and optional time
    const buildDate = (dateStr: string, timeStr?: string) => {
      if (!timeStr) timeStr = '00:00'
      return new Date(`${dateStr}T${timeStr}:00`)
    }

    let startISO = ''
    let endISO = ''

    if (!bookingData.startDate) {
      errors.startDate = 'Start date is required'
    } else {
      const startDt = buildDate(bookingData.startDate, bookingData.startTime || '12:00')
      if (isNaN(startDt.getTime())) {
        errors.startDate = 'Invalid start date/time'
      } else {
        startISO = startDt.toISOString()

        if (bookingData.durationType === 'custom') {
          if (!bookingData.endDate) {
            errors.endDate = 'End date is required for custom bookings'
          } else {
            const endDt = buildDate(bookingData.endDate, '23:59')
            if (isNaN(endDt.getTime())) {
              errors.endDate = 'Invalid end date'
            } else if (endDt <= startDt) {
              errors.endDate = 'End date must be after start date'
            } else {
              endISO = endDt.toISOString()
            }
          }
        } else {
          const endDt = new Date(startDt.getTime())
          switch (bookingData.durationType) {
            case '30m': endDt.setMinutes(endDt.getMinutes() + 30); break
            case '1h': endDt.setHours(endDt.getHours() + 1); break
            case '1d': endDt.setDate(endDt.getDate() + 1); break
            case '1w': endDt.setDate(endDt.getDate() + 7); break
            case '1m': endDt.setMonth(endDt.getMonth() + 1); break
            default: endDt.setHours(endDt.getHours() + 1)
          }
          endISO = endDt.toISOString()
        }
      }
    }

    // vehicle requirement validation at preview time (user feedback)
    if (!bookingData.vehicleId) {
      errors.vehicleId = 'Please select a vehicle to book with'
    }

    setBookingErrors(errors)
    setBookingPreview({ startISO, endISO })
  }, [bookingData])

  const fetchVehicles = async () => {
    setLoadingVehicles(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/vehicles', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setVehicles(data.vehicles)
        // Auto-select default vehicle if available
        const defaultVehicle = data.vehicles.find((v: any) => v.isDefault)
        if (defaultVehicle) {
          setBookingData(prev => ({ ...prev, vehicleId: defaultVehicle.vehicleId.toString() }))
        }
      }
    } catch (err) {
      console.error('Failed to fetch vehicles:', err)
    } finally {
      setLoadingVehicles(false)
    }
  }

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

    // Prevent submit if inline validation errors exist
    if (Object.keys(bookingErrors).length > 0) {
      setError('Please fix validation errors before submitting')
      setBookingSubmitting(false)
      return
    }

    try {
      const token = localStorage.getItem('token')

      // Build ISO start and end timestamps based on durationType
      let startISO = ''
      let endISO = ''

      if (!bookingData.startDate) {
        setError('Please select a start date')
        setBookingSubmitting(false)
        return
      }

      // Helper to build Date from date string and optional time
      const buildDate = (dateStr: string, timeStr?: string) => {
        if (!timeStr) timeStr = '00:00'
        // create an ISO-like string in local timezone
        return new Date(`${dateStr}T${timeStr}:00`)
      }

      const startDt = buildDate(bookingData.startDate, bookingData.startTime || '12:00')

      if (bookingData.durationType === 'custom') {
        if (!bookingData.endDate) {
          setError('Please select an end date for custom bookings')
          setBookingSubmitting(false)
          return
        }
        // For custom, assume end at 23:59 of endDate if no time provided
        const endDt = buildDate(bookingData.endDate, '23:59')
        if (endDt <= startDt) {
          setError('End date must be after start date')
          setBookingSubmitting(false)
          return
        }
        startISO = startDt.toISOString()
        endISO = endDt.toISOString()
      } else {
        // Preset durations
        let endDt = new Date(startDt.getTime())
        switch (bookingData.durationType) {
          case '30m':
            endDt.setMinutes(endDt.getMinutes() + 30)
            break
          case '1h':
            endDt.setHours(endDt.getHours() + 1)
            break
          case '1d':
            endDt.setDate(endDt.getDate() + 1)
            break
          case '1w':
            endDt.setDate(endDt.getDate() + 7)
            break
          case '1m':
            endDt.setMonth(endDt.getMonth() + 1)
            break
          default:
            endDt.setHours(endDt.getHours() + 1)
        }
        startISO = startDt.toISOString()
        endISO = endDt.toISOString()
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId,
          startDate: startISO,
          endDate: endISO,
          vehicleId: bookingData.vehicleId,
          durationType: bookingData.durationType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking')
      }

      if (!data.booking) {
        // Log the full response for debugging
        console.error('Booking API response missing booking object:', data)
        setError('Booking failed: No booking object returned from server. Please try again or contact support.')
        return
      }

      // Redirect to payment page instead of showing success modal
      const bookingAmount = data.booking?.totalAmount || listing?.monthlyPrice || 0
      router.push(`/payment?bookingId=${data.booking.id}&amount=${bookingAmount}&title=${encodeURIComponent(listing?.title || '')}&listingId=${listingId}`)
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
    if (listing.hasCCTV) features.push('📹 CCTV')
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
  // Defensive: listing.host may be undefined if backend does not provide it
  const isOwnListing = user?.userId && listing.host && listing.host.id
    ? user.userId === listing.host.id
    : false

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
            <div className="h-96 bg-gray-200 relative overflow-hidden">
              {listing.images && listing.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 h-full p-2">
                  <img
                    src={listing.images[0]}
                    alt={`${listing.title} - Photo 1`}
                    className="w-full h-full object-cover rounded-lg col-span-2"
                  />
                  {listing.images[1] && (
                    <img
                      src={listing.images[1]}
                      alt={`${listing.title} - Photo 2`}
                      className="w-full h-48 object-cover rounded-lg col-span-2"
                    />
                  )}
                </div>
              ) : (
                <div className="w-full h-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center">
                  <span className="text-white text-9xl">🅿️</span>
                </div>
              )}
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
                {typeof listing.distance === 'number' ? (
                  <p className="text-gray-700">{listing.distance} miles away</p>
                ) : (
                  <p className="text-gray-700">&nbsp;</p>
                )}
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
                  <h3 className="text-lg font-semibold mb-2">Availability</h3>
                  {listing.availableFrom || listing.availableTo ? (
                    <p className="text-gray-700">
                      {listing.availableFrom ? new Date(listing.availableFrom).toLocaleDateString() : 'Now'}
                      {' '}–{' '}
                      {listing.availableTo ? new Date(listing.availableTo).toLocaleDateString() : 'Open ended'}
                    </p>
                  ) : (
                    <p className="text-gray-700">Available continuously</p>
                  )}
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
                    {listing.host ? (
                      <>
                        <p className="font-medium">{listing.host.fullName}</p>
                        {listing.host.phoneVerified && (
                          <p className="text-sm text-green-600">✓ Phone Verified</p>
                        )}
                      </>
                    ) : (
                      <p className="font-medium text-gray-400">Host info unavailable</p>
                    )}
                  </div>
                </div>
              </div>


              {/* Reviews Section: Only show if user has completed booking */}
              {canShowReviews && (
                <div className="mb-6">
                  <Reviews 
                    targetId={parseInt(listingId)} 
                    targetType="SPACE"
                    allowNewReview={isAuthenticated() && !isOwnListing && canShowReviews}
                  />
                </div>
              )}

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
                            {/* Show error if booking fails */}
                            {error && (
                              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                                {error}
                              </div>
                            )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Booking Duration *</label>
                          <div className="flex gap-2 mb-4">
                            {['30m','1h','1d','1w','1m','custom'].map(type => (
                              <button
                                key={type}
                                type="button"
                                className={`px-4 py-2 rounded-lg font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${bookingData.durationType === type ? 'bg-green-600 text-white border-green-600' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-green-50'}`}
                                onClick={() => setBookingData({ ...bookingData, durationType: type })}
                              >
                                {type === '30m' ? '30 min' : type === '1h' ? 'Hourly' : type === '1d' ? 'Daily' : type === '1w' ? 'Weekly' : type === '1m' ? 'Monthly' : 'Custom'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Start date/time */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time *</label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              required
                              min={listing.availableFrom || new Date().toISOString().split('T')[0]}
                              max={listing.availableTo || undefined}
                              className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              value={bookingData.startDate}
                              onChange={(e) => setBookingData({ ...bookingData, startDate: e.target.value })}
                            />
                            <input
                              type="time"
                              required={bookingData.durationType === '30m' || bookingData.durationType === '1h'}
                              min={listing.availableFrom ? '06:00' : '00:00'}
                              max={listing.availableTo ? '22:00' : '23:59'}
                              step="1800"
                              className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              value={bookingData.startTime}
                              onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value })}
                              disabled={false}
                            />
                          </div>
                          {bookingErrors.startDate && (
                            <p className="text-red-600 text-sm mt-1">{bookingErrors.startDate}</p>
                          )}
                        </div>

                        {/* End date for custom, otherwise display computed end */}
                        {bookingData.durationType === 'custom' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                            <input
                              type="date"
                              required
                              min={bookingData.startDate || listing.availableFrom || new Date().toISOString().split('T')[0]}
                              max={listing.availableTo || undefined}
                              className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              value={bookingData.endDate}
                              onChange={(e) => setBookingData({ ...bookingData, endDate: e.target.value })}
                            />
                            {bookingErrors.endDate && (
                              <p className="text-red-600 text-sm mt-1">{bookingErrors.endDate}</p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Estimated End</label>
                            <div className="w-full px-4 py-2 border border-green-200 rounded-lg bg-green-50 text-green-700 font-semibold">
                              {bookingData.startDate ? (
                                (() => {
                                  try {
                                    const d = new Date(`${bookingData.startDate}T${bookingData.startTime || '12:00'}:00`)
                                    const end = new Date(d.getTime())
                                    switch (bookingData.durationType) {
                                      case '30m': end.setMinutes(end.getMinutes() + 30); break
                                      case '1h': end.setHours(end.getHours() + 1); break
                                      case '1d': end.setDate(end.getDate() + 1); break
                                      case '1w': end.setDate(end.getDate() + 7); break
                                      case '1m': end.setMonth(end.getMonth() + 1); break
                                      default: end.setHours(end.getHours() + 1)
                                    }
                                    return end.toLocaleString()
                                  } catch (err) {
                                    return 'Select start date'
                                  }
                                })()
                              ) : (
                                'Select start date'
                              )}
                            </div>
                            {/* ISO preview */}
                            <div className="mt-2 text-xs text-green-700">
                              <div><strong>ISO Preview:</strong></div>
                              <div className="bg-green-100 rounded px-2 py-1 mt-1 text-xs break-all">
                                <div>Start: {bookingPreview.startISO || '—'}</div>
                                <div>End: {bookingPreview.endISO || '—'}</div>
                              </div>
                              {bookingErrors.endDate && (
                                <p className="text-red-600 text-sm mt-1">{bookingErrors.endDate}</p>
                              )}
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Vehicle *
                          </label>
                          {loadingVehicles ? (
                            <div className="text-gray-500 py-2">Loading vehicles...</div>
                          ) : vehicles.length === 0 ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <p className="text-sm text-yellow-800 mb-2">
                                You need to add a vehicle before booking.
                              </p>
                              <Link
                                href="/vehicles"
                                className="text-sm text-blue-600 hover:underline font-medium"
                              >
                                Add a vehicle →
                              </Link>
                            </div>
                          ) : (
                            <>
                            <select
                              required
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              value={bookingData.vehicleId}
                              onChange={(e) => setBookingData({ ...bookingData, vehicleId: e.target.value })}
                            >
                              <option value="">Choose a vehicle...</option>
                              {vehicles.map((vehicle) => (
                                <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                                  {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.licensePlate}
                                  {vehicle.isDefault && ' (Default)'}
                                </option>
                              ))}
                            </select>
                            {bookingErrors.vehicleId && (
                              <p className="text-red-600 text-sm mt-1">{bookingErrors.vehicleId}</p>
                            )}
                            </>
                          )}
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
                            disabled={bookingSubmitting || vehicles.length === 0}
                            className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                          >
                            {bookingSubmitting ? 'Sending...' : vehicles.length === 0 ? 'Add Vehicle First' : 'Send Request'}
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 animate-fade-in">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed! 🎉</h2>
              <p className="text-gray-600 mb-6">
                Your parking reservation has been successfully submitted.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Booking Details:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium text-gray-900">{listing?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Date:</span>
                    <span className="font-medium text-gray-900">{new Date(bookingData.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">End Date:</span>
                    <span className="font-medium text-gray-900">{new Date(bookingData.endDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⏳ Pending Approval
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
                <p className="text-sm text-blue-800">
                  <strong>What's Next?</strong><br/>
                  The host will review your request and respond within 24 hours. You'll receive a notification once they approve or decline your booking.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/renter/bookings')}
                  className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  View My Bookings
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    router.push('/search')
                  }}
                  className="w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Search More Spaces
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 Park-Connect. College Project Demo.</p>
        </div>
      </footer>
    </div>
  )
}
