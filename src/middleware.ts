import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  // Protected routes that require authentication
  const protectedRoutes = ['/host/list-space', '/host/dashboard', '/renter/bookings', '/renter/dashboard']
  
  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute && !token) {
    // Redirect to login with return URL
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname)
    url.searchParams.set('message', 'Please login to access this page')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/host/:path*',
    '/renter/:path*',
  ],
}
