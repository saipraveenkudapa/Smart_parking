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
    const bookings = await prisma.booking.findMany({
      where: {
        space: {
          ownerId: parseInt(payload.userId),
        },
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
            isVerified: true,
          },
        },
        vehicle: {
          select: {
            make: true,
            model: true,
            year: true,
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
    console.error('Get host bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}
