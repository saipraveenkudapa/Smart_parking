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

    const body = await req.json()

    // Validate required fields
    const {
      title,
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      spaceType,
      vehicleSize,
      monthlyPrice,
      description,
      isGated,
      hasCCTV,
      isCovered,
      hasEVCharging,
      availableFrom,
    } = body

    if (!title || !address || !city || !state || !zipCode || !monthlyPrice || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
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
        spaceType: spaceType || 'DRIVEWAY',
        vehicleSize: vehicleSize || 'STANDARD',
        monthlyPrice: parseFloat(monthlyPrice),
        description,
        isGated: isGated || false,
        hasCCTV: hasCCTV || false,
        isCovered: isCovered || false,
        hasEVCharging: hasEVCharging || false,
        availableFrom: availableFrom ? new Date(availableFrom) : new Date(),
        images: [], // Empty for now, will add image upload later
        accessInstructions: body.accessInstructions || description,
        securityDeposit: body.securityDeposit || 0,
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
          monthlyPrice: listing.monthlyPrice,
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
