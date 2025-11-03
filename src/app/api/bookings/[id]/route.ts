import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// PATCH - Update booking status (approve/reject/cancel)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params
    const body = await req.json()
    const { status } = body

    if (!status || !['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED, REJECTED, or CANCELLED' },
        { status: 400 }
      )
    }

    // Get the booking with listing details
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        listing: true,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check permissions
    // Host can approve/reject, renter can cancel
    if (status === 'CANCELLED') {
      if (booking.renterId !== payload.userId) {
        return NextResponse.json(
          { error: 'Only the renter can cancel this booking' },
          { status: 403 }
        )
      }
    } else {
      if (booking.listing.hostId !== payload.userId) {
        return NextResponse.json(
          { error: 'Only the host can approve or reject this booking' },
          { status: 403 }
        )
      }
    }

    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        listing: {
          select: {
            title: true,
            address: true,
          },
        },
        renter: {
          select: {
            fullName: true,
            email: true,
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
