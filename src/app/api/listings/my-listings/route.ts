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

    // Get unique space IDs and their pricing
    const spaceIds = availabilities
      .filter((avail: typeof availabilities[0]) => avail.parking_spaces)
      .map((avail: typeof availabilities[0]) => avail.space_id)

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

    // Map to maintain frontend compatibility
    const listings = availabilities
      .filter((avail: typeof availabilities[0]) => avail.parking_spaces)
      .map((avail: typeof availabilities[0]) => {
        const space = avail.parking_spaces!
        const pricing = pricingMap.get(space.space_id)
        
        // Parse images - handle both comma-separated and single image
        let imageArray: string[] = []
        if (space.images) {
          // If images contain commas, split them
          if (space.images.includes(',')) {
            imageArray = space.images.split(',').filter((img: string) => img.trim())
          } else if (space.images.trim()) {
            // Single image
            imageArray = [space.images.trim()]
          }
        }
        
        console.log('Space:', space.space_id, 'Title:', space.title, 'Images count:', imageArray.length)
        if (imageArray.length > 0) {
          console.log('First image length:', imageArray[0].length, 'starts with:', imageArray[0].substring(0, 50))
        }
        console.log('Pricing:', pricing ? { hourly: pricing.hourly_rate, monthly: pricing.monthly_rate } : 'No pricing')
        
        return {
          id: space.space_id.toString(),
          title: space.title || 'Untitled Space',
          address: space.space_location?.address || '',
          city: space.space_location?.city || '',
          state: space.space_location?.state || '',
          zipCode: space.space_location?.zip_code || '',
          spaceType: space.space_type || 'Unknown',
          vehicleSize: 'Any', // Not in database schema
          monthlyPrice: pricing ? Number(pricing.monthly_rate) : 0,
          hourlyPrice: pricing ? Number(pricing.hourly_rate) : 0,
          description: space.description || '',
          isGated: false, // Not in database schema
          hasCCTV: space.has_cctv || false,
          isCovered: false, // Not in database schema
          hasEVCharging: space.ev_charging || false,
          isActive: avail.is_available || false,
          images: imageArray,
          createdAt: avail.created_at?.toISOString() || new Date().toISOString(),
          updatedAt: avail.updated_at?.toISOString() || new Date().toISOString(),
        }
      })

    console.log('Returning', listings.length, 'listings')
    
    return NextResponse.json({
      listings,
      count: listings.length,
    })
  } catch (error) {
    console.error('Fetch my listings error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    )
  }
}
