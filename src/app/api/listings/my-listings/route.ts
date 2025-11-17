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

    // Note: parking_spaces doesn't have owner_id in park_connect schema
    // We'll need to use availability to link spaces to owners
    const availabilities = await prisma.availability.findMany({
      where: {
        owner_id: parseInt(payload.userId),
      },
      include: {
        parking_spaces: {
          include: {
            space_location: true,
          },
        },
      },
      distinct: ['space_id'],
    })

    // Map to maintain frontend compatibility
    const listings = availabilities
      .filter((avail: typeof availabilities[0]) => avail.parking_spaces)
      .map((avail: typeof availabilities[0]) => {
        const space = avail.parking_spaces!
        return {
          id: space.space_id.toString(),
          title: space.title,
          address: space.space_location?.address || '',
          city: space.space_location?.city || '',
          state: space.space_location?.state || '',
          zipCode: space.space_location?.zip_code || '',
          spaceType: space.space_type,
          monthlyPrice: 0, // pricing_model not included due to complex primary key
          isActive: avail.is_available || false,
          images: space.images ? space.images.split(',') : [],
        }
      })

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
