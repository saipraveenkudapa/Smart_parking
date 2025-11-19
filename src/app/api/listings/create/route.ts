import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
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

    // Parse FormData
    const formData = await req.formData()
    
    // Extract text fields
    const title = formData.get('title') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const state = formData.get('state') as string
    const zipCode = formData.get('zipCode') as string
    const latitude = formData.get('latitude') as string | null
    const longitude = formData.get('longitude') as string | null
    const spaceType = formData.get('spaceType') as string
    const vehicleSize = formData.get('vehicleSize') as string
    const hourlyRate = formData.get('hourlyRate') as string
    const dailyRate = formData.get('dailyRate') as string
    const weeklyRate = formData.get('weeklyRate') as string
    const monthlyRate = formData.get('monthlyRate') as string
    const description = formData.get('description') as string
    const isGated = formData.get('isGated') === 'true'
    const hasCCTV = formData.get('hasCCTV') === 'true'
    const isCovered = formData.get('isCovered') === 'true'
    const hasEVCharging = formData.get('hasEVCharging') === 'true'

    // Validate required fields
    if (!title || !address || !city || !state || !zipCode || !hourlyRate || !dailyRate || !monthlyRate || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Process uploaded images (convert to base64 data URLs)
    const imageFiles = formData.getAll('images') as File[]
    const imageDataUrls: string[] = []
    
    for (const file of imageFiles) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit per image
        return NextResponse.json(
          { error: 'Image file size must be less than 5MB' },
          { status: 400 }
        )
      }
      
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64 = buffer.toString('base64')
      const dataUrl = `data:${file.type};base64,${base64}`
      imageDataUrls.push(dataUrl)
    }

    // Create location first
    const location = await prisma.space_location.create({
      data: {
        address,
        city,
        state,
        zip_code: zipCode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    })

    // Handle circular FK dependency using raw SQL in transaction
    // parking_spaces needs pricing_id, but pricing_model needs space_id
    const validFrom = new Date().toISOString()
    
    const result = await prisma.$transaction(async (tx) => {
      // Temporarily disable FK check for this transaction
      await tx.$executeRawUnsafe('SET CONSTRAINTS ALL DEFERRED')
      
      // Create parking space with pricing_id = 1 (FK will be checked at end of transaction)
      const space = await tx.parking_spaces.create({
        data: {
          title,
          description,
          space_type: spaceType?.toLowerCase() || 'driveway',
          is_instant_book: false,
          has_cctv: hasCCTV,
          ev_charging: hasEVCharging,
          access_instructions: description,
          images: imageDataUrls.join(','),
          location_id: location.location_id,
          pricing_id: 1, // First pricing for this space
        },
      })
      
      // Create pricing_model with space_id and pricing_id = 1
      const pricing = await tx.pricing_model.create({
        data: {
          pricing_id: 1,
          space_id: space.space_id,
          valid_from: validFrom,
          is_current: true,
          hourly_rate: parseFloat(hourlyRate),
          daily_rate: parseFloat(dailyRate),
          weekly_rate: weeklyRate ? parseFloat(weeklyRate) : null,
          monthly_rate: parseFloat(monthlyRate),
        },
      })
      
      // FKs will be validated at commit time
      return { space, pricing }
    })
    
    const parkingSpace = result.space
    const pricing = result.pricing

    return NextResponse.json(
      {
        message: 'Parking space created successfully',
        listing: {
          id: parkingSpace.space_id,
          title: parkingSpace.title,
          description: parkingSpace.description,
          spaceType: parkingSpace.space_type,
          location: {
            address: location.address,
            city: location.city,
            state: location.state,
            zipCode: location.zip_code,
          },
          pricing: {
            hourlyRate: pricing.hourly_rate,
            dailyRate: pricing.daily_rate,
            weeklyRate: pricing.weekly_rate,
            monthlyRate: pricing.monthly_rate,
          },
          images: imageDataUrls,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create listing error:', error)
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    )
  }
}
