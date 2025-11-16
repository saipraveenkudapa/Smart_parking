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

    // Fetch parking spaces with joined location and pricing
    const parkingSpaces = await prisma.dim_parking_spaces.findMany({
      where: {
        ...(spaceType && { space_type: spaceType.toLowerCase() }),
      },
      include: {
        dim_space_location: true,
        dim_pricing_model: true,
      },
    })

    // Filter by location criteria (since they're in joined table)
    let filteredSpaces = parkingSpaces

    if (city || state || zipCode || maxPrice) {
      filteredSpaces = parkingSpaces.filter(space => {
        const location = space.dim_space_location
        const pricing = space.dim_pricing_model

        if (city && location?.city && !location.city.toLowerCase().includes(city.toLowerCase())) {
          return false
        }
        if (state && location?.state && !location.state.toLowerCase().includes(state.toLowerCase())) {
          return false
        }
        if (zipCode && location?.zip_code && !location.zip_code.includes(zipCode)) {
          return false
        }
        if (maxPrice && pricing?.monthly_rate && parseFloat(pricing.monthly_rate.toString()) > parseFloat(maxPrice)) {
          return false
        }
        return true
      })
    }

    // Format response to match frontend expectations
    const listings = filteredSpaces.map(space => ({
      id: space.space_id.toString(),
      title: space.title,
      address: space.dim_space_location?.address || '',
      city: space.dim_space_location?.city || '',
      state: space.dim_space_location?.state || '',
      zipCode: space.dim_space_location?.zip_code || '',
      latitude: space.dim_space_location?.latitude ? parseFloat(space.dim_space_location.latitude.toString()) : null,
      longitude: space.dim_space_location?.longitude ? parseFloat(space.dim_space_location.longitude.toString()) : null,
      spaceType: space.space_type,
      monthlyPrice: space.dim_pricing_model?.monthly_rate ? parseFloat(space.dim_pricing_model.monthly_rate.toString()) : 0,
      description: space.description,
      hasCCTV: space.has_cctv,
      hasEVCharging: space.ev_charging,
      images: space.images ? space.images.split(',') : [],
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
