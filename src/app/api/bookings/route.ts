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
    const { listingId, startDate, endDate, vehicleId, durationType } = body

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

    const pricing = await prisma.pricing_model.findFirst({
      where: {
        space_id: availability.space_id,
        is_current: true,
      },
      orderBy: {
        valid_from: 'desc',
      },
    })

    if (!pricing) {
      return NextResponse.json(
        { error: 'Pricing details are not configured for this parking space' },
        { status: 400 }
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

    const durationMs = end.getTime() - start.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)
    const hoursInDay = 24
    const hoursInWeek = hoursInDay * 7
    const hoursInMonth = hoursInDay * 30

    const hourlyRate = Number(pricing.hourly_rate) || 0
    const dailyRate = Number(pricing.daily_rate) || 0
    const weeklyRate = Number(pricing.weekly_rate) || 0
    const monthlyRate = Number(pricing.monthly_rate) || 0

    const billableHours = Math.max(durationHours, 0)
    const billableDays = Math.max(1, Math.ceil(billableHours / hoursInDay))
    const billableWeeks = Math.max(1, Math.ceil(billableHours / hoursInWeek))
    const billableMonths = Math.max(1, Math.ceil(billableHours / hoursInMonth))

    const hourlySubtotal = hourlyRate > 0 ? hourlyRate * billableHours : 0
    const dailySubtotal = dailyRate > 0 ? dailyRate * billableDays : 0
    const weeklySubtotal = weeklyRate > 0 ? weeklyRate * billableWeeks : 0
    const monthlySubtotal = monthlyRate > 0 ? monthlyRate * billableMonths : 0

    const normalizeType = (durationType || '').toLowerCase()
    let billingBasis: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'hourly'

    switch (normalizeType) {
      case '30m':
      case '1h':
        billingBasis = 'hourly'
        break
      case '1d':
      case '24h':
        billingBasis = 'daily'
        break
      case '1w':
        billingBasis = 'weekly'
        break
      case '1m':
        billingBasis = 'monthly'
        break
      default:
        if (billableHours >= hoursInMonth) {
          billingBasis = 'monthly'
        } else if (billableHours >= hoursInWeek) {
          billingBasis = 'weekly'
        } else if (billableHours >= hoursInDay) {
          billingBasis = 'daily'
        } else {
          billingBasis = 'hourly'
        }
    }

    const pickFirstNonZero = (...values: number[]) => {
      return values.find((value) => value > 0) || 0
    }

    let subtotal = 0
    switch (billingBasis) {
      case 'hourly':
        subtotal = pickFirstNonZero(
          hourlySubtotal,
          dailySubtotal,
          weeklySubtotal,
          monthlySubtotal,
        )
        break
      case 'daily':
        subtotal = pickFirstNonZero(
          dailySubtotal,
          hourlySubtotal,
          weeklySubtotal,
          monthlySubtotal,
        )
        break
      case 'weekly':
        subtotal = pickFirstNonZero(
          weeklySubtotal,
          dailySubtotal,
          hourlySubtotal,
          monthlySubtotal,
        )
        break
      case 'monthly':
        subtotal = pickFirstNonZero(
          monthlySubtotal,
          weeklySubtotal,
          dailySubtotal,
          hourlySubtotal,
        )
        break
    }

    if (subtotal <= 0) {
      return NextResponse.json(
        { error: 'Unable to calculate booking total. Please contact support.' },
        { status: 400 }
      )
    }

    const serviceFeePercentage = 0.15 // 15% service fee

    const serviceFee = subtotal * serviceFeePercentage
    const totalAmount = subtotal + serviceFee
    const ownerPayout = subtotal - (subtotal * 0.05) // Owner gets 95% of subtotal

    // Create payout record first (required by bookings FK)
    const payout = await prisma.payout.create({
      data: {
        method: 'pending',
        status: 'pending',
      },
    })

    // Create the booking (using bookings)
    // Note: bookings links to availability_id, not directly to space_id
    const booking = await prisma.bookings.create({
      data: {
        availability_id: availability.availability_id,
        driver_id: userId,
        payout_id: payout.payout_id,
        start_time: start,
        end_time: end,
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
      id: booking.booking_id, // for frontend compatibility
      bookingId: booking.booking_id,
      spaceId: booking.availability.space_id,
      driverId: booking.driver_id,
      startTime: booking.start_time,
      endTime: booking.end_time,
      totalAmount: Number(booking.total_amount),
      serviceFee: booking.service_fee != null ? Number(booking.service_fee) : null,
      ownerPayout: Number(booking.owner_payout),
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
                pricing_models: {
                  where: {
                    is_current: true,
                  },
                  orderBy: {
                    valid_from: 'desc',
                  },
                  take: 1,
                },
              },
            },
            users: {
              select: {
                user_id: true,
                full_name: true,
                email: true,
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

    // Map response for frontend compatibility
    const mappedBookings = bookings.map((booking: typeof bookings[0]) => {
      const pricing = booking.availability?.parking_spaces?.pricing_models?.[0]
      const monthlyPrice = pricing ? Number(pricing.monthly_rate) : 0

      return {
        id: booking.booking_id.toString(),
        startDate: booking.start_time,
        endDate: booking.end_time,
        vehicleDetails: '', // Not available in schema, set as empty or fetch if possible
        status: (booking.booking_status || '').toUpperCase(),
        createdAt: booking.start_time, // bookings does not have created_at, use start_time
        listing: {
          id: booking.availability?.space_id?.toString() || '',
          title: booking.availability?.parking_spaces?.title || '',
          address: booking.availability?.parking_spaces?.space_location?.address || '',
          city: booking.availability?.parking_spaces?.space_location?.city || '',
          state: booking.availability?.parking_spaces?.space_location?.state || '',
          zipCode: booking.availability?.parking_spaces?.space_location?.zip_code || '',
          monthlyPrice,
          host: {
            id: booking.availability?.users?.user_id?.toString() || '',
            fullName: booking.availability?.users?.full_name || '',
            email: booking.availability?.users?.email || '',
            phoneNumber: booking.availability?.users?.phone_number || '',
          },
          distance: null,
        },
      }
    })

    return NextResponse.json({ bookings: mappedBookings })
  } catch (error) {
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}
