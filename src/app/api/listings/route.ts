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

    // Fetch parking spaces with joined location
    const parkingSpaces = await prisma.parking_spaces.findMany({
      where: {
        ...(spaceType && { space_type: spaceType.toLowerCase() }),
      },
      include: {
        space_location: true,
      },
    })

    // Filter by location criteria (since they're in joined table)
    let filteredSpaces = parkingSpaces

    if (city || state || zipCode || maxPrice) {
      filteredSpaces = parkingSpaces.filter((space: typeof parkingSpaces[0]) => {
        const location = space.space_location

        if (city && location?.city && !location.city.toLowerCase().includes(city.toLowerCase())) {
          return false
        }
        if (state && location?.state && !location.state.toLowerCase().includes(state.toLowerCase())) {
          return false
        }
        if (zipCode && location?.zip_code && !location.zip_code.includes(zipCode)) {
          return false
        }
        // Note: pricing_model filtering removed due to complex primary key
        if (maxPrice) {
          // Cannot filter by price without pricing_model join
          return true
        }
        return true
      })
    }

    // Format response to match frontend expectations
    const listings = filteredSpaces.map((space: typeof parkingSpaces[0]) => ({
      id: space.space_id.toString(),
      title: space.title,
      address: space.space_location?.address || '',
      city: space.space_location?.city || '',
      state: space.space_location?.state || '',
      zipCode: space.space_location?.zip_code || '',
      latitude: space.space_location?.latitude ? parseFloat(space.space_location.latitude.toString()) : null,
      longitude: space.space_location?.longitude ? parseFloat(space.space_location.longitude.toString()) : null,
      spaceType: space.space_type || 'driveway',
      vehicleSize: 'standard', // Not in DB - default value
      monthlyPrice: 0, // pricing_model not included due to complex primary key
      description: space.description,
      isGated: false, // Not in DB - default value
      hasCCTV: space.has_cctv || false,
      isCovered: false, // Not in DB - default value
      hasEVCharging: space.ev_charging || false,
      images: space.images ? space.images.split(',') : [],
      host: {
        fullName: 'Host', // Would need to join users table via availability
        phoneVerified: false,
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
