'use client'

import { useState, useEffect } from 'react'
import { requireAuth } from '@/lib/clientAuth'
import Header from '@/components/Header'
import SpendingChart from '@/components/charts/SpendingChart'
import BookingStatusChart from '@/components/charts/BookingStatusChart'
import { format, subDays, startOfMonth } from 'date-fns'

interface Booking {
  id: string
  startTime: string
  endTime: string
  totalPrice: number
  status: string
  listing: {
    id: string
    title: string
    address: string
    city: string
    spaceType: string
  }
}

export default function RenterAnalyticsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'month' | 'all'>('30d')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!requireAuth()) {
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
      if (response.ok) {
        setBookings(data.bookings || [])
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter bookings by time range
  const getFilteredBookings = () => {
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case '7d':
        startDate = subDays(now, 7)
        break
      case '30d':
        startDate = subDays(now, 30)
        break
      case 'month':
        startDate = startOfMonth(now)
        break
      case 'all':
        return bookings
      default:
        startDate = subDays(now, 30)
    }

    return bookings.filter(b => new Date(b.startTime) >= startDate)
  }

  const filteredBookings = getFilteredBookings()

  // Calculate spending over time
  const getSpendingData = () => {
    const confirmedBookings = filteredBookings.filter(
      b => b.status === 'CONFIRMED' || b.status === 'COMPLETED'
    )

    // Group by date
    const dateMap: { [key: string]: { amount: number; bookings: number } } = {}
    
    confirmedBookings.forEach(booking => {
      const date = format(new Date(booking.startTime), 'MMM dd')
      if (!dateMap[date]) {
        dateMap[date] = { amount: 0, bookings: 0 }
      }
      dateMap[date].amount += booking.totalPrice
      dateMap[date].bookings += 1
    })

    return Object.entries(dateMap)
      .map(([date, data]) => ({
        date,
        amount: parseFloat(data.amount.toFixed(2)),
        bookings: data.bookings,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date + ' 2024')
        const dateB = new Date(b.date + ' 2024')
        return dateA.getTime() - dateB.getTime()
      })
  }

  // Calculate booking status distribution
  const getBookingStatusData = () => {
    const statusCounts: { [key: string]: number } = {}
    filteredBookings.forEach(b => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1
    })

    const colorMap: { [key: string]: string } = {
      CONFIRMED: '#10b981',
      COMPLETED: '#3b82f6',
      PENDING: '#f59e0b',
      CANCELLED: '#ef4444',
    }

    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      color: colorMap[name] || '#6b7280',
    }))
  }

  // Calculate spending by space type
  const getSpendingByType = () => {
    const typeMap: { [key: string]: number } = {}
    
    filteredBookings
      .filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
      .forEach(booking => {
        const type = booking.listing.spaceType
        typeMap[type] = (typeMap[type] || 0) + booking.totalPrice
      })

    const colorMap: { [key: string]: string } = {
      DRIVEWAY: '#10b981',
      GARAGE: '#3b82f6',
      CARPORT: '#f59e0b',
      STREET: '#8b5cf6',
      LOT: '#ec4899',
    }

    return Object.entries(typeMap).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
      color: colorMap[name] || '#6b7280',
    }))
  }

  // Calculate key metrics
  const getTotalSpending = () => {
    return filteredBookings
      .filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
      .reduce((sum, b) => sum + b.totalPrice, 0)
  }

  const getPendingSpending = () => {
    return filteredBookings
      .filter(b => b.status === 'PENDING')
      .reduce((sum, b) => sum + b.totalPrice, 0)
  }

  const getAverageParkingCost = () => {
    const confirmed = filteredBookings.filter(
      b => b.status === 'CONFIRMED' || b.status === 'COMPLETED'
    )
    if (confirmed.length === 0) return 0
    return getTotalSpending() / confirmed.length
  }

  const getMostUsedLocation = () => {
    const locationMap: { [key: string]: number } = {}
    
    filteredBookings.forEach(booking => {
      const location = booking.listing.city
      locationMap[location] = (locationMap[location] || 0) + 1
    })

    if (Object.keys(locationMap).length === 0) return 'N/A'
    
    return Object.entries(locationMap).sort((a, b) => b[1] - a[1])[0][0]
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="text-gray-600 mt-4">Loading analytics...</p>
        </main>
      </div>
    )
  }

  const spendingData = getSpendingData()
  const statusData = getBookingStatusData()
  const typeData = getSpendingByType()

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📊 My Parking Analytics</h1>
          <p className="text-gray-600">Track your parking usage and spending patterns</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === '7d'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === '30d'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === 'month'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Time
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Total Spending</div>
            <div className="text-3xl font-bold text-purple-600">
              ${getTotalSpending().toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {filteredBookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length} parkings
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Pending Charges</div>
            <div className="text-3xl font-bold text-yellow-600">
              ${getPendingSpending().toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {filteredBookings.filter(b => b.status === 'PENDING').length} pending
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Avg Parking Cost</div>
            <div className="text-3xl font-bold text-blue-600">
              ${getAverageParkingCost().toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">per booking</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Most Used City</div>
            <div className="text-2xl font-bold text-green-600">
              {getMostUsedLocation()}
            </div>
            <div className="text-xs text-gray-500 mt-1">favorite location</div>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-6">
          {spendingData.length > 0 ? (
            <>
              <SpendingChart
                data={spendingData}
                title="💰 Spending Trend"
              />

              <div className="grid md:grid-cols-2 gap-6">
                {statusData.length > 0 && (
                  <BookingStatusChart
                    data={statusData}
                    title="📊 Booking Status Distribution"
                  />
                )}

                {typeData.length > 0 && (
                  <BookingStatusChart
                    data={typeData}
                    title="🅿️ Spending by Space Type"
                  />
                )}
              </div>

              {/* Recent Bookings */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">📝 Recent Bookings</h3>
                <div className="space-y-3">
                  {filteredBookings.slice(0, 5).map(booking => (
                    <div key={booking.id} className="flex justify-between items-center border-b pb-3">
                      <div>
                        <div className="font-medium">{booking.listing.title}</div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(booking.startTime), 'MMM dd, yyyy')} • {booking.listing.city}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${booking.totalPrice.toFixed(2)}</div>
                        <div className={`text-xs ${
                          booking.status === 'COMPLETED' ? 'text-blue-600' :
                          booking.status === 'CONFIRMED' ? 'text-green-600' :
                          booking.status === 'PENDING' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {booking.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">No Data Available</h3>
              <p className="text-gray-600">
                No bookings found for the selected time period.
                {timeRange !== 'all' && ' Try selecting a different time range.'}
              </p>
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
