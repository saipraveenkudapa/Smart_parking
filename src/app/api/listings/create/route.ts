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
    const availableFrom = formData.get('availableFrom') as string | null
    const availableTo = formData.get('availableTo') as string | null

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

    // Handle circular FK dependency: 
    // parking_spaces.pricing_id → pricing_model.pricing_id (UNIQUE)
    // pricing_model.space_id → parking_spaces.space_id
    // Solution: Disable trigger checks temporarily within transaction
    const validFrom = new Date().toISOString()
    
    const result = await prisma.$transaction(async (tx) => {
      // Disable FK checks for this session only
      await tx.$executeRawUnsafe('SET session_replication_role = replica')
      
      // Insert parking_space with pricing_id = 1
      const spaceResult = await tx.$queryRaw<Array<{ space_id: number }>>`
        INSERT INTO park_connect.parking_spaces (
          title, description, space_type, is_instant_book, 
          has_cctv, ev_charging, access_instructions, images, 
          location_id, pricing_id
        ) VALUES (
          ${title}, ${description}, ${spaceType?.toLowerCase() || 'driveway'}, ${false},
          ${hasCCTV}, ${hasEVCharging}, ${description}, ${imageDataUrls.join(',')},
          ${location.location_id}, ${1}
        ) RETURNING space_id
      `
      
      const spaceId = spaceResult[0].space_id
      
      // Insert pricing_model with actual space_id
      await tx.$executeRaw`
        INSERT INTO park_connect.pricing_model (
          pricing_id, space_id, valid_from, is_current,
          hourly_rate, daily_rate, weekly_rate, monthly_rate
        ) VALUES (
          ${1}, ${spaceId}, ${validFrom}::timestamptz, ${true},
          ${parseFloat(hourlyRate)}, ${parseFloat(dailyRate)}, 
          ${weeklyRate ? parseFloat(weeklyRate) : 0}, ${parseFloat(monthlyRate)}
        )
      `
      
      // Re-enable FK checks
      await tx.$executeRawUnsafe('SET session_replication_role = DEFAULT')
      
      // Fetch the created records using Prisma for proper typing
      const space = await tx.parking_spaces.findUnique({
        where: { space_id: spaceId }
      })
      
      const pricing = await tx.pricing_model.findFirst({
        where: { 
          space_id: spaceId,
          pricing_id: 1
        }
      })
      
      return { space, pricing }
    })
    
    const parkingSpace = result.space!
    const pricing = result.pricing!

    // Create initial availability record to track ownership
    // This links the space to the owner (required for my-listings to work)
    const now = new Date()
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(now.getFullYear() + 1)
    
    // Use custom dates if provided, otherwise default to now and one year from now
    const availableStart = availableFrom ? new Date(availableFrom) : now
    const availableEnd = availableTo ? new Date(availableTo) : oneYearFromNow
    
    await prisma.availability.create({
      data: {
        owner_id: parseInt(payload.userId),
        space_id: parkingSpace.space_id,
        available_start: availableStart,
        available_end: availableEnd,
        is_available: true,
        availability_reason: 'Initial listing creation',
        created_at: now,
        updated_at: now,
      },
    })

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
