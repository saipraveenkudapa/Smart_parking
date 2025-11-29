'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import AddressAutocomplete from '@/components/AddressAutocomplete'


interface Listing {
  id: string
  title: string
  address: string
  city: string
  state: string
  spaceType: string
  monthlyPrice: number
  hasCCTV: boolean
  hasEVCharging: boolean
  images?: string[]
  latitude?: number | null
  longitude?: number | null
}


export default function HomePage() {
  const router = useRouter()
  const [searchLocation, setSearchLocation] = useState('')
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([])
  const [loadingListings, setLoadingListings] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    // Fetch available parking spaces
    fetchFeaturedListings()
    // Get user geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          setUserLocation(null)
        }
      )
    }
  }, [])
  // Haversine formula to calculate miles between two lat/lng
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // km
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // km
    return Math.round(distance * 0.621371 * 10) / 10 // miles, 1 decimal
  }

  const fetchFeaturedListings = async () => {
    try {
      const response = await fetch('/api/listings')
      const data = await response.json()
      if (response.ok && data.listings) {
        setFeaturedListings(data.listings.slice(0, 6)) // Show only 6 listings
      } else {
        // Handle empty or error response gracefully
        setFeaturedListings([])
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error)
      setFeaturedListings([]) // Set empty array on error
    } finally {
      setLoadingListings(false)
    }
  }

  const handleLocationSelect = (addressComponents: {
    fullAddress: string
    streetAddress: string
    city: string
    state: string
    zipCode: string
    latitude?: number
    longitude?: number
  }) => {
    const location = addressComponents.zipCode 
      ? `${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipCode}`
      : addressComponents.fullAddress
    
    setSearchLocation(location)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchLocation) {
      router.push(`/search?location=${encodeURIComponent(searchLocation)}`)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-green-50 via-white to-blue-50">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Find Your Perfect<br />
            <span className="text-green-600">Parking Space</span>
          </h1>
          <p className="text-2xl text-gray-600 mb-10">
            Connect with locals who have unused parking spaces and save up to 50%
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto mb-16">
          <form onSubmit={handleSearch} className="flex gap-3 shadow-xl rounded-xl overflow-hidden">
            <div className="flex-1">
              <AddressAutocomplete
                onAddressSelect={handleLocationSelect}
                placeholder="Enter your location or ZIP code..."
                className="w-full px-8 py-5 text-lg border-0 focus:outline-none focus:ring-0"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-green-600 text-white px-12 py-5 text-lg font-bold hover:bg-green-700 transition"
            >
              Find Parking
            </button>
          </form>
          <p className="text-sm text-gray-500 text-center mt-3">
            💡 Start typing to see address suggestions
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{featuredListings.length}+</div>
            <p className="text-gray-600">Available Spaces</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">50%</div>
            <p className="text-gray-600">Cost Savings</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">100%</div>
            <p className="text-gray-600">Verified Listings</p>
          </div>
        </div>
      </section>

      {/* Available Parking Spaces */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Available Parking Spaces</h2>
            <p className="text-xl text-gray-600">Browse parking spaces near you</p>
          </div>

          {loadingListings ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              <p className="text-gray-600 mt-4">Loading parking spaces...</p>
            </div>
          ) : featuredListings.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {featuredListings.map((listing) => (
                  <div key={listing.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow">
                    <div className="h-48 bg-linear-to-br from-green-400 to-green-600 relative">
                      {listing.images && listing.images.length > 0 ? (
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white text-6xl">🅿️</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-bold mb-2 line-clamp-1">{listing.title}</h3>
                      {userLocation && listing.latitude && listing.longitude && (
                        <p className="text-sm text-gray-600 mb-3">📍 {calculateDistance(userLocation.lat, userLocation.lng, listing.latitude, listing.longitude)} miles away</p>
                      )}
                      <div className="flex gap-2 mb-3">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{listing.spaceType}</span>
                        {listing.hasCCTV && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">📹 CCTV</span>}
                        {listing.hasEVCharging && <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">⚡ EV</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-3xl font-bold text-green-600">${listing.monthlyPrice}</span>
                          <span className="text-gray-500">/mo</span>
                        </div>
                        <Link href={`/listing/${listing.id}`} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold transition">
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Link href="/search" className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-bold text-lg transition">
                  View All Parking Spaces →
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🅿️</div>
              <p className="text-gray-600 text-lg">No parking spaces available yet.</p>
              <Link href="/host/list-space" className="inline-block mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold">
                List Your Space
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-linear-to-b from-white to-green-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How Park-Connect Works</h2>
            <p className="text-xl text-gray-600">Getting started is easy</p>
          </div>

          {/* For Renters */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-blue-600 mb-8 text-center">🚗 For Renters</h3>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                <div className="text-6xl mb-4">1️⃣</div>
                <h4 className="text-2xl font-bold mb-3">Search</h4>
                <p className="text-gray-600">Find parking spaces near you. Filter by price, features, and location.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                <div className="text-6xl mb-4">2️⃣</div>
                <h4 className="text-2xl font-bold mb-3">Book</h4>
                <p className="text-gray-600">Choose your spot and complete booking with secure payment.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                <div className="text-6xl mb-4">3️⃣</div>
                <h4 className="text-2xl font-bold mb-3">Park</h4>
                <p className="text-gray-600">Get access instructions and start parking. Simple and hassle-free!</p>
              </div>
            </div>
          </div>

          {/* For Hosts */}
          <div className="mb-12">
            <h3 className="text-3xl font-bold text-green-600 mb-8 text-center">🏠 For Hosts</h3>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                <div className="text-6xl mb-4">1️⃣</div>
                <h4 className="text-2xl font-bold mb-3">List</h4>
                <p className="text-gray-600">Create a listing for your unused parking space with photos and details.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                <div className="text-6xl mb-4">2️⃣</div>
                <h4 className="text-2xl font-bold mb-3">Accept</h4>
                <p className="text-gray-600">Review booking requests and set your availability.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                <div className="text-6xl mb-4">3️⃣</div>
                <h4 className="text-2xl font-bold mb-3">Earn</h4>
                <p className="text-gray-600">Get paid monthly. Turn unused space into passive income!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Park-Connect?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-linear-to-br from-green-50 to-green-100 p-8 rounded-xl text-center">
              <div className="text-5xl mb-4">💰</div>
              <h3 className="text-2xl font-bold mb-3">Save Money</h3>
              <p className="text-gray-700">Up to 50% cheaper than traditional parking lots and garages.</p>
            </div>
            <div className="bg-linear-to-br from-blue-50 to-blue-100 p-8 rounded-xl text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-2xl font-bold mb-3">Secure & Safe</h3>
              <p className="text-gray-700">Verified users, secure payments, and trusted community.</p>
            </div>
            <div className="bg-linear-to-br from-purple-50 to-purple-100 p-8 rounded-xl text-center">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-2xl font-bold mb-3">Easy to Use</h3>
              <p className="text-gray-700">Book in minutes with our simple and intuitive platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-linear-to-r from-green-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">Join thousands of users finding affordable parking or earning passive income.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/search" className="bg-white text-green-600 px-10 py-4 rounded-lg hover:bg-gray-100 text-lg font-bold transition shadow-lg">
              Find Parking
            </Link>
            <Link href="/host/list-space" className="bg-yellow-400 text-gray-900 px-10 py-4 rounded-lg hover:bg-yellow-300 text-lg font-bold transition shadow-lg">
              List Your Space
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="text-3xl font-bold mb-4">🅿️ Park-Connect</div>
            <p className="text-gray-400 mb-6">Making parking affordable and accessible for everyone.</p>
            <p className="text-gray-500">© 2025 Park-Connect. College Project Demo.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
