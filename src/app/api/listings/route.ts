import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const city = searchParams.get('city')
    const state = searchParams.get('state')
    const zipCode = searchParams.get('zipCode')
    const maxPrice = searchParams.get('maxPrice')
    const spaceType = searchParams.get('spaceType')

    // Build filter conditions
    const where: any = {
      status: 'active',
    }

    if (city) {
      where.city = {
        contains: city,
        mode: 'insensitive',
      }
    }

    if (state) {
      where.state = {
        contains: state,
        mode: 'insensitive',
      }
    }

    if (zipCode) {
      where.zipCode = {
        contains: zipCode,
      }
    }

    if (maxPrice) {
      where.monthlyRate = {
        lte: parseFloat(maxPrice),
      }
    }

    if (spaceType) {
      where.spaceType = spaceType.toLowerCase()
    }

    // Fetch parking spaces
    const parkingSpaces = await prisma.parkingSpace.findMany({
      where,
      include: {
        owner: {
          select: {
            userId: true,
            fullName: true,
            isVerified: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Format response to match frontend expectations
    const listings = parkingSpaces.map(space => ({
      id: space.spaceId.toString(),
      title: space.title,
      address: space.address,
      city: space.city,
      state: space.state,
      zipCode: space.zipCode,
      latitude: space.latitude ? parseFloat(space.latitude.toString()) : null,
      longitude: space.longitude ? parseFloat(space.longitude.toString()) : null,
      spaceType: space.spaceType,
      vehicleSize: space.vehicleTypeAllowed,
      monthlyPrice: space.monthlyRate ? parseFloat(space.monthlyRate.toString()) : 0,
      description: space.description,
      isGated: false, // Not in new schema
      hasCCTV: space.hasCctv,
      isCovered: false, // Not in new schema
      hasEVCharging: space.evCharging,
      images: space.images,
      host: {
        fullName: space.owner.fullName,
        phoneVerified: space.owner.isVerified,
      },
    }))

    return NextResponse.json({
      listings,
      count: listings.length,
    })
  } catch (error) {
    console.error('Fetch listings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    )
  }
}
