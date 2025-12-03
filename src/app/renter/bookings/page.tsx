'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated } from '@/lib/clientAuth'
import Header from '@/components/Header'

interface Booking {
  id: string
  startDate: string
  endDate: string
  vehicleDetails: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  createdAt: string
  listing: {
    id: string
    title: string
    address: string
    city: string
    state: string
    zipCode: string
    monthlyPrice: number
    host: {
      id: string
      fullName: string
      email: string
      phoneNumber: string
    }
    distance?: number | null
  }
}

export default function RenterBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login?redirect=/renter/bookings')
      return
    }
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/bookings', {
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
      console.error('Fetch error:', err)
      setError(err.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking request?')) {
      return
    }

    setActionLoading(bookingId)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking')
      }

      // Refresh bookings list
      await fetchBookings()
      alert('Booking cancelled successfully')
    } catch (err: any) {
      console.error('Cancel error:', err)
      setError(err.message || 'Failed to cancel booking')
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
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status as keyof typeof styles]}`}>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-4">Loading bookings...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">My Bookings</h1>
            <p className="text-gray-600">View and manage your parking space bookings</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {bookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">📅</div>
              <h2 className="text-2xl font-bold mb-2">No Bookings Yet</h2>
              <p className="text-gray-600 mb-6">You haven't requested any parking spaces yet.</p>
              <Link 
                href="/search" 
                className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Browse Parking Spaces
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Listing Info */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-bold">{booking.listing.title}</h3>
                        {getStatusBadge(booking.status)}
                      </div>
                      {typeof booking.listing.distance === 'number' ? (
                        <p className="text-gray-600 mb-2">📍 {booking.listing.distance} miles away</p>
                      ) : (
                        <p className="text-gray-600 mb-2">&nbsp;</p>
                      )}
                      
                      <p className="text-2xl font-bold text-green-600 mb-4">
                        ${booking.listing.monthlyPrice}/month
                      </p>

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
                        <p className="text-sm text-gray-500 mb-1">Host Contact</p>
                        <p className="font-medium">{booking.listing.host.fullName}</p>
                        {booking.status === 'APPROVED' && (
                          <>
                            <p className="text-sm text-gray-600">📧 {booking.listing.host.email}</p>
                            <p className="text-sm text-gray-600">📱 {booking.listing.host.phoneNumber}</p>
                            <div className="mt-4">
                              <p className="text-sm text-gray-500 mb-1">Parking Address</p>
                              <p className="font-medium">{booking.listing.address}</p>
                              <p className="text-sm text-gray-600">
                                {booking.listing.city}, {booking.listing.state} {booking.listing.zipCode}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="lg:w-48 flex flex-col gap-2">
                      <Link
                        href={`/listing/${booking.listing.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-center"
                      >
                        View Listing
                      </Link>
                      
                      {booking.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? 'Cancelling...' : 'Cancel Request'}
                        </button>
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
