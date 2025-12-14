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

const canTransition = (fromStatus: string, toStatus: string) => {
  const from = (fromStatus || '').toLowerCase()
  const to = (toStatus || '').toLowerCase()

  if (!from || !to || from === to) return true

  const allowed: Record<string, Set<string>> = {
    pending: new Set(['confirmed', 'rejected', 'cancelled']),
    confirmed: new Set(['completed', 'cancelled']),
    completed: new Set([]),
    rejected: new Set([]),
    cancelled: new Set([]),
  }

  return allowed[from]?.has(to) ?? false
}

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

    const statusLower = typeof status === 'string' ? status.toLowerCase() : undefined

    const updatedBooking = await prisma.$transaction(
      async (tx) => {
        // Re-load booking inside the transaction to avoid stale reads
        const current = await tx.bookings.findUnique({
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

        if (!current) {
          throw new ApiError(404, 'Booking not found')
        }

        if (statusLower && !canTransition(current.booking_status, statusLower)) {
          throw new ApiError(
            400,
            `Invalid status transition from ${current.booking_status} to ${statusLower}`
          )
        }

        // If confirming, re-check availability window + no overlap at submit-time.
        // (Prevents edge-cases with old data or concurrent updates.)
        if (statusLower === 'confirmed') {
          const availability = await tx.availability.findUnique({
            where: { availability_id: current.availability_id },
            select: {
              is_available: true,
              available_start: true,
              available_end: true,
              space_id: true,
            },
          })

          if (!availability || !availability.is_available) {
            throw new ApiError(409, 'Parking space is not available anymore')
          }

          if (
            current.start_time < availability.available_start ||
            current.end_time > availability.available_end
          ) {
            throw new ApiError(
              409,
              'Booking is outside the current availability window'
            )
          }

          const overlap = await tx.bookings.findFirst({
            where: {
              booking_id: { not: bookingId },
              availability: {
                space_id: availability.space_id,
              },
              NOT: {
                booking_status: {
                  in: ['cancelled', 'rejected'],
                  mode: 'insensitive',
                },
              },
              AND: [
                { start_time: { lt: current.end_time } },
                { end_time: { gt: current.start_time } },
              ],
            },
            select: { booking_id: true },
          })

          if (overlap) {
            throw new ApiError(
              409,
              'Cannot confirm this booking because it overlaps with another booking'
            )
          }
        }

        if (statusLower === 'completed') {
          if (new Date() < current.end_time) {
            throw new ApiError(400, 'Cannot complete a booking before it ends')
          }
        }

        const updateData: any = {}

        if (statusLower) {
          updateData.booking_status = statusLower

          if (statusLower === 'cancelled') {
            updateData.cancellation_reason = current.driver_id === userId
              ? 'Cancelled by driver'
              : 'Cancelled by owner'
          }

          if (statusLower === 'rejected') {
            updateData.cancellation_reason = 'Rejected by owner'
          }
        }

        if (paymentStatus) {
          updateData.payment_status = paymentStatus
        }

        return tx.bookings.update({
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
      },
      {
        isolationLevel: 'Serializable',
      }
    )

    // Map response for API compatibility
    const response = {
      bookingId: updatedBooking.booking_id,
      driverId: updatedBooking.driver_id,
      startTime: updatedBooking.start_time,
      endTime: updatedBooking.end_time,
      totalAmount: Number(updatedBooking.total_amount),
      serviceFee:
        updatedBooking.service_fee != null ? Number(updatedBooking.service_fee) : null,
      ownerPayout: Number(updatedBooking.owner_payout),
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

    let message = 'Booking updated successfully'
    if (statusLower) {
      message = `Booking ${statusLower} successfully`
    } else if (paymentStatus) {
      message = 'Payment status updated successfully'
    }
    return NextResponse.json({
      message,
      booking: response,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Update booking error:', error)
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    )
  }
}
