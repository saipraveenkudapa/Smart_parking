'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { isAuthenticated, getUser, logout } from '@/lib/clientAuth'

export default function Header() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check auth on mount and whenever route changes
  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(isAuthenticated())
      setUser(getUser())
    }
    
    checkAuth()
  }, [pathname]) // Re-check when pathname changes

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-green-600 hover:text-green-700 transition">
            <span className="text-3xl">🅿️</span>
            <span>Park-Connect</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {isLoggedIn ? (
              <>
                <Link
                  href="/search"
                  className="text-gray-700 hover:text-green-600 font-medium transition"
                >
                  Find Parking
                </Link>
                <Link
                  href="/renter/bookings"
                  className="text-gray-700 hover:text-blue-600 font-medium transition"
                >
                  My Bookings
                </Link>
                <Link
                  href="/vehicles"
                  className="text-gray-700 hover:text-purple-600 font-medium transition"
                >
                  My Vehicles
                </Link>
                <Link
                  href="/host/dashboard"
                  className="text-gray-700 hover:text-orange-600 font-medium transition"
                >
                  My Listings
                </Link>
                <Link
                  href="/host/list-space"
                  className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 font-semibold transition shadow-sm"
                >
                  + List Space
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-gray-700 hover:text-green-600 font-medium transition"
                  title="My Profile"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Link>
                <button
                  onClick={logout}
                  className="text-gray-700 hover:text-red-600 border border-gray-300 px-5 py-2.5 rounded-lg font-medium hover:border-red-600 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/search"
                  className="text-gray-700 hover:text-green-600 font-medium transition"
                >
                  Find Parking
                </Link>
                <Link href="/login" className="text-gray-700 hover:text-green-600 font-medium transition">
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-semibold transition shadow-sm"
                >
                  Sign Up
                </Link>
                <Link
                  href="/host/list-space"
                  className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 font-semibold transition shadow-sm"
                >
                  List Your Space
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-gray-700 hover:text-green-600 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            <nav className="flex flex-col gap-3">
              {isLoggedIn ? (
                <>
                  <Link href="/search" className="text-gray-700 hover:bg-green-50 hover:text-green-600 font-medium px-3 py-2 rounded transition">
                    Find Parking
                  </Link>
                  <Link href="/renter/bookings" className="text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium px-3 py-2 rounded transition">
                    My Bookings
                  </Link>
                  <Link href="/vehicles" className="text-gray-700 hover:bg-purple-50 hover:text-purple-600 font-medium px-3 py-2 rounded transition">
                    My Vehicles
                  </Link>
                  <Link href="/host/dashboard" className="text-gray-700 hover:bg-orange-50 hover:text-orange-600 font-medium px-3 py-2 rounded transition">
                    My Listings
                  </Link>
                  <Link href="/host/list-space" className="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 font-semibold text-center transition">
                    + List Space
                  </Link>
                  <Link href="/profile" className="text-gray-700 hover:bg-gray-50 hover:text-green-600 font-medium px-3 py-2 rounded transition flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    My Profile
                  </Link>
                  <button onClick={logout} className="text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-300 px-4 py-2.5 rounded-lg font-medium text-center transition">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/search" className="text-gray-700 hover:bg-green-50 hover:text-green-600 font-medium px-3 py-2 rounded transition">
                    Find Parking
                  </Link>
                  <Link href="/login" className="text-gray-700 hover:bg-green-50 hover:text-green-600 font-medium px-3 py-2 rounded transition">
                    Login
                  </Link>
                  <Link href="/signup" className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 font-semibold text-center transition">
                    Sign Up
                  </Link>
                  <Link href="/host/list-space" className="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 font-semibold text-center transition">
                    List Your Space
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
