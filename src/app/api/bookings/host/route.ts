import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Get bookings for host's listings
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

    // Get bookings for parking spaces owned by this host
    // Note: Need to query via availability to find owner's bookings
    const bookings = await prisma.bookings.findMany({
      where: {
        availability: {
          owner_id: parseInt(payload.userId),
        },
      },
      include: {
        availability: {
          include: {
            parking_spaces: {
              include: {
                space_location: true,
              },
            },
          },
        },
        users: {
          select: {
            full_name: true,
            email: true,
            phone_number: true,
            is_verified: true,
          },
        },
      },
      orderBy: {
        booking_id: 'desc',
      },
    })

    // Map response so the dashboard can render booking requests without another transform
    const mappedBookings = bookings.map((booking: typeof bookings[0]) => ({
      id: booking.booking_id.toString(),
      startDate: booking.start_time,
      endDate: booking.end_time,
      vehicleDetails: 'Vehicle details unavailable',
      status: (booking.booking_status || '').toUpperCase(),
      createdAt: booking.start_time,
      renter: {
        id: booking.driver_id.toString(),
        fullName: booking.users?.full_name || 'Unknown Renter',
        email: booking.users?.email || 'Not Provided',
        phoneNumber: booking.users?.phone_number || 'Not Provided',
        emailVerified: !!booking.users?.is_verified,
      },
      listing: {
        id: booking.availability?.space_id?.toString() || '',
        title: booking.availability?.parking_spaces?.title || 'Parking Space',
        address: booking.availability?.parking_spaces?.space_location?.address || 'Address unavailable',
      },
    }))

    return NextResponse.json({ bookings: mappedBookings })
  } catch (error) {
    console.error('Get host bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}
