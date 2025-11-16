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
    // Note: Need to query via fact_availability to find owner's bookings
    const bookings = await prisma.fact_bookings.findMany({
      where: {
        fact_availability: {
          owner_id: parseInt(payload.userId),
        },
      },
      include: {
        fact_availability: {
          include: {
            dim_parking_spaces: {
              include: {
                dim_space_location: true,
                dim_pricing_model: true,
              },
            },
          },
        },
        dim_users: {
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
    const mappedBookings = bookings.map((booking) => ({
      bookingId: booking.booking_id,
      spaceId: booking.fact_availability?.space_id,
      driverId: booking.driver_id,
      startTime: booking.start_time,
      endTime: booking.end_time,
      durationHours: booking.duration_hours,
      totalAmount: booking.total_amount,
      serviceFee: booking.service_fee,
      ownerPayout: booking.owner_payout,
      bookingStatus: booking.booking_status,
      paymentStatus: booking.payment_status,
      space: {
        title: booking.fact_availability?.dim_parking_spaces?.title,
        address: booking.fact_availability?.dim_parking_spaces?.dim_space_location?.address,
        city: booking.fact_availability?.dim_parking_spaces?.dim_space_location?.city,
        hourlyRate: booking.fact_availability?.dim_parking_spaces?.dim_pricing_model?.hourly_rate,
        monthlyRate: booking.fact_availability?.dim_parking_spaces?.dim_pricing_model?.monthly_rate,
      },
      driver: {
        fullName: booking.dim_users?.full_name,
        email: booking.dim_users?.email,
        phoneNumber: booking.dim_users?.phone_number,
        isVerified: booking.dim_users?.is_verified,
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
