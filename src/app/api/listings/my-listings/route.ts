import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Fetch user's parking spaces
    const parkingSpaces = await prisma.parkingSpace.findMany({
      where: {
        ownerId: parseInt(payload.userId),
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Map to maintain frontend compatibility
    const listings = parkingSpaces.map(space => ({
      id: space.spaceId.toString(),
      title: space.title,
      address: space.address,
      city: space.city,
      state: space.state,
      zipCode: space.zipCode,
      spaceType: space.spaceType,
      monthlyPrice: parseFloat(space.monthlyRate?.toString() || '0'),
      isActive: space.status === 'active',
      images: space.images,
      createdAt: space.createdAt,
    }))

    return NextResponse.json({
      listings,
      count: listings.length,
    })
  } catch (error) {
    console.error('Fetch my listings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    )
  }
}
