'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { isAuthenticated, getUser, logout } from '@/lib/clientAuth'

export default function Header() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Check auth on mount and whenever route changes
  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(isAuthenticated())
      setUser(getUser())
    }
    
    checkAuth()
  }, [pathname]) // Re-check when pathname changes

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary-600">
          🅿️ Park-Connect
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/how-it-works" className="text-gray-600 hover:text-primary-600">
            How It Works
          </Link>
          
          {isLoggedIn ? (
            <>
              <span className="text-gray-600">
                Hi, {user?.fullName?.split(' ')[0]}
              </span>
              <Link
                href="/host/dashboard"
                className="text-gray-600 hover:text-green-600"
              >
                My Listings
              </Link>
              <Link
                href="/host/list-space"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                List My Space
              </Link>
              <Link
                href="/search"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Find Parking
              </Link>
              <button
                onClick={logout}
                className="text-gray-600 hover:text-primary-600 border border-gray-300 px-4 py-2 rounded-lg"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-primary-600">
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
              >
                Sign Up
              </Link>
              <Link
                href="/host/list-space"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Lease My Space
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
