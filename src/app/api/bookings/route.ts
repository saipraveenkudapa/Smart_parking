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

    // Verify vehicle belongs to user
    const vehicle = await prisma.vehicle.findUnique({
      where: { vehicleId: vehId },
    })

    if (!vehicle || vehicle.userId !== userId) {
      return NextResponse.json(
        { error: 'Vehicle not found or does not belong to you' },
        { status: 403 }
      )
    }

    // Check if parking space exists and is active
    const parkingSpace = await prisma.parkingSpace.findUnique({
      where: { spaceId },
    })

    if (!parkingSpace) {
      return NextResponse.json(
        { error: 'Parking space not found' },
        { status: 404 }
      )
    }

    if (parkingSpace.status !== 'active') {
      return NextResponse.json(
        { error: 'This parking space is not currently available' },
        { status: 400 }
      )
    }

    // Prevent booking own listing
    if (parkingSpace.ownerId === userId) {
      return NextResponse.json(
        { error: 'You cannot book your own parking space' },
        { status: 400 }
      )
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    
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
    
    // Calculate pricing (use hourly rate or monthly rate)
    const serviceFeePercentage = 0.15 // 15% service fee
    const hourlyRate = parseFloat(parkingSpace.hourlyRate?.toString() || '0')
    const monthlyRate = parseFloat(parkingSpace.monthlyRate?.toString() || '0')
    
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

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        spaceId,
        driverId: userId,
        vehicleId: vehId,
        startTime: start,
        endTime: end,
        durationHours,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        serviceFee: parseFloat(serviceFee.toFixed(2)),
        ownerPayout: parseFloat(ownerPayout.toFixed(2)),
        bookingStatus: 'pending',
        paymentStatus: 'pending',
      },
      include: {
        space: {
          select: {
            title: true,
            address: true,
            city: true,
            hourlyRate: true,
            monthlyRate: true,
          },
        },
        driver: {
          select: {
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        vehicle: {
          select: {
            make: true,
            model: true,
            licensePlate: true,
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
        driverId: parseInt(payload.userId),
      },
      include: {
        space: {
          select: {
            title: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            hourlyRate: true,
            monthlyRate: true,
            owner: {
              select: {
                fullName: true,
                phoneNumber: true,
                isVerified: true,
              },
            },
          },
        },
        vehicle: {
          select: {
            make: true,
            model: true,
            licensePlate: true,
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
