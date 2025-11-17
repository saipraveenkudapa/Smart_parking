import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// PATCH - Update listing (edit or toggle active status)
// NOTE: dim_parking_spaces doesn't have owner_id in park_connect schema
// Ownership is tracked through fact_availability table
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await req.json()

    // Convert string ID to integer for new schema
    const spaceId = parseInt(id)
    if (isNaN(spaceId)) {
      return NextResponse.json(
        { error: 'Invalid parking space ID' },
        { status: 400 }
      )
    }

    // TODO: Need to verify ownership through fact_availability table
    // For now, return not implemented
    return NextResponse.json(
      { error: 'Listing updates not yet implemented for new schema' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Update listing error:', error)
    return NextResponse.json(
      { error: 'Failed to update listing' },
      { status: 500 }
    )
  }
}

// DELETE - Delete parking space
// NOTE: dim_parking_spaces doesn't have owner_id in park_connect schema
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { id } = await params
    const spaceId = parseInt(id)

    if (isNaN(spaceId)) {
      return NextResponse.json(
        { error: 'Invalid parking space ID' },
        { status: 400 }
      )
    }

    // TODO: Need to verify ownership through fact_availability table
    return NextResponse.json(
      { error: 'Listing deletion not yet implemented for new schema' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Delete listing error:', error)
    return NextResponse.json(
      { error: 'Failed to delete listing' },
      { status: 500 }
    )
  }
}

// GET - Get single listing details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Convert string ID to integer
    const spaceId = parseInt(id)
    if (isNaN(spaceId)) {
      return NextResponse.json(
        { error: 'Invalid parking space ID' },
        { status: 400 }
      )
    }

    const parkingSpace = await prisma.parking_spaces.findUnique({
      where: { space_id: spaceId },
      include: {
        space_location: true,
      },
    })

    if (!parkingSpace) {
      return NextResponse.json(
        { error: 'Parking space not found' },
        { status: 404 }
      )
    }

    // Map to maintain frontend compatibility
    const listing = {
      id: parkingSpace.space_id.toString(),
      title: parkingSpace.title,
      description: parkingSpace.description,
      address: parkingSpace.space_location?.address || '',
      city: parkingSpace.space_location?.city || '',
      state: parkingSpace.space_location?.state || '',
      zipCode: parkingSpace.space_location?.zip_code || '',
      latitude: parkingSpace.space_location?.latitude ? parseFloat(parkingSpace.space_location.latitude.toString()) : 0,
      longitude: parkingSpace.space_location?.longitude ? parseFloat(parkingSpace.space_location.longitude.toString()) : 0,
      spaceType: parkingSpace.space_type,
      monthlyPrice: 0, // pricing_model not included due to complex primary key
      hasCCTV: parkingSpace.has_cctv || false,
      hasEVCharging: parkingSpace.ev_charging || false,
      isInstantBook: parkingSpace.is_instant_book,
      images: parkingSpace.images ? parkingSpace.images.split(',') : [],
      accessInstructions: parkingSpace.access_instructions,
    }

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Get parking space error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parking space' },
      { status: 500 }
    )
  }
}
