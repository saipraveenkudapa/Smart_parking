'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { requireAuth, getUser } from '@/lib/clientAuth'
import Header from '@/components/Header'

export default function AnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeView, setActiveView] = useState<'host' | 'renter'>('host')

  useEffect(() => {
    if (!requireAuth('/analytics')) {
      return
    }

    const userData = getUser()
    setUser(userData)
    setLoading(false)
  }, [])

  // TODO: Replace these with your actual Tableau dashboard URLs
  const TABLEAU_CONFIG = {
    // Tableau Server/Online base URL
    baseUrl: 'https://public.tableau.com/views',
    
    // Dashboard names/paths
    dashboards: {
      hostOverview: 'YourHostDashboard/Dashboard1',
      hostEarnings: 'YourEarningsDashboard/Dashboard1',
      renterActivity: 'YourRenterDashboard/Dashboard1',
      parkingAnalytics: 'YourParkingAnalytics/Dashboard1',
    },
    
    // Dimensions for filtering
    userIdField: 'User ID',
    emailField: 'Email',
  }

  const getTableauEmbedUrl = (dashboardPath: string) => {
    if (!user) return ''
    
    // Build URL with user-specific filters
    const params = new URLSearchParams({
      // Filter by user ID
      [TABLEAU_CONFIG.userIdField]: user.userId || '',
      // Filter by email
      [TABLEAU_CONFIG.emailField]: user.email || '',
      ':embed': 'yes',
      ':showVizHome': 'no',
      ':toolbar': 'yes',
      ':tabs': 'no',
    })

    return `${TABLEAU_CONFIG.baseUrl}/${dashboardPath}?${params.toString()}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-4">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Analytics Dashboard</h1>
          <p className="text-gray-600">View your personalized parking analytics and insights</p>
        </div>

        {/* View Toggle */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-2 inline-flex">
          <button
            onClick={() => setActiveView('host')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeView === 'host'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🏠 Host Analytics
          </button>
          <button
            onClick={() => setActiveView('renter')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeView === 'renter'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🚗 Renter Analytics
          </button>
        </div>

        {/* Host Analytics View */}
        {activeView === 'host' && (
          <div className="space-y-6">
            {/* Host Overview Dashboard */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-green-600 text-white px-6 py-4">
                <h2 className="text-2xl font-bold">Host Overview Dashboard</h2>
                <p className="text-green-100 text-sm">Your listing performance and earnings</p>
              </div>
              <div className="p-4">
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold mb-2">Tableau Dashboard Placeholder</h3>
                  <p className="text-gray-600 mb-4">
                    Configure your Tableau dashboard URL in the code
                  </p>
                  <div className="bg-white rounded p-4 text-left text-sm">
                    <p className="font-mono text-gray-700 mb-2">
                      Dashboard URL: <span className="text-green-600">{TABLEAU_CONFIG.baseUrl}/{TABLEAU_CONFIG.dashboards.hostOverview}</span>
                    </p>
                    <p className="font-mono text-gray-700">
                      User Filter: <span className="text-green-600">{user?.email}</span>
                    </p>
                  </div>
                </div>
                {/* Uncomment when you have real Tableau URLs */}
                {/* <iframe
                  src={getTableauEmbedUrl(TABLEAU_CONFIG.dashboards.hostOverview)}
                  width="100%"
                  height="800"
                  frameBorder="0"
                  allowFullScreen
                  className="rounded-lg"
                ></iframe> */}
              </div>
            </div>

            {/* Earnings Analytics */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-4">
                <h2 className="text-2xl font-bold">Earnings Analytics</h2>
                <p className="text-blue-100 text-sm">Revenue trends and forecasts</p>
              </div>
              <div className="p-4">
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">💰</div>
                  <h3 className="text-xl font-semibold mb-2">Earnings Dashboard Placeholder</h3>
                  <p className="text-gray-600">Configure your earnings dashboard URL</p>
                </div>
                {/* <iframe
                  src={getTableauEmbedUrl(TABLEAU_CONFIG.dashboards.hostEarnings)}
                  width="100%"
                  height="600"
                  frameBorder="0"
                  allowFullScreen
                  className="rounded-lg"
                ></iframe> */}
              </div>
            </div>
          </div>
        )}

        {/* Renter Analytics View */}
        {activeView === 'renter' && (
          <div className="space-y-6">
            {/* Renter Activity Dashboard */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-purple-600 text-white px-6 py-4">
                <h2 className="text-2xl font-bold">My Booking History</h2>
                <p className="text-purple-100 text-sm">Your parking usage and spending</p>
              </div>
              <div className="p-4">
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">🚗</div>
                  <h3 className="text-xl font-semibold mb-2">Renter Dashboard Placeholder</h3>
                  <p className="text-gray-600">Configure your renter dashboard URL</p>
                </div>
                {/* <iframe
                  src={getTableauEmbedUrl(TABLEAU_CONFIG.dashboards.renterActivity)}
                  width="100%"
                  height="800"
                  frameBorder="0"
                  allowFullScreen
                  className="rounded-lg"
                ></iframe> */}
              </div>
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-3">🔧 Setup Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-yellow-900">
            <li>Publish your Tableau dashboards to Tableau Server or Tableau Online</li>
            <li>Get the embed URL for each dashboard</li>
            <li>Update the <code className="bg-yellow-200 px-2 py-1 rounded">TABLEAU_CONFIG</code> object with your URLs</li>
            <li>Set up user filtering in Tableau using parameters or filters</li>
            <li>Uncomment the iframe elements to display the dashboards</li>
            <li>Configure authentication if using Tableau Server (may need trusted authentication)</li>
          </ol>
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
