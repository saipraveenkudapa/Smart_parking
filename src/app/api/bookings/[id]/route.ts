import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// PATCH - Update booking status (approve/reject/cancel)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await req.json()
    const { status } = body

    // Convert to integer
    const bookingId = parseInt(id)
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      )
    }

    const validStatuses = ['confirmed', 'cancelled', 'completed']
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid status. Must be confirmed, cancelled, or completed' },
        { status: 400 }
      )
    }

    // Get the booking with space and availability details
    const booking = await prisma.bookings.findUnique({
      where: { booking_id: bookingId },
      include: {
        availability: {
          select: {
            owner_id: true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const userId = parseInt(payload.userId)

    // Check permissions
    // Owner can confirm/complete, driver can cancel
    if (status.toLowerCase() === 'cancelled') {
      if (booking.driver_id !== userId) {
        return NextResponse.json(
          { error: 'Only the driver can cancel this booking' },
          { status: 403 }
        )
      }
    } else {
      if (booking.availability?.owner_id !== userId) {
        return NextResponse.json(
          { error: 'Only the parking space owner can confirm or complete this booking' },
          { status: 403 }
        )
      }
    }

    // Update the booking
    const updatedBooking = await prisma.bookings.update({
      where: { booking_id: bookingId },
      data: {
        booking_status: status.toLowerCase(),
        ...(status.toLowerCase() === 'cancelled' && {
          cancellation_reason: 'Cancelled by user',
        }),
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
          },
        },
      },
    })

    // Map response for API compatibility
    const response = {
      bookingId: updatedBooking.booking_id,
      driverId: updatedBooking.driver_id,
      startTime: updatedBooking.start_time,
      endTime: updatedBooking.end_time,
      totalAmount: updatedBooking.total_amount,
      serviceFee: updatedBooking.service_fee,
      ownerPayout: updatedBooking.owner_payout,
      bookingStatus: updatedBooking.booking_status,
      paymentStatus: updatedBooking.payment_status,
      space: {
        title: updatedBooking.availability?.parking_spaces?.title,
        address: updatedBooking.availability?.parking_spaces?.space_location?.address,
      },
      driver: {
        fullName: updatedBooking.users?.full_name,
        email: updatedBooking.users?.email,
      },
    }

    return NextResponse.json({
      message: `Booking ${status.toLowerCase()} successfully`,
      booking: response,
    })
  } catch (error) {
    console.error('Update booking error:', error)
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    )
  }
}
