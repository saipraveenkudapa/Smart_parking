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
    const { listingId, startDate, endDate, vehicleId } = body

    if (!listingId || !startDate || !endDate || !vehicleId) {
      return NextResponse.json(
        { error: 'Missing required fields: listingId, startDate, endDate, vehicleId' },
        { status: 400 }
      )
    }

    // Convert IDs to integers
    const spaceId = parseInt(listingId)
    const userId = parseInt(payload.userId)
    const vehId = parseInt(vehicleId)

    if (isNaN(spaceId) || isNaN(vehId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

    // Validate dates first so we can use them in availability check
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    // Verify vehicle belongs to user (using dim_vehicle)
    const vehicle = await prisma.vehicle.findUnique({
      where: {
        vehicle_id: vehId,
      },
    })

    if (!vehicle || vehicle.user_id !== userId) {
      return NextResponse.json(
        { error: 'Vehicle not found or does not belong to you' },
        { status: 400 }
      )
    }

    // Check if parking space exists and get availability
    // Note: parking_spaces doesn't have owner_id or isApproved
    // We need to check availability for availability and ownership
    const availability = await prisma.availability.findFirst({
      where: {
        space_id: spaceId,
        is_available: true,
        available_start: { lte: start },
        available_end: { gte: end },
      },
      include: {
        parking_spaces: true,
      },
    })

    if (!availability || !availability.parking_spaces) {
      return NextResponse.json(
        { error: 'Parking space not found or not available for the selected dates' },
        { status: 404 }
      )
    }

    // Prevent user from booking their own space
    if (availability.owner_id === userId) {
      return NextResponse.json(
        { error: 'You cannot book your own parking space' },
        { status: 400 }
      )
    }
    
    if (start < new Date()) {
      return NextResponse.json(
        { error: 'Start date must be in the future' },
        { status: 400 }
      )
    }

    if (end <= start) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Calculate duration in hours
    const durationHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60))
    
    // Calculate pricing (use default hourly rate since pricing_model has complex key)
    const serviceFeePercentage = 0.15 // 15% service fee
    const hourlyRate = 5.0 // Default hourly rate
    const monthlyRate = 0
    
    // Use hourly rate if available, otherwise pro-rate monthly
    let subtotal = 0
    if (hourlyRate > 0) {
      subtotal = hourlyRate * durationHours
    } else if (monthlyRate > 0) {
      // Pro-rate monthly to hourly (assuming 720 hours per month)
      const hourlyFromMonthly = monthlyRate / 720
      subtotal = hourlyFromMonthly * durationHours
    }

    const serviceFee = subtotal * serviceFeePercentage
    const totalAmount = subtotal + serviceFee
    const ownerPayout = subtotal - (subtotal * 0.05) // Owner gets 95% of subtotal

    // Create the booking (using bookings)
    // Note: bookings links to availability_id, not directly to space_id
    const booking = await prisma.bookings.create({
      data: {
        availability_id: availability.availability_id,
        driver_id: userId,
        start_time: start,
        end_time: end,
        duration_hours: durationHours,
        total_amount: parseFloat(totalAmount.toFixed(2)),
        service_fee: parseFloat(serviceFee.toFixed(2)),
        owner_payout: parseFloat(ownerPayout.toFixed(2)),
        booking_status: 'pending',
        payment_status: 'pending',
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
          },
        },
      },
    })

    // Map response for API compatibility
    const response = {
      bookingId: booking.booking_id,
      spaceId: booking.availability?.space_id,
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
        title: booking.availability?.parking_spaces?.title,
        address: booking.availability?.parking_spaces?.space_location?.address,
        city: booking.availability?.parking_spaces?.space_location?.city,
        hourlyRate: null,
        monthlyRate: null,
      },
      driver: {
        fullName: booking.users?.full_name,
        email: booking.users?.email,
        phoneNumber: booking.users?.phone_number,
      },
    }

    return NextResponse.json(
      {
        message: 'Booking request created successfully',
        booking: response,
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

    const bookings = await prisma.bookings.findMany({
      where: {
        driver_id: parseInt(payload.userId),
      },
      include: {
        availability: {
          include: {
            parking_spaces: {
              include: {
                space_location: true,
              },
            },
            users: {
              select: {
                full_name: true,
                phone_number: true,
                is_verified: true,
              },
            },
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
      durationHours: booking.duration_hours,
      totalAmount: booking.total_amount,
      serviceFee: booking.service_fee,
      ownerPayout: booking.owner_payout,
      bookingStatus: booking.booking_status,
      paymentStatus: booking.payment_status,
      space: {
        title: booking.availability?.parking_spaces?.title,
        address: booking.availability?.parking_spaces?.space_location?.address,
        city: booking.availability?.parking_spaces?.space_location?.city,
        state: booking.availability?.parking_spaces?.space_location?.state,
        zipCode: booking.availability?.parking_spaces?.space_location?.zip_code,
        hourlyRate: null, // pricing_model not included due to complex primary key
        monthlyRate: null,
        owner: {
          fullName: booking.availability?.users?.full_name,
          phoneNumber: booking.availability?.users?.phone_number,
          isVerified: booking.availability?.users?.is_verified,
        },
      },
    }))

    return NextResponse.json({ bookings: mappedBookings })
  } catch (error) {
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}
