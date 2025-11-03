'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
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
  host: {
    fullName: string
    phoneVerified: boolean
  }
}

function SearchResults() {
  const searchParams = useSearchParams()
  const locationParam = searchParams.get('location') || ''
  
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    location: locationParam,
    maxPrice: '',
    spaceType: '',
  })

  useEffect(() => {
    fetchListings()
  }, [])

  const fetchListings = async (searchFilters = filters) => {
    setLoading(true)
    setError('')
    
    try {
      // Build query string
      const params = new URLSearchParams()
      
      // Parse location for city/state/zip
      if (searchFilters.location) {
        const locationParts = searchFilters.location.split(',').map(p => p.trim())
        
        // Check if it's a ZIP code (5 digits)
        if (/^\d{5}$/.test(searchFilters.location)) {
          params.append('zipCode', searchFilters.location)
        } else if (locationParts.length >= 2) {
          // Format: "City, State" or "City, State ZIP"
          params.append('city', locationParts[0])
          if (locationParts[1]) {
            const stateZip = locationParts[1].split(' ')
            params.append('state', stateZip[0])
            if (stateZip[1] && /^\d{5}$/.test(stateZip[1])) {
              params.append('zipCode', stateZip[1])
            }
          }
        } else {
          // Could be just city or state
          params.append('city', searchFilters.location)
        }
      }
      
      if (searchFilters.maxPrice) {
        params.append('maxPrice', searchFilters.maxPrice)
      }
      
      if (searchFilters.spaceType) {
        params.append('spaceType', searchFilters.spaceType)
      }

      const response = await fetch(`/api/listings?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch listings')
      }

      setListings(data.listings)
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(err.message || 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchListings()
  }

  const getFeatureBadges = (listing: Listing) => {
    const features = []
    if (listing.isGated) features.push('🔒 Gated')
    if (listing.hasCCTV) features.push('📹 CCTV')
    if (listing.isCovered) features.push('🏠 Covered')
    if (listing.hasEVCharging) features.push('⚡ EV Charging')
    return features
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-green-600 hover:underline">
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">
          {filters.location ? `Parking Spaces in ${filters.location}` : 'Search Parking Spaces'}
        </h1>
        <p className="text-gray-600 mb-8">
          Find the perfect parking spot for your vehicle
        </p>

        {/* Search & Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <form onSubmit={handleSearch}>
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <input
                type="text"
                placeholder="Location or ZIP code"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="number"
                placeholder="Max price"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <select
                value={filters.spaceType}
                onChange={(e) => setFilters({ ...filters, spaceType: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Space Types</option>
                <option value="DRIVEWAY">Driveway</option>
                <option value="GARAGE">Garage</option>
                <option value="CARPORT">Carport</option>
                <option value="STREET">Street Parking</option>
                <option value="LOT">Parking Lot</option>
              </select>
              <button
                type="submit"
                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="text-gray-600 mt-4">Finding parking spaces...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Results Count */}
        {!loading && !error && (
          <div className="mb-4">
            <p className="text-gray-600">
              Found <span className="font-semibold text-gray-900">{listings.length}</span> parking{' '}
              {listings.length === 1 ? 'space' : 'spaces'}
            </p>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && listings.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold mb-2">No parking spaces found</h2>
            <p className="text-gray-600 mb-6">
              Try adjusting your search filters or location
            </p>
            <Link
              href="/host/list-space"
              className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Be the first to list in this area
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
                  {/* Title */}
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                    {listing.title}
                  </h3>

                  {/* Location */}
                  <p className="text-sm text-gray-600 mb-2">
                    📍 {listing.address}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    {listing.city}, {listing.state} {listing.zipCode}
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

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {listing.description}
                  </p>

                  {/* Host Info */}
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm">👤</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{listing.host.fullName}</p>
                      {listing.host.phoneVerified && (
                        <p className="text-xs text-green-600">✓ Verified</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <Link 
                    href={`/listing/${listing.id}`}
                    className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-center"
                  >
                    View Details & Book
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 Park-Connect. College Project Demo.</p>
        </div>
      </footer>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-4">Loading search...</p>
        </div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  )
}
