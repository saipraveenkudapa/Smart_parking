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

    // Note: dim_parking_spaces doesn't have owner_id in park_connect schema
    // We'll need to use fact_availability to link spaces to owners
    const availabilities = await prisma.fact_availability.findMany({
      where: {
        owner_id: parseInt(payload.userId),
      },
      include: {
        dim_parking_spaces: {
          include: {
            dim_space_location: true,
            dim_pricing_model: true,
          },
        },
      },
      distinct: ['space_id'],
    })

    // Map to maintain frontend compatibility
    const listings = availabilities
      .filter(avail => avail.dim_parking_spaces)
      .map(avail => {
        const space = avail.dim_parking_spaces!
        return {
          id: space.space_id.toString(),
          title: space.title,
          address: space.dim_space_location?.address || '',
          city: space.dim_space_location?.city || '',
          state: space.dim_space_location?.state || '',
          zipCode: space.dim_space_location?.zip_code || '',
          spaceType: space.space_type,
          monthlyPrice: space.dim_pricing_model?.monthly_rate ? parseFloat(space.dim_pricing_model.monthly_rate.toString()) : 0,
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
