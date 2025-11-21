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

    // Map response for API compatibility
    const mappedBookings = bookings.map((booking: typeof bookings[0]) => ({
      bookingId: booking.booking_id,
      spaceId: booking.availability?.space_id,
      driverId: booking.driver_id,
      startTime: booking.start_time,
      endTime: booking.end_time,
      totalAmount: booking.total_amount,
      serviceFee: booking.service_fee,
      ownerPayout: booking.owner_payout,
      bookingStatus: booking.booking_status,
      paymentStatus: booking.payment_status,
      space: {
        title: booking.availability?.parking_spaces?.title,
        address: booking.availability?.parking_spaces?.space_location?.address,
        city: booking.availability?.parking_spaces?.space_location?.city,
        hourlyRate: null, // pricing_model not included due to complex primary key
        monthlyRate: null,
      },
      driver: {
        fullName: booking.users?.full_name,
        email: booking.users?.email,
        phoneNumber: booking.users?.phone_number,
        isVerified: booking.users?.is_verified,
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
