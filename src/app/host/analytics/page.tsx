'use client'

import { useState, useEffect } from 'react'
import { requireAuth } from '@/lib/clientAuth'
import Header from '@/components/Header'
import EarningsChart from '@/components/charts/EarningsChart'
import BookingStatusChart from '@/components/charts/BookingStatusChart'
import OccupancyChart from '@/components/charts/OccupancyChart'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns'

interface Booking {
  id: string
  startTime: string
  endTime: string
  totalPrice: number
  status: string
  listing: {
    id: string
    title: string
  }
}

interface SupabaseMetrics {
  currentMonthEarnings: number
  lifetimeRevenue: number
  lifetimeBookingCount: number
  twoWeeksBookingsChange: number
  twoWeeksIncomeChange: number
  averageRating: number
  reviewCount: number
  totalBookingsThisMonth: number
  occupancyRate: number
  occupiedDays: number
  totalDays: number
  spaceStatuses: Array<{
    space_id: number
    space_title: string
    is_available: boolean
    current_booking_status: string
    current_status: string
  }>
}

export default function HostAnalyticsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [supabaseMetrics, setSupabaseMetrics] = useState<SupabaseMetrics | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'month' | 'all'>('30d')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!requireAuth()) {
      return
    }
    fetchBookings()
    fetchSupabaseMetrics()
  }, [])

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/bookings/host', {
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

  const fetchSupabaseMetrics = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Fetch all metrics in parallel
      const [
        earningsRes,
        lifetimeRevenueRes,
        bookingsChangeRes,
        incomeChangeRes,
        ratingRes,
        monthlyBookingsRes,
        occupancyRes,
        spaceStatusRes
      ] = await Promise.all([
        fetch('/api/analytics/host?metric=current_month_earnings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/host?metric=lifetime_revenue', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/host?metric=2weeks_bookings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/host?metric=2weeks_income', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/host?metric=average_rating', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/host?metric=total_bookings_this_month', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/host?metric=monthly_occupancy_rate', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/host?metric=current_space_status', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const earnings = await earningsRes.json()
      const lifetimeRevenue = await lifetimeRevenueRes.json()
      const bookingsChange = await bookingsChangeRes.json()
      const incomeChange = await incomeChangeRes.json()
      const rating = await ratingRes.json()
      const monthlyBookings = await monthlyBookingsRes.json()
      const occupancy = await occupancyRes.json()
      const spaceStatus = await spaceStatusRes.json()

      setSupabaseMetrics({
        currentMonthEarnings: earnings.data?.[0]?.total_earnings || 0,
        lifetimeRevenue: lifetimeRevenue.data?.[0]?.total_revenue || 0,
        lifetimeBookingCount: lifetimeRevenue.data?.[0]?.booking_count || 0,
        twoWeeksBookingsChange: bookingsChange.data?.[0]?.diff_count || 0,
        twoWeeksIncomeChange: incomeChange.data?.[0]?.diff_income || 0,
        averageRating: rating.data?.[0]?.avg_rating || 0,
        reviewCount: rating.data?.[0]?.review_count || 0,
        totalBookingsThisMonth: monthlyBookings.data?.[0]?.total_bookings || 0,
        occupancyRate: occupancy.data?.[0]?.occupancy_rate || 0,
        occupiedDays: occupancy.data?.[0]?.occupied_days || 0,
        totalDays: occupancy.data?.[0]?.total_days || 0,
        spaceStatuses: spaceStatus.data || []
      })
    } catch (error) {
      console.error('Failed to fetch Supabase metrics:', error)
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

    return bookings.filter((b: Booking) => new Date(b.startTime) >= startDate)
  }

  const filteredBookings = getFilteredBookings()

  // Calculate earnings over time
  const getEarningsData = () => {
    const confirmedBookings = filteredBookings.filter(
      (b: Booking) => b.status === 'CONFIRMED' || b.status === 'COMPLETED'
    )

    // Group by date
    const dateMap: { [key: string]: { earnings: number; bookings: number } } = {}
    
    confirmedBookings.forEach((booking: Booking) => {
      const date = format(new Date(booking.startTime), 'MMM dd')
      if (!dateMap[date]) {
        dateMap[date] = { earnings: 0, bookings: 0 }
      }
      dateMap[date].earnings += booking.totalPrice
      dateMap[date].bookings += 1
    })

    return Object.entries(dateMap)
      .map(([date, data]) => ({
        date,
        earnings: parseFloat(data.earnings.toFixed(2)),
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
    filteredBookings.forEach((b: Booking) => {
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

  // Calculate occupancy by listing
  const getOccupancyData = () => {
    const listingMap: { [key: string]: { title: string; bookings: number; totalDays: number } } = {}

    filteredBookings.forEach((booking: Booking) => {
      const listingId = booking.listing.id
      if (!listingMap[listingId]) {
        listingMap[listingId] = {
          title: booking.listing.title,
          bookings: 0,
          totalDays: 0,
        }
      }
      listingMap[listingId].bookings += 1
      
      // Calculate booking duration in days
      const start = new Date(booking.startTime)
      const end = new Date(booking.endTime)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      listingMap[listingId].totalDays += days
    })

    // Calculate occupancy rate (assuming max 30 days in period)
    const periodDays = timeRange === '7d' ? 7 : 30
    return Object.values(listingMap).map(listing => ({
      listing: listing.title.length > 20 ? listing.title.substring(0, 20) + '...' : listing.title,
      occupancyRate: parseFloat(((listing.totalDays / periodDays) * 100).toFixed(1)),
      totalBookings: listing.bookings,
    }))
  }

  // Calculate key metrics
  const getTotalEarnings = () => {
    return filteredBookings
      .filter((b: Booking) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
      .reduce((sum: number, b: Booking) => sum + b.totalPrice, 0)
  }

  const getPendingEarnings = () => {
    return filteredBookings
      .filter((b: Booking) => b.status === 'PENDING')
      .reduce((sum: number, b: Booking) => sum + b.totalPrice, 0)
  }

  const getAverageBookingValue = () => {
    const confirmed = filteredBookings.filter(
      (b: Booking) => b.status === 'CONFIRMED' || b.status === 'COMPLETED'
    )
    if (confirmed.length === 0) return 0
    return getTotalEarnings() / confirmed.length
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-4">Loading analytics...</p>
        </main>
      </div>
    )
  }

  const earningsData = getEarningsData()
  const statusData = getBookingStatusData()
  const occupancyData = getOccupancyData()

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📊 Host Analytics</h1>
          <p className="text-gray-600">Track your parking space performance and earnings</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === '7d'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === '30d'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === 'month'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Time
          </button>
        </div>

        {/* Key Metrics - Primary Row */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-1">💰 Lifetime Revenue</div>
            <div className="text-3xl font-bold">
              ${supabaseMetrics?.lifetimeRevenue.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs opacity-75 mt-1">
              {supabaseMetrics?.lifetimeBookingCount || 0} total bookings
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">This Month Earnings</div>
            <div className="text-3xl font-bold text-blue-600">
              ${supabaseMetrics?.currentMonthEarnings.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {supabaseMetrics?.totalBookingsThisMonth || 0} bookings
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Average Rating</div>
            <div className="text-3xl font-bold text-yellow-600">
              {supabaseMetrics?.averageRating ? `⭐ ${supabaseMetrics.averageRating.toFixed(1)}` : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {supabaseMetrics?.reviewCount || 0} reviews
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Occupancy Rate</div>
            <div className="text-3xl font-bold text-purple-600">
              {supabaseMetrics?.occupancyRate.toFixed(1) || 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {supabaseMetrics?.occupiedDays || 0}/{supabaseMetrics?.totalDays || 0} days this month
            </div>
          </div>
        </div>

        {/* Trend Indicators */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3">📈 2-Week Trends</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Bookings Change:</span>
                <span className={`font-bold ${
                  (supabaseMetrics?.twoWeeksBookingsChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(supabaseMetrics?.twoWeeksBookingsChange || 0) >= 0 ? '↑' : '↓'} 
                  {Math.abs(supabaseMetrics?.twoWeeksBookingsChange || 0)} bookings
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Income Change:</span>
                <span className={`font-bold ${
                  (supabaseMetrics?.twoWeeksIncomeChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(supabaseMetrics?.twoWeeksIncomeChange || 0) >= 0 ? '↑' : '↓'} 
                  ${Math.abs(supabaseMetrics?.twoWeeksIncomeChange || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3">🅿️ Space Status</h3>
            <div className="space-y-2">
              {supabaseMetrics?.spaceStatuses.slice(0, 3).map((space) => (
                <div key={space.space_id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 truncate max-w-[200px]">
                    {space.space_title}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    space.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {space.current_status}
                  </span>
                </div>
              ))}
              {(!supabaseMetrics?.spaceStatuses || supabaseMetrics.spaceStatuses.length === 0) && (
                <p className="text-gray-500 text-sm">No spaces listed</p>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics - Original */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Pending Earnings</div>
            <div className="text-3xl font-bold text-yellow-600">
              ${getPendingEarnings().toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {filteredBookings.filter(b => b.status === 'PENDING').length} pending
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Avg Booking Value</div>
            <div className="text-3xl font-bold text-blue-600">
              ${getAverageBookingValue().toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">per booking</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Total Bookings</div>
            <div className="text-3xl font-bold text-purple-600">
              {filteredBookings.length}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {statusData.find(s => s.name === 'CANCELLED')?.value || 0} cancelled
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Completion Rate</div>
            <div className="text-3xl font-bold text-indigo-600">
              {filteredBookings.length > 0 
                ? ((filteredBookings.filter(b => b.status === 'COMPLETED').length / filteredBookings.length) * 100).toFixed(1)
                : 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">success rate</div>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-6">
          {earningsData.length > 0 ? (
            <>
              <EarningsChart
                data={earningsData}
                type="line"
                title="📈 Earnings Trend"
              />

              <div className="grid md:grid-cols-2 gap-6">
                {statusData.length > 0 && (
                  <BookingStatusChart
                    data={statusData}
                    title="📊 Booking Status Distribution"
                  />
                )}

                {occupancyData.length > 0 && (
                  <OccupancyChart
                    data={occupancyData}
                    title="🏗️ Listing Occupancy Rates"
                  />
                )}
              </div>

              <EarningsChart
                data={earningsData}
                type="bar"
                title="💰 Daily Earnings Breakdown"
              />
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
