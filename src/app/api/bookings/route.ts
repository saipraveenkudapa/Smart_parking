import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// POST - Create a booking request
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { listingId, startDate, endDate, vehicleDetails } = body

    if (!listingId || !startDate || !endDate || !vehicleDetails) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if listing exists and is active
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    })

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (!listing.isActive) {
      return NextResponse.json(
        { error: 'This listing is not currently available' },
        { status: 400 }
      )
    }

    // Prevent booking own listing
    if (listing.hostId === payload.userId) {
      return NextResponse.json(
        { error: 'You cannot book your own listing' },
        { status: 400 }
      )
    }

        // Validate dates
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : null
    
    if (start < new Date()) {
      return NextResponse.json(
        { error: 'Start date must be in the future' },
        { status: 400 }
      )
    }

    // Calculate pricing (assuming monthly bookings)
    const monthsDiff = end 
      ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 1
    
    const totalMonths = Math.max(1, monthsDiff)
    const platformFeePercentage = 0.15 // 15% platform fee
    const subtotal = listing.monthlyPrice * totalMonths
    const platformFee = subtotal * platformFeePercentage
    const totalAmount = subtotal + platformFee

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        listingId,
        renterId: payload.userId,
        startDate: start,
        endDate: end,
        vehicleDetails,
        monthlyPrice: listing.monthlyPrice,
        totalMonths,
        platformFee,
        totalAmount,
        status: 'PENDING',
      },
      include: {
        listing: {
          select: {
            title: true,
            address: true,
            monthlyPrice: true,
          },
        },
        renter: {
          select: {
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Booking request created successfully',
        booking,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create booking error:', error)
    return NextResponse.json(
      { error: 'Failed to create booking request' },
      { status: 500 }
    )
  }
}

// GET - Get user's bookings (as renter)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const bookings = await prisma.booking.findMany({
      where: {
        renterId: payload.userId,
      },
      include: {
        listing: {
          select: {
            title: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            monthlyPrice: true,
            host: {
              select: {
                fullName: true,
                phoneNumber: true,
                emailVerified: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ bookings })
  } catch (error) {
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}
