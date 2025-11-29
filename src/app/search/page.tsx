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
  latitude?: number | null
  longitude?: number | null
  spaceType: string
  vehicleSize: string
  monthlyPrice: number
  description: string
  isGated: boolean
  hasCCTV: boolean
  isCovered: boolean
  hasEVCharging: boolean
  images?: string[]
  distance?: number | null
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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [gettingLocation, setGettingLocation] = useState(false)
  const [autoFilledZip, setAutoFilledZip] = useState<string | null>(null)

  useEffect(() => {
    // Request location automatically on page load
    requestUserLocation()
  }, [])

  useEffect(() => {
    if (userLocation) {
      fetchListings()
    } else {
      fetchListings()
    }
  }, [userLocation])

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Smart_Parking_App'
          }
        }
      )
      const data = await response.json()
      
      if (data.address && data.address.postcode) {
        const zipCode = data.address.postcode
        setAutoFilledZip(zipCode)
        setFilters(prev => ({ ...prev, location: zipCode }))
        return zipCode
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
    }
    return null
  }

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationPermission('denied')
      return
    }

    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setUserLocation(location)
        setLocationPermission('granted')
        
        // Get ZIP code from coordinates
        await reverseGeocode(location.lat, location.lng)
        
        setGettingLocation(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        setLocationPermission('denied')
        setGettingLocation(false)
      }
    )
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // Haversine formula for calculating distance between two points
    const R = 6371 // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // Distance in kilometers
    return Math.round(distance * 0.621371 * 10) / 10 // Convert to miles and round to 1 decimal
  }

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

      // Handle both error cases and empty results gracefully
      if (!response.ok || data.success === false) {
        console.warn('Listings fetch returned error:', data.error || data.details)
        // Don't throw - just use empty array
        setListings([])
        setLoading(false)
        return
      }

      // Sort by distance if user location is available
      let sortedListings = data.listings
      if (userLocation && sortedListings.length > 0) {
        sortedListings = sortedListings
          .map((listing: any) => ({
            ...listing,
            distance: listing.latitude && listing.longitude
              ? calculateDistance(userLocation.lat, userLocation.lng, listing.latitude, listing.longitude)
              : null,
          }))
          .sort((a: any, b: any) => {
            // Prioritize listings with distance data
            if (a.distance === null) return 1
            if (b.distance === null) return -1
            return a.distance - b.distance
          })
      }

      setListings(sortedListings)
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

        {/* Location Permission Banner */}
        {locationPermission === 'granted' && userLocation && autoFilledZip && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>📍 Showing parking spaces near ZIP code {autoFilledZip}, sorted by distance</span>
          </div>
        )}

        {locationPermission === 'denied' && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Enable location to see nearby parking spaces</span>
            </div>
            <button
              type="button"
              onClick={requestUserLocation}
              className="text-yellow-900 hover:underline font-medium text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {gettingLocation && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Getting your location...</span>
          </div>
        )}

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
                {/* Image */}
                <div className="h-48 bg-gray-200 relative overflow-hidden">
                  {listing.images && listing.images.length > 0 ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center">
                      <span className="text-white text-6xl">🅿️</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Title */}
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                    {listing.title}
                  </h3>

                    {/* Distance */}
                    {listing.distance !== undefined && listing.distance !== null && (
                      <p className="text-xs font-medium text-green-600 mb-3 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {listing.distance} miles away
                      </p>
                    )}

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
