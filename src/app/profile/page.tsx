'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { isAuthenticated } from '@/lib/clientAuth'
import Reviews from '@/components/Reviews'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [spendingRange, setSpendingRange] = useState<'last7' | 'last30' | 'thisMonth' | 'allTime'>('last7')
  const [renterBookings, setRenterBookings] = useState<any[]>([])
  const [renterBookingsLoading, setRenterBookingsLoading] = useState(true)
  const [renterBookingsError, setRenterBookingsError] = useState('')
  const [hostBookings, setHostBookings] = useState<any[]>([])
  const [hostBookingsLoading, setHostBookingsLoading] = useState(true)
  const [hostBookingsError, setHostBookingsError] = useState('')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  })

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    fetchProfile()
    fetchRenterBookings()
    fetchHostBookings()
  }, [router])

  const fetchRenterBookings = async () => {
    try {
      setRenterBookingsError('')
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch('/api/bookings', { headers })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to fetch bookings')
      if (!Array.isArray(data.bookings)) throw new Error('Invalid bookings response')

      setRenterBookings(data.bookings)
    } catch (err) {
      console.error('Fetch renter bookings error:', err)
      setRenterBookings([])
      setRenterBookingsError(err instanceof Error ? err.message : 'Failed to fetch bookings')
    } finally {
      setRenterBookingsLoading(false)
    }
  }

  const fetchHostBookings = async () => {
    try {
      setHostBookingsError('')
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch('/api/bookings/host', { headers })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to fetch host bookings')
      if (!Array.isArray(data.bookings)) throw new Error('Invalid host bookings response')

      setHostBookings(data.bookings)
    } catch (err) {
      console.error('Fetch host bookings error:', err)
      setHostBookings([])
      setHostBookingsError(err instanceof Error ? err.message : 'Failed to fetch host bookings')
    } finally {
      setHostBookingsLoading(false)
    }
  }

  const parkingAnalytics = useMemo(() => {
    const safeNumber = (value: any) => {
      const asNumber = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(asNumber) ? asNumber : 0
    }

    const now = new Date()
    let rangeStart: Date | null = null
    let rangeEnd: Date | null = null

    if (spendingRange === 'last7') {
      rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      rangeEnd = now
    } else if (spendingRange === 'last30') {
      rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      rangeEnd = now
    } else if (spendingRange === 'thisMonth') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1)
      rangeEnd = now
    }

    const inRange = (booking: any) => {
      const start = booking?.startDate ? new Date(booking.startDate) : null
      if (!start || Number.isNaN(start.getTime())) return false
      if (rangeStart && start < rangeStart) return false
      if (rangeEnd && start > rangeEnd) return false
      return true
    }

    const normalizeStatus = (status: any) => (typeof status === 'string' ? status.toUpperCase() : '')
    const isApproved = (status: string) =>
      status === 'APPROVED' || status === 'COMPLETED' || status === 'CONFIRMED'
    const isPending = (status: string) => status === 'PENDING'

    const sourceBookings = renterBookings.length > 0 ? renterBookings : hostBookings
    const useHostAmounts = renterBookings.length === 0 && hostBookings.length > 0

    const filtered = sourceBookings.filter(inRange)

    let totalSpending = 0
    let parkingsCount = 0
    let pendingCharges = 0
    let pendingCount = 0
    const cityCounts = new Map<string, number>()

    for (const booking of filtered) {
      const status = normalizeStatus(booking?.status)
      const amount = useHostAmounts
        ? safeNumber(booking?.ownerPayout ?? booking?.totalAmount)
        : safeNumber(booking?.totalAmount)
      const city = (booking?.listing?.city || '').trim()

      if (isApproved(status)) {
        totalSpending += amount
        parkingsCount += 1
      } else if (isPending(status)) {
        pendingCharges += amount
        pendingCount += 1
      }

      if (city) {
        cityCounts.set(city, (cityCounts.get(city) || 0) + 1)
      }
    }

    let mostUsedCity = 'N/A'
    let topCount = 0
    for (const [city, count] of cityCounts.entries()) {
      if (count > topCount) {
        topCount = count
        mostUsedCity = city
      }
    }

    const avgParkingCost = parkingsCount > 0 ? totalSpending / parkingsCount : 0

    return {
      totalSpending,
      parkingsCount,
      pendingCharges,
      pendingCount,
      avgParkingCost,
      mostUsedCity,
    }
  }, [renterBookings, hostBookings, spendingRange])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      const data = await response.json()

      if (response.ok) {
        setUser(data)
        setFormData({
          fullName: data.fullName || '',
          email: data.email || '',
          phoneNumber: data.phoneNumber || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
        })
      } else {
        setError(data.error || 'Failed to load profile')
      }
    } catch (err) {
      console.error('Fetch profile error:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setSuccess('Profile updated successfully!')
        setEditing(false)
        
        // Update localStorage with new data
        const existingUser = JSON.parse(localStorage.getItem('user') || '{}')
        localStorage.setItem('user', JSON.stringify({
          ...existingUser,
          ...data.user,
        }))
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (err) {
      console.error('Update profile error:', err)
      setError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-4">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          {/* Profile Header */}
          <div className="flex items-center gap-6 mb-8 pb-8 border-b">
            <div className="w-24 h-24 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg">
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 mb-1">{user?.fullName}</h2>
              <p className="text-gray-600 mb-2">{user?.email}</p>
              <div className="flex gap-2">
                {user?.isVerified ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    Unverified
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-semibold transition"
            >
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          )}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Profile Information */}
          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setError('')
                    // Reset form to original values
                    setFormData({
                      fullName: user?.fullName || '',
                      email: user?.email || '',
                      phoneNumber: user?.phoneNumber || '',
                      address: user?.address || '',
                      city: user?.city || '',
                      state: user?.state || '',
                      zipCode: user?.zipCode || '',
                    })
                  }}
                  disabled={saving}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">Full Name</h3>
                <p className="text-lg text-gray-900">{user?.fullName}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">Email</h3>
                <p className="text-lg text-gray-900">{user?.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">Phone Number</h3>
                <p className="text-lg text-gray-900">{user?.phoneNumber}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">Address</h3>
                <p className="text-lg text-gray-900">{user?.address}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">City</h3>
                <p className="text-lg text-gray-900">{user?.city}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">State</h3>
                <p className="text-lg text-gray-900">{user?.state}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">ZIP Code</h3>
                <p className="text-lg text-gray-900">{user?.zipCode}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">Member Since</h3>
                <p className="text-lg text-gray-900">
                  {user?.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        {user && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <Reviews 
              targetId={user.userId} 
              targetType="USER"
              allowNewReview={false}
            />
          </div>
        )}


        {/* Parking Analytics Summary */}
        <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
          <h2 className="text-2xl font-bold mb-4">📊 My Parking Analytics</h2>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              type="button"
              onClick={() => setSpendingRange('last7')}
              className={`px-4 py-2 rounded-lg border font-semibold transition ${spendingRange === 'last7' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'}`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setSpendingRange('last30')}
              className={`px-4 py-2 rounded-lg border font-semibold transition ${spendingRange === 'last30' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'}`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setSpendingRange('thisMonth')}
              className={`px-4 py-2 rounded-lg border font-semibold transition ${spendingRange === 'thisMonth' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'}`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setSpendingRange('allTime')}
              className={`px-4 py-2 rounded-lg border font-semibold transition ${spendingRange === 'allTime' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'}`}
            >
              All Time
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Total Spending</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">${parkingAnalytics.totalSpending.toFixed(2)}</p>
              <p className="text-sm text-gray-600">{parkingAnalytics.parkingsCount} parkings</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Pending Charges</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">${parkingAnalytics.pendingCharges.toFixed(2)}</p>
              <p className="text-sm text-gray-600">{parkingAnalytics.pendingCount} pending</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Avg Parking Cost</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">${parkingAnalytics.avgParkingCost.toFixed(2)}</p>
              <p className="text-sm text-gray-600">per booking</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Most Used City</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{parkingAnalytics.mostUsedCity}</p>
              <p className="text-sm text-gray-600">favorite location</p>
            </div>
          </div>

          {renterBookingsLoading && (
            <p className="text-sm text-gray-600 mt-4">Loading analytics...</p>
          )}
          {!renterBookingsLoading && renterBookingsError && (
            <p className="text-sm text-red-600 mt-4">{renterBookingsError}</p>
          )}
          {!hostBookingsLoading && !renterBookingsLoading && !renterBookingsError && hostBookingsError && (
            <p className="text-sm text-red-600 mt-4">{hostBookingsError}</p>
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
