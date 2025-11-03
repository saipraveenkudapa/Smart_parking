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
  vehicleSize: string
  monthlyPrice: number
  description: string
  isGated: boolean
  hasCCTV: boolean
  isCovered: boolean
  hasEVCharging: boolean
  isActive: boolean
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
    phoneVerified: boolean
  }
  listing: {
    id: string
    title: string
    address: string
  }
}

export default function HostDashboard() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'listings' | 'bookings'>('listings')

  useEffect(() => {
    // Check authentication
    if (!requireAuth('/host/dashboard')) {
      return
    }

    // Fetch user's listings and bookings
    fetchMyListings()
    fetchBookings()
  }, [])

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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch listings')
      }

      setListings(data.listings)
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(err.message || 'Failed to load your listings')
    } finally {
      setLoading(false)
    }
  }

  const getFeatureBadges = (listing: Listing) => {
    const features = []
    if (listing.isGated) features.push('Gated')
    if (listing.hasCCTV) features.push('CCTV')
    if (listing.isCovered) features.push('Covered')
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

      setBookings(data.bookings)
    } catch (err: any) {
      console.error('Fetch bookings error:', err)
    } finally {
      setBookingsLoading(false)
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
        body: JSON.stringify({ status }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${status.toLowerCase()} booking`)
      }

      // Refresh bookings
      await fetchBookings()
      alert(`Booking ${status.toLowerCase()} successfully`)
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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
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
                  {/* Image Placeholder */}
                  <div className="h-48 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                    <span className="text-white text-6xl">🅿️</span>
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
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {listing.vehicleSize}
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
                                {booking.renter.phoneVerified && (
                                  <p className="text-xs text-green-600">✓ Phone Verified</p>
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

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 Park-Connect. College Project Demo.</p>
        </div>
      </footer>
    </div>
  )
}
