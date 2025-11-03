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

export default function HostDashboard() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check authentication
    if (!requireAuth('/host/dashboard')) {
      return
    }

    // Fetch user's listings
    fetchMyListings()
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Listings</h1>
              <p className="text-gray-600">
                Manage your parking spaces and track their performance
              </p>
            </div>
            <Link
              href="/host/list-space"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              + Add New Listing
            </Link>
          </div>

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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
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
                    <div className="flex gap-2 pt-3 border-t">
                      <button className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                        Edit
                      </button>
                      <button className="flex-1 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                        {listing.isActive ? 'Deactivate' : 'Activate'}
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
