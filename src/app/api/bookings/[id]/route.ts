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

    // Get the booking with space details
    const booking = await prisma.booking.findUnique({
      where: { bookingId },
      include: {
        space: {
          select: {
            ownerId: true,
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
      if (booking.driverId !== userId) {
        return NextResponse.json(
          { error: 'Only the driver can cancel this booking' },
          { status: 403 }
        )
      }
    } else {
      if (booking.space.ownerId !== userId) {
        return NextResponse.json(
          { error: 'Only the parking space owner can confirm or complete this booking' },
          { status: 403 }
        )
      }
    }

    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { bookingId },
      data: {
        bookingStatus: status.toLowerCase(),
        ...(status.toLowerCase() === 'cancelled' && {
          cancellationDate: new Date(),
        }),
      },
      include: {
        space: {
          select: {
            title: true,
            address: true,
          },
        },
        driver: {
          select: {
            fullName: true,
            email: true,
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

    return NextResponse.json({
      message: `Booking ${status.toLowerCase()} successfully`,
      booking: updatedBooking,
    })
  } catch (error) {
    console.error('Update booking error:', error)
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    )
  }
}
