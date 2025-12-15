import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const addOneCalendarMonthClampedUtc = (date: Date) => {
  // Preserve the same clock time (UTC) and clamp to the last valid day of the target month.
  const year = date.getUTCFullYear()
  const monthIndex = date.getUTCMonth()
  const day = date.getUTCDate()
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const seconds = date.getUTCSeconds()
  const ms = date.getUTCMilliseconds()

  // Start at the first day of the next month to find its last day.
  const firstOfNextMonth = new Date(Date.UTC(year, monthIndex + 1, 1, hours, minutes, seconds, ms))
  const firstOfFollowingMonth = new Date(
    Date.UTC(firstOfNextMonth.getUTCFullYear(), firstOfNextMonth.getUTCMonth() + 1, 1, hours, minutes, seconds, ms)
  )
  const lastDayOfNextMonth = new Date(firstOfFollowingMonth.getTime() - 1)
  const clampedDay = Math.min(day, lastDayOfNextMonth.getUTCDate())

  return new Date(
    Date.UTC(
      firstOfNextMonth.getUTCFullYear(),
      firstOfNextMonth.getUTCMonth(),
      clampedDay,
      hours,
      minutes,
      seconds,
      ms
    )
  )
}

const validateDurationType = (
  durationType: unknown,
  start: Date,
  end: Date
) => {
  const normalizeType = (typeof durationType === 'string' ? durationType : '')
    .trim()
    .toLowerCase()

  const durationMs = end.getTime() - start.getTime()
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new ApiError(400, 'End date must be after start date')
  }

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day

  const assertExact = (expectedMs: number, label: string) => {
    if (durationMs !== expectedMs) {
      throw new ApiError(400, `Selected durationType requires exactly ${label}`)
    }
  }

  const assertMultipleOf = (unitMs: number, label: string) => {
    if (durationMs < unitMs) {
      throw new ApiError(400, `Selected durationType requires at least ${label}`)
    }
    if (durationMs % unitMs !== 0) {
      throw new ApiError(400, `Selected durationType requires time to be in ${label} increments`)
    }
  }

  switch (normalizeType) {
    case '30m':
      assertMultipleOf(30 * minute, '30 minutes')
      break
    case '1h':
      assertMultipleOf(hour, '1 hour')
      break
    case '1d':
    case '24h':
      assertExact(day, '24 hours')
      break
    case '1w':
      assertExact(week, '7 days')
      break
    case '1m':
      {
        const expectedEnd = addOneCalendarMonthClampedUtc(start)
        if (end.getTime() !== expectedEnd.getTime()) {
          throw new ApiError(
            400,
            'Selected durationType requires end time to be the same clock time on the same calendar day next month (clamped to month end)'
          )
        }
      }
      break
    case 'custom':
    default:
      if (durationMs < 30 * minute) {
        throw new ApiError(400, 'Minimum booking duration is 30 minutes')
      }
      break
  }

  return normalizeType
}

const mapStatusToUi = (status?: string) => {
  const normalized = (status || '').toLowerCase()
  switch (normalized) {
    case 'confirmed':
    case 'completed':
      return 'APPROVED'
    case 'cancelled':
      return 'CANCELLED'
    case 'rejected':
      return 'REJECTED'
    default:
      return 'PENDING'
  }
}

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

    // Enforce duration rules based on durationType (booking-type locking)
    const normalizeType = validateDurationType(durationType, start, end)

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

    const booking = await prisma.$transaction(
      async (tx) => {
        // Submit-time validation (prevents race-condition double bookings)
        const availability = await tx.availability.findFirst({
          where: {
            space_id: spaceId,
            is_available: true,
            available_start: { lte: start },
            available_end: { gte: end },
          },
          include: {
            parking_spaces: {
              include: {
                space_location: true,
              },
            },
          },
        })

        if (!availability || !availability.parking_spaces) {
          throw new ApiError(
            404,
            'Parking space not found or not available for the selected dates'
          )
        }

        // Prevent user from booking their own space
        if (availability.owner_id === userId) {
          throw new ApiError(400, 'You cannot book your own parking space')
        }

        const pricing = await tx.pricing_model.findFirst({
          where: {
            space_id: availability.space_id,
            is_current: true,
          },
          orderBy: {
            valid_from: 'desc',
          },
        })

        if (!pricing) {
          throw new ApiError(
            400,
            'Pricing details are not configured for this parking space'
          )
        }

        // Check for overlapping bookings - prevent double-booking
        // Two bookings overlap if: new_start < existing_end AND new_end > existing_start
        // Pending bookings DO block availability.
        const overlappingBookings = await tx.bookings.findFirst({
          where: {
            availability: {
              space_id: spaceId,
            },
            NOT: {
              booking_status: {
                in: ['cancelled', 'rejected'],
                mode: 'insensitive',
              },
            },
            AND: [
              { start_time: { lt: end } },
              { end_time: { gt: start } },
            ],
          },
          select: {
            booking_id: true,
          },
        })

        if (overlappingBookings) {
          throw new ApiError(
            409,
            'This parking space is already booked for the selected dates. Please choose different dates.'
          )
        }

        // Calculate duration and pricing based on booking type
        const durationMs = end.getTime() - start.getTime()
        const durationHours = durationMs / (1000 * 60 * 60)
        const durationDays = durationMs / (1000 * 60 * 60 * 24)
        const durationWeeks = durationDays / 7
        const durationMonths = durationDays / 30

        const hourlyRate = Number(pricing.hourly_rate) || 0
        const dailyRate = Number(pricing.daily_rate) || 0
        const weeklyRate = Number(pricing.weekly_rate) || 0
        const monthlyRate = Number(pricing.monthly_rate) || 0

        let subtotal = 0

        switch (normalizeType) {
          case '30m':
          case '1h':
            subtotal = hourlyRate * Math.ceil(durationHours)
            break
          case '1d':
          case '24h':
            subtotal = dailyRate * Math.ceil(durationDays)
            break
          case '1w':
            subtotal = weeklyRate * Math.ceil(durationWeeks)
            break
          case '1m':
            subtotal = monthlyRate
            break
          case 'custom':
          default:
            if (durationDays >= 30) {
              subtotal = monthlyRate * Math.ceil(durationMonths)
            } else if (durationDays >= 7) {
              subtotal = weeklyRate * Math.ceil(durationWeeks)
            } else if (durationDays >= 1) {
              subtotal = dailyRate * Math.ceil(durationDays)
            } else {
              subtotal = hourlyRate * Math.ceil(durationHours)
            }
            break
        }

        if (subtotal <= 0) {
          throw new ApiError(
            400,
            'Unable to calculate booking total. Please contact support.'
          )
        }

        const serviceFeePercentage = 0.15 // 15% service fee
        const serviceFee = subtotal * serviceFeePercentage
        const totalAmount = subtotal + serviceFee
        const ownerPayout = subtotal - subtotal * 0.05 // Owner gets 95% of subtotal

        const payout = await tx.payout.create({
          data: {
            method: 'pending',
            status: 'pending',
          },
        })

        return tx.bookings.create({
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
      },
      {
        isolationLevel: 'Serializable',
      }
    )

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
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
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
    const cookieToken = req.cookies.get('token')?.value
    const token = authHeader?.replace('Bearer ', '') || cookieToken

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
        totalAmount: Number(booking.total_amount),
        vehicleDetails: '', // Not available in schema, set as empty or fetch if possible
        status: mapStatusToUi(booking.booking_status),
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
