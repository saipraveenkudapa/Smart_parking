'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/clientAuth'
import Header from '@/components/Header'

interface Listing {
  id: string
  title: string
  address: string
  city: string
  state: string
  zipCode: string
  spaceType: string
  monthlyPrice: number
  description: string
  hasCCTV: boolean
  hasEVCharging: boolean
  isActive: boolean
  images: string[]
  createdAt: string
  updatedAt: string
}

interface Booking {
  id: string
  startDate: string
  endDate: string
  vehicleDetails: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  createdAt: string
  renter: {
    id: string
    fullName: string
    email: string
    phoneNumber: string
    emailVerified: boolean
  }
  listing: {
    id: string
    title: string
    address: string
  }
}

type ApiBookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected'

const mapApiStatusToUi = (status?: string): Booking['status'] => {
  const normalized = status?.toUpperCase()

  switch (normalized) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return 'APPROVED'
    case 'CANCELLED':
      return 'CANCELLED'
    case 'REJECTED':
      return 'REJECTED'
    case 'PENDING':
    default:
      return 'PENDING'
  }
}

const mapUiStatusToApi = (status: 'APPROVED' | 'REJECTED'): ApiBookingStatus => {
  if (status === 'APPROVED') {
    return 'confirmed'
  }
  return 'rejected'
}

export default function HostDashboard() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'listings' | 'bookings' | 'earnings' | 'analytics'>('listings')
  const [earnings, setEarnings] = useState({ total: 0, thisMonth: 0, pending: 0, completed: 0 })
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [actionResult, setActionResult] = useState<{ status: string; bookingDetails?: any }>({ status: '' })
  const [monthMetrics, setMonthMetrics] = useState({
    earnings: 0,
    bookings: 0,
    rating: 0,
    reviewCount: 0
  })
  const [monthMetricsLoading, setMonthMetricsLoading] = useState(true)
  const [thisMonthOccupancyMetrics, setThisMonthOccupancyMetrics] = useState({
    occupancyPercentage: 0,
    totalDays: 0,
    bookedDays: 0
  })
  const [lastMonthOccupancyMetrics, setLastMonthOccupancyMetrics] = useState({
    occupancyPercentage: 0,
    totalDays: 0,
    bookedDays: 0
  })
  const [occupancyMetricsLoading, setOccupancyMetricsLoading] = useState(true)
  const [reviewsBySpace, setReviewsBySpace] = useState<Record<string, { avgRating: number; totalReviews: number }>>({})

  useEffect(() => {
    // Check authentication
    if (!requireAuth('/host/dashboard')) {
      return
    }

    // Fetch user's listings and bookings
    fetchMyListings()
    fetchBookings()
    fetchMonthMetrics()
    fetchOccupancyMetrics()
    fetchReviewsBySpace()
  }, [])

  const fetchOccupancyMetrics = async () => {
    try {
      setOccupancyMetricsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        return
      }

      const now = new Date()
      const year = now.getUTCFullYear()
      const monthIndex = now.getUTCMonth() // 0-11

      const thisMonthStart = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0))
      const nextMonthStart = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0))
      const lastMonthStart = new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0))

      // Last month: [lastMonthStart, thisMonthStart)
      const lastMonthUrl = `/api/dashboard/host/occupancy?start=${encodeURIComponent(lastMonthStart.toISOString())}&end=${encodeURIComponent(thisMonthStart.toISOString())}`

      // This month so far: [thisMonthStart, now]
      // (If you ever want full-month projection, use nextMonthStart instead of now.)
      const thisMonthUrl = `/api/dashboard/host/occupancy?start=${encodeURIComponent(thisMonthStart.toISOString())}&end=${encodeURIComponent(now.toISOString())}`

      const [lastMonthRes, thisMonthRes] = await Promise.all([
        fetch(lastMonthUrl, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(thisMonthUrl, { headers: { Authorization: `Bearer ${token}` } })
      ])

      const [lastMonthBody, thisMonthBody] = await Promise.all([lastMonthRes.json(), thisMonthRes.json()])

      if (!lastMonthRes.ok) {
        throw new Error(lastMonthBody?.error || 'Failed to fetch last month occupancy metrics')
      }
      if (!thisMonthRes.ok) {
        throw new Error(thisMonthBody?.error || 'Failed to fetch this month occupancy metrics')
      }

      setLastMonthOccupancyMetrics({
        occupancyPercentage: Number(lastMonthBody?.data?.occupancyPercentage) || 0,
        totalDays: Number(lastMonthBody?.data?.totalDays) || 0,
        bookedDays: Number(lastMonthBody?.data?.bookedDays) || 0
      })

      setThisMonthOccupancyMetrics({
        occupancyPercentage: Number(thisMonthBody?.data?.occupancyPercentage) || 0,
        totalDays: Number(thisMonthBody?.data?.totalDays) || 0,
        bookedDays: Number(thisMonthBody?.data?.bookedDays) || 0
      })
    } catch (err: any) {
      console.error('[Dashboard] Fetch occupancy metrics error:', err)
    } finally {
      setOccupancyMetricsLoading(false)
    }
  }

  const fetchReviewsBySpace = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        return
      }

      const res = await fetch('/api/reviews/host/by-space', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()
      if (!res.ok || data?.success === false) {
        return
      }

      const nextMap: Record<string, { avgRating: number; totalReviews: number }> = {}
      for (const row of data?.data || []) {
        if (row?.spaceId == null) continue
        nextMap[String(row.spaceId)] = {
          avgRating: Number(row.avgRating) || 0,
          totalReviews: Number(row.totalReviews) || 0
        }
      }
      setReviewsBySpace(nextMap)
    } catch (err) {
      console.warn('Failed to fetch reviews by space', err)
    }
  }

  const fetchMyListings = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login?redirect=/host/dashboard')
        return
      }

      const response = await fetch('/api/listings/my-listings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok || data.success === false) {
        console.warn('Failed to fetch listings:', data.error || data.details)
        setListings([]) // Set empty array instead of throwing
        setError('') // Clear error to show "no listings" message
        return
      }

      console.log('Fetched listings:', data.listings)
      if (data.listings && data.listings.length > 0) {
        console.log('First listing images:', data.listings[0].images)
        console.log('Number of images:', data.listings[0].images?.length)
        if (data.listings[0].images?.length > 0) {
          console.log('First image preview:', data.listings[0].images[0]?.substring(0, 100))
          if (data.listings[0].images.length > 1) {
            console.log('Second image preview:', data.listings[0].images[1]?.substring(0, 100))
          }
        }
      }
      
      setListings(data.listings || [])
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(err.message || 'Failed to load your listings')
    } finally {
      setLoading(false)
    }
  }

  const getFeatureBadges = (listing: Listing) => {
    const features = []
    if (listing.hasCCTV) features.push('CCTV')
    if (listing.hasEVCharging) features.push('EV Charging')
    return features
  }

  const handleToggleActive = async (listingId: string, currentStatus: boolean) => {
    if (actionLoading) return

    try {
      setActionLoading(listingId)
      const token = localStorage.getItem('token')

      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update listing')
      }

      // Update local state
      setListings(listings.map(l => 
        l.id === listingId ? { ...l, isActive: !currentStatus } : l
      ))
    } catch (err: any) {
      console.error('Toggle error:', err)
      alert(err.message || 'Failed to update listing status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (listingId: string, listingTitle: string) => {
    if (actionLoading) return
    
    if (!confirm(`Are you sure you want to delete "${listingTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      setActionLoading(listingId)
      const token = localStorage.getItem('token')

      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete listing')
      }

      // Remove from local state
      setListings(listings.filter(l => l.id !== listingId))
      alert('Listing deleted successfully')
    } catch (err: any) {
      console.error('Delete error:', err)
      alert(err.message || 'Failed to delete listing')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEdit = (listingId: string) => {
    router.push(`/host/edit-listing/${listingId}`)
  }

  const calculateEarnings = (bookings: any[]) => {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    let total = 0
    let thisMonth = 0
    let pending = 0
    let completed = 0
    
    bookings.forEach(booking => {
      const amount = booking.totalAmount || 0
      const bookingDate = new Date(booking.createdAt)
      const status = booking.status?.toLowerCase()
      
      if (status === 'confirmed' || status === 'completed') {
        total += amount
        completed += amount
        if (bookingDate >= firstDayOfMonth) {
          thisMonth += amount
        }
      } else if (status === 'pending') {
        pending += amount
      }
    })
    
    setEarnings({ total, thisMonth, pending, completed })
  }

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/bookings/host', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bookings')
      }

      const normalizedBookings: Booking[] = (data.bookings || []).map((booking: any) => ({
        ...booking,
        status: mapApiStatusToUi(booking.status),
      }))

      setBookings(normalizedBookings)
      calculateEarnings(data.bookings || [])
    } catch (err: any) {
      console.error('Fetch bookings error:', err)
    } finally {
      setBookingsLoading(false)
    }
  }

  const fetchMonthMetrics = async () => {
    try {
      setMonthMetricsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        return
      }

      const now = new Date()
      const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
      const metricsUrl = `/api/dashboard/host/metrics?start=${encodeURIComponent(thisMonthStart.toISOString())}&end=${encodeURIComponent(now.toISOString())}`

      const res = await fetch(metricsUrl, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to fetch dashboard metrics')
      }

      setMonthMetrics({
        earnings: body?.data?.earnings || 0,
        bookings: body?.data?.bookings || 0,
        rating: body?.data?.rating || 0,
        reviewCount: body?.data?.reviewCount || 0
      })
    } catch (err: any) {
      console.error('[Dashboard] Fetch month metrics error:', err)
    } finally {
      setMonthMetricsLoading(false)
    }
  }

  const handleBookingAction = async (bookingId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(bookingId)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: mapUiStatusToApi(status) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${status.toLowerCase()} booking`)
      }

      // Find the booking details for the modal
      const booking = bookings.find(b => b.id === bookingId)
      
      // Refresh bookings
      await fetchBookings()
      
      // Show success modal
      setActionResult({ status, bookingDetails: booking })
      setShowSuccessModal(true)
    } catch (err: any) {
      console.error('Booking action error:', err)
      alert(err.message || `Failed to ${status.toLowerCase()} booking`)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const pendingBookings = bookings.filter(b => b.status === 'PENDING')


  return (
    <div className="min-h-screen bg-linear-to-b from-green-50 to-white">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Host Dashboard</h1>
              <p className="text-gray-600">
                Manage your parking spaces and booking requests
              </p>
            </div>
            <Link
              href="/host/list-space"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              + Add New Listing
            </Link>
          </div>

          {/* This Month Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* This Month Earnings */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600">This Month Earnings</h3>
                <span className="text-2xl">💰</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {monthMetricsLoading ? '—' : `$${monthMetrics.earnings.toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>

            {/* This Month Bookings */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600">This Month Bookings</h3>
                <span className="text-2xl">📅</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-blue-600">{monthMetricsLoading ? '—' : monthMetrics.bookings}</p>
                </div>
              </div>
            </div>

            {/* Average Rating */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600">Your Rating</h3>
                <span className="text-2xl">⭐</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-yellow-600">
                      {monthMetricsLoading
                        ? '—'
                        : (monthMetrics.rating > 0 ? monthMetrics.rating.toFixed(1) : 'N/A')}
                    </p>
                    {monthMetrics.rating > 0 && (
                      <span className="text-gray-500 text-lg">/5.0</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {monthMetricsLoading
                      ? ''
                      : (monthMetrics.reviewCount > 0
                          ? `${monthMetrics.reviewCount} review${monthMetrics.reviewCount !== 1 ? 's' : ''}`
                          : 'No reviews yet')}
                  </p>
                </div>
              </div>
            </div>

            {/* Occupancy Rate */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600">Monthly Occupancy Rate</h3>
                <span className="text-2xl">📊</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {occupancyMetricsLoading ? '—' : `${thisMonthOccupancyMetrics.occupancyPercentage.toFixed(2)}%`}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {occupancyMetricsLoading
                      ? ''
                      : `${thisMonthOccupancyMetrics.bookedDays} day${thisMonthOccupancyMetrics.bookedDays === 1 ? '' : 's'} booked / ${thisMonthOccupancyMetrics.totalDays} day${thisMonthOccupancyMetrics.totalDays === 1 ? '' : 's'}`}
                  </p>
                  {!occupancyMetricsLoading && (() => {
                    const baseline = lastMonthOccupancyMetrics.occupancyPercentage
                    const current = thisMonthOccupancyMetrics.occupancyPercentage
                    const safeBaseline = Number.isFinite(baseline) ? baseline : 0
                    const safeCurrent = Number.isFinite(current) ? current : 0

                    // Day-based special rule: if last month had 0 booked days and this month has N booked days,
                    // show +N*100% (example: 3 booked days => +300%).
                    const lastMonthBookedDays = Number(lastMonthOccupancyMetrics.bookedDays) || 0
                    const thisMonthBookedDays = Number(thisMonthOccupancyMetrics.bookedDays) || 0

                    const changePct = safeBaseline > 0
                      ? ((safeCurrent - safeBaseline) / safeBaseline) * 100
                      : (thisMonthBookedDays > 0 && lastMonthBookedDays === 0 ? thisMonthBookedDays * 100 : 0)

                    const changeClass = changePct > 0 ? 'text-green-600' : changePct < 0 ? 'text-red-600' : 'text-gray-600'
                    const changeLabel = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`

                    return (
                      <p className="text-sm text-gray-500 mt-1">
                        Last month: {safeBaseline.toFixed(2)}% (<span className={changeClass}>{changeLabel}</span>)
                      </p>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('listings')}
                className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                  activeTab === 'listings'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                My Listings ({listings.length})
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                  activeTab === 'bookings'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Booking Requests 
                {pendingBookings.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded-full">
                    {pendingBookings.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Listings Tab */}
          {activeTab === 'listings' && (
            <>
              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  <p className="text-gray-600 mt-4">Loading your listings...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && listings.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                  <div className="text-6xl mb-4">🅿️</div>
                  <h2 className="text-2xl font-semibold mb-2">No listings yet</h2>
                  <p className="text-gray-600 mb-6">
                    Start earning by listing your first parking space
                  </p>
                  <Link
                    href="/host/list-space"
                    className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Create Your First Listing
                  </Link>
                </div>
              )}

              {/* Listings Grid */}
              {!loading && !error && listings.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{listings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  <div className="h-48 bg-gray-200 relative overflow-hidden">
                    {listing.images && listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Image load error for listing:', listing.id, 'Image length:', listing.images[0]?.length)
                          e.currentTarget.style.display = 'none'
                        }}
                        onLoad={() => console.log('Image loaded successfully for listing:', listing.id)}
                      />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center">
                        <span className="text-white text-6xl">🅿️</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Status Badge */}
                    <div className="mb-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                          listing.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {listing.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                      {listing.title}
                    </h3>

                    {/* Location */}
                    <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                      📍 {listing.city}, {listing.state} {listing.zipCode}
                    </p>

                    {/* Price */}
                    <p className="text-2xl font-bold text-green-600 mb-3">
                      ${listing.monthlyPrice}
                      <span className="text-sm text-gray-500 font-normal">/month</span>
                    </p>

                    {/* Space Details */}
                    <div className="flex gap-2 mb-3 text-xs">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {listing.spaceType}
                      </span>
                    </div>

                    {/* Features */}
                    {getFeatureBadges(listing).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {getFeatureBadges(listing).map((feature) => (
                          <span
                            key={feature}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Created Date */}
                    <p className="text-xs text-gray-500 mb-3">
                      Listed on {new Date(listing.createdAt).toLocaleDateString()}
                    </p>

                    {/* Reviews */}
                    <p className="text-xs text-gray-600 mb-3">
                      ⭐ {(reviewsBySpace[listing.id]?.avgRating ?? 0) > 0
                        ? (reviewsBySpace[listing.id]?.avgRating ?? 0).toFixed(1)
                        : 'N/A'}
                      <span className="text-gray-500">
                        {' '}({reviewsBySpace[listing.id]?.totalReviews ?? 0} review{(reviewsBySpace[listing.id]?.totalReviews ?? 0) === 1 ? '' : 's'})
                      </span>
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-3 border-t">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(listing.id)}
                          disabled={actionLoading === listing.id}
                          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleToggleActive(listing.id, listing.isActive)}
                          disabled={actionLoading === listing.id}
                          className={`flex-1 px-3 py-2 text-sm rounded disabled:opacity-50 ${
                            listing.isActive
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {actionLoading === listing.id ? 'Processing...' : (listing.isActive ? 'Deactivate' : 'Activate')}
                        </button>
                      </div>
                      <button 
                        onClick={() => handleDelete(listing.id, listing.title)}
                        disabled={actionLoading === listing.id}
                        className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats Summary */}
          {!loading && !error && listings.length > 0 && (
            <div className="mt-8 grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-green-600">{listings.length}</div>
                <div className="text-gray-600 mt-1">Total Listings</div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {listings.filter((l) => l.isActive).length}
                </div>
                <div className="text-gray-600 mt-1">Active Listings</div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-green-600">
                  $
                  {listings
                    .filter((l) => l.isActive)
                    .reduce((sum, l) => sum + l.monthlyPrice, 0)
                    .toFixed(0)}
                </div>
                <div className="text-gray-600 mt-1">Potential Monthly Income</div>
              </div>
            </div>
          )}
            </>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <>
              {bookingsLoading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  <p className="text-gray-600 mt-4">Loading booking requests...</p>
                </div>
              )}

              {!bookingsLoading && bookings.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                  <div className="text-6xl mb-4">📅</div>
                  <h2 className="text-2xl font-semibold mb-2">No Booking Requests</h2>
                  <p className="text-gray-600">
                    You haven't received any booking requests yet
                  </p>
                </div>
              )}

              {!bookingsLoading && bookings.length > 0 && (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Booking Info */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-xl font-bold">{booking.listing.title}</h3>
                            {getStatusBadge(booking.status)}
                          </div>
                          
                          <p className="text-gray-600 mb-2">📍 {booking.listing.address}</p>

                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-500">Start Date</p>
                              <p className="font-semibold">{formatDate(booking.startDate)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">End Date</p>
                              <p className="font-semibold">{formatDate(booking.endDate)}</p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm text-gray-500">Vehicle Details</p>
                            <p className="font-medium">{booking.vehicleDetails}</p>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-sm text-gray-500 mb-1">Renter</p>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm">👤</span>
                              </div>
                              <div>
                                <p className="font-medium">{booking.renter.fullName}</p>
                                {booking.renter.emailVerified && (
                                  <p className="text-xs text-green-600">✓ Email Verified</p>
                                )}
                              </div>
                            </div>
                            {booking.status === 'APPROVED' && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600">📧 {booking.renter.email}</p>
                                <p className="text-sm text-gray-600">📱 {booking.renter.phoneNumber}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="lg:w-48 flex flex-col gap-2">
                          {booking.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleBookingAction(booking.id, 'APPROVED')}
                                disabled={actionLoading === booking.id}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                              >
                                {actionLoading === booking.id ? 'Processing...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleBookingAction(booking.id, 'REJECTED')}
                                disabled={actionLoading === booking.id}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <p className="text-xs text-gray-500 text-center mt-2">
                            Requested {formatDate(booking.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}


        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && actionResult.bookingDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 animate-fade-in">
            <div className="text-center">
              {actionResult.status === 'APPROVED' ? (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Approved! ✅</h2>
                  <p className="text-gray-600 mb-6">
                    You have successfully approved this booking request.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Declined ❌</h2>
                  <p className="text-gray-600 mb-6">
                    You have declined this booking request.
                  </p>
                </>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Booking Details:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Renter:</span>
                    <span className="font-medium text-gray-900">{actionResult.bookingDetails.renter.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dates:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(actionResult.bookingDetails.startDate).toLocaleDateString()} - {new Date(actionResult.bookingDetails.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vehicle:</span>
                    <span className="font-medium text-gray-900">{actionResult.bookingDetails.vehicleDetails}</span>
                  </div>
                </div>
              </div>

              {actionResult.status === 'APPROVED' && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
                  <p className="text-sm text-blue-800">
                    <strong>Next Steps:</strong><br/>
                    The renter can now see your contact information and will reach out to you to coordinate the parking arrangement.
                  </p>
                </div>
              )}

              {actionResult.status === 'REJECTED' && (
                <div className="bg-gray-50 border-l-4 border-gray-400 p-4 mb-6 text-left">
                  <p className="text-sm text-gray-700">
                    The renter has been notified that their booking request was declined. They can search for other available parking spaces.
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                Got It
              </button>
            </div>
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
