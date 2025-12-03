import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Retrieve a single booking (driver only)
export async function GET(
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
    const bookingId = parseInt(id)
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      )
    }

    const booking = await prisma.bookings.findUnique({
      where: { booking_id: bookingId },
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

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const userId = parseInt(payload.userId)
    if (booking.driver_id !== userId) {
      return NextResponse.json(
        { error: 'You do not have access to this booking' },
        { status: 403 }
      )
    }

    const response = {
      bookingId: booking.booking_id,
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
      },
      driver: {
        fullName: booking.users?.full_name,
        email: booking.users?.email,
      },
    }

    return NextResponse.json({ booking: response })
  } catch (error) {
    console.error('Get booking error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    )
  }
}

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
    const { status, paymentStatus } = body

    // Convert to integer
    const bookingId = parseInt(id)
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      )
    }

    const validStatuses = ['confirmed', 'cancelled', 'completed', 'rejected']
    if (status && !validStatuses.includes(status.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid status. Must be confirmed, cancelled, completed, or rejected' },
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
    if (status) {
      const statusLower = status.toLowerCase()

      if (statusLower === 'cancelled') {
        // Allow driver to cancel their own booking
        // Also allow owner to cancel if they need to terminate the booking before confirmation
        if (booking.driver_id !== userId && booking.availability?.owner_id !== userId) {
          return NextResponse.json(
            { error: 'Only the driver or parking space owner can cancel this booking' },
            { status: 403 }
          )
        }
      } else if (statusLower === 'rejected') {
        if (booking.availability?.owner_id !== userId) {
          return NextResponse.json(
            { error: 'Only the parking space owner can reject this booking' },
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
    }

    // Allow driver to update payment status (e.g., after completing payment)
    if (paymentStatus) {
      // Only the driver who created the booking can update paymentStatus
      if (booking.driver_id !== userId) {
        return NextResponse.json(
          { error: 'Only the booking driver can update payment status' },
          { status: 403 }
        )
      }
    }

    // Update the booking
    const updateData: any = {}
    if (status) {
      const statusLower = status.toLowerCase()
      updateData.booking_status = statusLower

      if (statusLower === 'cancelled') {
        updateData.cancellation_reason = booking.driver_id === userId
          ? 'Cancelled by driver'
          : 'Cancelled by owner'
      }

      if (statusLower === 'rejected') {
        updateData.cancellation_reason = 'Rejected by owner'
      }
    }
    if (paymentStatus) {
      updateData.payment_status = paymentStatus
      // Do not set paid_at, as the field does not exist in the schema
    }

    const updatedBooking = await prisma.bookings.update({
      where: { booking_id: bookingId },
      data: updateData,
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

    let message = 'Booking updated successfully';
    if (status) {
      message = `Booking ${status.toLowerCase()} successfully`;
    } else if (paymentStatus) {
      message = 'Payment status updated successfully';
    }
    return NextResponse.json({
      message,
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
