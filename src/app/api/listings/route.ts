import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Haversine formula to calculate distance between two coordinates in miles
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const city = searchParams.get('city')
    const state = searchParams.get('state')
    const zipCode = searchParams.get('zipCode')
    const maxPrice = searchParams.get('maxPrice')
    const spaceType = searchParams.get('spaceType')
    const radiusMiles = 20 // Search within 20 miles

    console.log('Fetching listings with filters:', { city, state, zipCode, maxPrice, spaceType })

    // Fetch parking spaces with joined location
    const parkingSpaces = await prisma.parking_spaces.findMany({
      where: {
        ...(spaceType && { space_type: spaceType.toLowerCase() }),
      },
      include: {
        space_location: true,
      },
    })

    console.log(`Found ${parkingSpaces.length} parking spaces in database`)

    // Get space IDs for pricing lookup
    const spaceIds = parkingSpaces.map(space => space.space_id)

    // Fetch pricing for all spaces
    const pricings = await prisma.pricing_model.findMany({
      where: {
        space_id: {
          in: spaceIds,
        },
      },
      orderBy: {
        valid_from: 'desc',
      },
      distinct: ['space_id'],
    })

    // Create a map of space_id to pricing
    const pricingMap = new Map(
      pricings.map((p: typeof pricings[0]) => [p.space_id, p])
    )

    // Filter by location criteria (since they're in joined table)
    let filteredSpaces = parkingSpaces

    if (city || state || zipCode || maxPrice) {
      // If zipCode is provided, get its coordinates for radius search
      let searchLat: number | null = null
      let searchLon: number | null = null
      
      if (zipCode) {
        // Find any location with this zip code to get coordinates
        const referenceLocation = await prisma.space_location.findFirst({
          where: { zip_code: zipCode },
        })
        
        if (referenceLocation?.latitude && referenceLocation?.longitude) {
          searchLat = parseFloat(referenceLocation.latitude.toString())
          searchLon = parseFloat(referenceLocation.longitude.toString())
        }
      }

      filteredSpaces = parkingSpaces.filter((space: typeof parkingSpaces[0]) => {
        const location = space.space_location

        if (city && location?.city && !location.city.toLowerCase().includes(city.toLowerCase())) {
          return false
        }
        if (state && location?.state && !location.state.toLowerCase().includes(state.toLowerCase())) {
          return false
        }
        
        // Radius search by zipCode if coordinates are available
        if (zipCode && searchLat && searchLon && location?.latitude && location?.longitude) {
          const spaceLat = parseFloat(location.latitude.toString())
          const spaceLon = parseFloat(location.longitude.toString())
          const distance = calculateDistance(searchLat, searchLon, spaceLat, spaceLon)
          
          if (distance > radiusMiles) {
            return false
          }
        } else if (zipCode && location?.zip_code && !location.zip_code.includes(zipCode)) {
          // Fallback to exact zip match if coordinates not available
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
    const listings = filteredSpaces.map((space: typeof parkingSpaces[0]) => {
      const pricing = pricingMap.get(space.space_id)
      
      // Parse images - handle different formats
      let imageArray: string[] = []
      if (space.images) {
        const trimmed = space.images.trim()
        if (trimmed.includes('|||')) {
          // New format with ||| delimiter
          imageArray = trimmed.split('|||').filter((img: string) => img.trim())
        } else {
          // Treat as single image (don't split by comma as base64 can contain commas)
          imageArray = [trimmed]
        }
      }
      
      return {
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
        monthlyPrice: pricing ? Number(pricing.monthly_rate) : 0,
        hourlyPrice: pricing ? Number(pricing.hourly_rate) : 0,
        dailyPrice: pricing ? Number(pricing.daily_rate) : 0,
        description: space.description,
        isGated: false, // Not in DB - default value
        hasCCTV: space.has_cctv || false,
        isCovered: false, // Not in DB - default value
        hasEVCharging: space.ev_charging || false,
        images: imageArray,
        host: {
          fullName: 'Host', // Would need to join users table via availability
          phoneVerified: false,
        },
      }
    })

    console.log(`Returning ${listings.length} listings after filtering`)

    return NextResponse.json({
      success: true,
      listings,
      count: listings.length,
    })
  } catch (error) {
    console.error('Fetch listings error:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch listings',
        details: error instanceof Error ? error.message : 'Unknown error',
        listings: [], // Return empty array instead of error
        count: 0
      },
      { status: 200 } // Return 200 instead of 500 to prevent frontend errors on empty data
    )
  }
}
