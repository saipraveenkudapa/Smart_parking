'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import AddressAutocomplete from '@/components/AddressAutocomplete'

export default function HomePage() {
  const router = useRouter()
  const [searchLocation, setSearchLocation] = useState('')

  const handleLocationSelect = (addressComponents: {
    fullAddress: string
    streetAddress: string
    city: string
    state: string
    zipCode: string
    latitude?: number
    longitude?: number
  }) => {
    // Use full address for search or construct from components
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Find Monthly Parking.<br />Save Money.
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Connect with locals who have unused parking spaces
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-16">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <AddressAutocomplete
                onAddressSelect={handleLocationSelect}
                placeholder="Enter address or location..."
                className="w-full px-6 py-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-primary-600 text-white px-8 py-4 text-lg font-semibold rounded-lg hover:bg-primary-700"
            >
              Search
            </button>
          </form>
          <p className="text-sm text-gray-500 text-center mt-2">
            💡 Start typing to see address suggestions from Google Maps
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">Find Parking</h3>
            <p className="text-gray-600">
              Browse thousands of available parking spaces in your area
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">Save Money</h3>
            <p className="text-gray-600">
              Get up to 50% cheaper than traditional parking lots
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Secure Booking</h3>
            <p className="text-gray-600">
              Safe payments and verified listings for peace of mind
            </p>
          </div>
        </div>

        {/* Popular Cities */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-6">Popular Parking Areas</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'].map(
              (city) => (
                <Link
                  key={city}
                  href={`/search?location=${encodeURIComponent(city)}`}
                  className="px-6 py-2 bg-gray-100 rounded-full hover:bg-primary-100 hover:text-primary-700"
                >
                  {city}
                </Link>
              )
            )}
          </div>
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
