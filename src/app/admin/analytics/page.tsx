'use client'

import { useState, useEffect } from 'react'
import { requireAuth } from '@/lib/clientAuth'
import Header from '@/components/Header'
import EarningsChart from '@/components/charts/EarningsChart'
import { format } from 'date-fns'

interface AdminMetrics {
  activeBookingsNow: number
  activeUsersLast30Days: number
  platformRevenueThisMonth: number
  totalPlatformRevenue: number
  totalSpacesListed: number
  totalUsers: number
  monthlyBookingsThisMonth: number
  monthlyRevenue12Months: Array<{
    month_year: string
    month_start: string
    total_platform_revenue: number
    booking_count: number
  }>
}

export default function AdminAnalyticsPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!requireAuth()) {
      return
    }
    fetchAdminMetrics()
  }, [])

  const fetchAdminMetrics = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No auth token found')
        return
      }

      console.log('Fetching admin metrics...')

      // Fetch all admin metrics in parallel
      const [
        activeBookingsRes,
        activeUsersRes,
        platformRevenueMonthRes,
        totalRevenueRes,
        spacesRes,
        usersRes,
        monthlyRevenueRes
      ] = await Promise.all([
        fetch('/api/analytics/admin?metric=active_bookings_now', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/admin?metric=active_users_last_30_days', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/admin?metric=platform_revenue_this_month', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/admin?metric=total_platform_revenue', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/admin?metric=total_spaces_listed', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/admin?metric=total_users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/admin?metric=monthly_platform_revenue_12_months', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const activeBookings = await activeBookingsRes.json()
      const activeUsers = await activeUsersRes.json()
      const platformRevenueMonth = await platformRevenueMonthRes.json()
      const totalRevenue = await totalRevenueRes.json()
      const spaces = await spacesRes.json()
      const users = await usersRes.json()
      const monthlyRevenue = await monthlyRevenueRes.json()

      // Log API responses for debugging
      console.log('Admin API Responses:', {
        activeBookings: activeBookings.data,
        activeUsers: activeUsers.data,
        platformRevenueMonth: platformRevenueMonth.data,
        totalRevenue: totalRevenue.data,
        spaces: spaces.data,
        users: users.data,
        monthlyRevenue: monthlyRevenue.data
      })

      // Check for API errors
      if (activeBookings.error) console.error('Active bookings API error:', activeBookings.error)
      if (activeUsers.error) console.error('Active users API error:', activeUsers.error)

      setMetrics({
        activeBookingsNow: activeBookings.data?.[0]?.active_bookings || 0,
        activeUsersLast30Days: activeUsers.data?.[0]?.active_users || 0,
        platformRevenueThisMonth: platformRevenueMonth.data?.[0]?.total_platform_revenue || 0,
        totalPlatformRevenue: totalRevenue.data?.[0]?.total_platform_revenue || 0,
        totalSpacesListed: spaces.data?.[0]?.total_spaces || 0,
        totalUsers: users.data?.[0]?.total_users || 0,
        monthlyBookingsThisMonth: platformRevenueMonth.data?.[0]?.total_bookings || 0,
        monthlyRevenue12Months: monthlyRevenue.data || []
      })
    } catch (error) {
      console.error('Failed to fetch admin metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRevenueChartData = () => {
    if (!metrics?.monthlyRevenue12Months) return []
    
    return metrics.monthlyRevenue12Months.map(item => ({
      date: item.month_year,
      earnings: parseFloat(item.total_platform_revenue.toFixed(2)),
      bookings: item.booking_count
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading platform analytics...</p>
        </main>
      </div>
    )
  }

  const revenueChartData = getRevenueChartData()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🏢 Platform Analytics</h1>
          <p className="text-gray-600">System-wide metrics and performance overview</p>
        </div>

        {/* Real-Time Metrics */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">⚡ Real-Time Metrics</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm opacity-90">Active Bookings Right Now</div>
                <div className="animate-pulse">🔴</div>
              </div>
              <div className="text-5xl font-bold">
                {metrics?.activeBookingsNow || 0}
              </div>
              <div className="text-xs opacity-75 mt-2">Live parking sessions</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm opacity-90">Active Users (30 Days)</div>
                <div>👥</div>
              </div>
              <div className="text-5xl font-bold">
                {metrics?.activeUsersLast30Days || 0}
              </div>
              <div className="text-xs opacity-75 mt-2">Users with bookings</div>
            </div>
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">💰 Revenue Metrics</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm text-gray-600 mb-1">Total Platform Revenue</div>
              <div className="text-4xl font-bold text-green-600">
                ${(metrics?.totalPlatformRevenue || 0).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">All-time</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm text-gray-600 mb-1">This Month Revenue</div>
              <div className="text-4xl font-bold text-blue-600">
                ${(metrics?.platformRevenueThisMonth || 0).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {metrics?.monthlyBookingsThisMonth || 0} bookings
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm text-gray-600 mb-1">Average Monthly</div>
              <div className="text-4xl font-bold text-purple-600">
                ${metrics?.monthlyRevenue12Months && metrics.monthlyRevenue12Months.length > 0
                  ? (metrics.monthlyRevenue12Months.reduce((sum, m) => sum + m.total_platform_revenue, 0) / metrics.monthlyRevenue12Months.length).toFixed(2)
                  : '0.00'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Last 12 months</div>
            </div>
          </div>
        </div>

        {/* Platform Statistics */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">📊 Platform Statistics</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Total Users</h3>
                <div className="text-3xl">👤</div>
              </div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">
                {metrics?.totalUsers || 0}
              </div>
              <div className="text-sm text-gray-600">
                Registered accounts on platform
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Total Parking Spaces</h3>
                <div className="text-3xl">🅿️</div>
              </div>
              <div className="text-4xl font-bold text-orange-600 mb-2">
                {metrics?.totalSpacesListed || 0}
              </div>
              <div className="text-sm text-gray-600">
                Listed parking spaces available
              </div>
            </div>
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">📈 Growth & Engagement</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm text-gray-600 mb-1">User Engagement Rate</div>
              <div className="text-3xl font-bold text-teal-600">
                {metrics?.totalUsers && metrics?.activeUsersLast30Days
                  ? ((metrics.activeUsersLast30Days / metrics.totalUsers) * 100).toFixed(1)
                  : 0}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Active vs total users</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm text-gray-600 mb-1">Avg Revenue Per User</div>
              <div className="text-3xl font-bold text-pink-600">
                ${metrics?.totalUsers && metrics?.totalPlatformRevenue
                  ? (metrics.totalPlatformRevenue / metrics.totalUsers).toFixed(2)
                  : '0.00'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Lifetime value</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm text-gray-600 mb-1">Space Utilization</div>
              <div className="text-3xl font-bold text-cyan-600">
                {metrics?.totalSpacesListed && metrics?.activeBookingsNow
                  ? ((metrics.activeBookingsNow / metrics.totalSpacesListed) * 100).toFixed(1)
                  : 0}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Currently in use</div>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        {revenueChartData.length > 0 && (
          <div className="mb-6">
            <EarningsChart
              data={revenueChartData}
              type="line"
              title="💵 Platform Revenue - Last 12 Months"
            />
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3">🎯 Key Insights</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  <strong>{metrics?.activeBookingsNow || 0}</strong> parking sessions active right now
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  <strong>{metrics?.activeUsersLast30Days || 0}</strong> users actively using the platform in last 30 days
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  <strong>${(metrics?.platformRevenueThisMonth || 0).toFixed(2)}</strong> revenue generated this month
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  <strong>{metrics?.totalSpacesListed || 0}</strong> parking spaces available on platform
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3">📅 Monthly Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Revenue This Month:</span>
                <span className="font-bold text-green-600">
                  ${(metrics?.platformRevenueThisMonth || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Bookings This Month:</span>
                <span className="font-bold text-blue-600">
                  {metrics?.monthlyBookingsThisMonth || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Per Booking:</span>
                <span className="font-bold text-purple-600">
                  ${metrics?.monthlyBookingsThisMonth && metrics?.platformRevenueThisMonth
                    ? (metrics.platformRevenueThisMonth / metrics.monthlyBookingsThisMonth).toFixed(2)
                    : '0.00'}
                </span>
              </div>
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
