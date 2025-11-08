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
      isActive: true,
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
      where.monthlyPrice = {
        lte: parseFloat(maxPrice),
      }
    }

    if (spaceType) {
      where.spaceType = spaceType
    }

    // Fetch listings
    const listings = await prisma.listing.findMany({
      where,
      include: {
        host: {
          select: {
            id: true,
            fullName: true,
            emailVerified: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

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
