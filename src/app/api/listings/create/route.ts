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
    const pricingType = formData.get('pricingType') as string
    const price = formData.get('price') as string
    const description = formData.get('description') as string
    const isGated = formData.get('isGated') === 'true'
    const hasCCTV = formData.get('hasCCTV') === 'true'
    const isCovered = formData.get('isCovered') === 'true'
    const hasEVCharging = formData.get('hasEVCharging') === 'true'

    // Validate required fields
    if (!title || !address || !city || !state || !zipCode || !price || !description || !pricingType) {
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

    // Create listing
    const listing = await prisma.listing.create({
      data: {
        hostId: payload.userId,
        title,
        address,
        city,
        state,
        zipCode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        spaceType: (spaceType as any) || 'DRIVEWAY',
        vehicleSize: (vehicleSize as any) || 'STANDARD',
        pricingType: (pricingType as any) || 'MONTHLY',
        price: parseFloat(price),
        monthlyPrice: pricingType === 'MONTHLY' ? parseFloat(price) : null,
        description,
        isGated,
        hasCCTV,
        isCovered,
        hasEVCharging,
        availableFrom: new Date(),
        images: imageDataUrls,
        accessInstructions: description,
        securityDeposit: 0,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        message: 'Listing created successfully',
        listing: {
          id: listing.id,
          title: listing.title,
          address: listing.address,
          city: listing.city,
          state: listing.state,
          pricingType: listing.pricingType,
          price: listing.price,
          images: listing.images,
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
