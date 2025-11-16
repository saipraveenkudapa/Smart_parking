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

    // Check if parking space exists and belongs to user
    const existingSpace = await prisma.dim_parking_spaces.findUnique({
      where: { space_id: spaceId },
    })

    if (!existingSpace) {
      return NextResponse.json(
        { error: 'Parking space not found' },
        { status: 404 }
      )
    }

    if (existingSpace.ownerId !== parseInt(payload.userId)) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this parking space' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    // Toggle active status if provided
    if (typeof body.isActive === 'boolean') {
      updateData.status = body.isActive ? 'active' : 'inactive'
    }

    // Update other fields if provided
    if (body.title) updateData.title = body.title
    if (body.description) updateData.description = body.description
    if (body.address) updateData.address = body.address
    if (body.city) updateData.city = body.city
    if (body.state) updateData.state = body.state
    if (body.zipCode) updateData.zipCode = body.zipCode
    if (body.latitude) updateData.latitude = parseFloat(body.latitude)
    if (body.longitude) updateData.longitude = parseFloat(body.longitude)
    if (body.spaceType) updateData.spaceType = body.spaceType.toLowerCase()
    if (body.vehicleSize) updateData.vehicleTypeAllowed = body.vehicleSize.toLowerCase()
    if (body.monthlyPrice) updateData.monthlyRate = parseFloat(body.monthlyPrice)
    if (body.accessInstructions) updateData.accessInstructions = body.accessInstructions
    if (typeof body.hasCCTV === 'boolean') updateData.hasCctv = body.hasCCTV
    if (typeof body.hasEVCharging === 'boolean') updateData.evCharging = body.hasEVCharging
    if (typeof body.isInstantBook === 'boolean') updateData.isInstantBook = body.isInstantBook

    // Update the parking space
    const updatedSpace = await prisma.parkingSpace.update({
      where: { spaceId },
      data: updateData,
    })

    return NextResponse.json({
      message: 'Parking space updated successfully',
      listing: {
        id: updatedSpace.spaceId.toString(),
        ...updatedSpace,
        monthlyPrice: parseFloat(updatedSpace.monthlyRate?.toString() || '0'),
        isActive: updatedSpace.status === 'active',
      },
    })
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

    // Check if parking space exists and belongs to user
    const existingSpace = await prisma.dim_parking_spaces.findUnique({
      where: { space_id: spaceId },
    })

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

    const parkingSpace = await prisma.dim_parking_spaces.findUnique({
      where: { space_id: spaceId },
      include: {
        dim_space_location: true,
        dim_pricing_model: true,
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
      address: parkingSpace.dim_space_location?.address || '',
      city: parkingSpace.dim_space_location?.city || '',
      state: parkingSpace.dim_space_location?.state || '',
      zipCode: parkingSpace.dim_space_location?.zip_code || '',
      latitude: parkingSpace.dim_space_location?.latitude ? parseFloat(parkingSpace.dim_space_location.latitude.toString()) : 0,
      longitude: parkingSpace.dim_space_location?.longitude ? parseFloat(parkingSpace.dim_space_location.longitude.toString()) : 0,
      spaceType: parkingSpace.space_type,
      monthlyPrice: parkingSpace.dim_pricing_model?.monthly_rate ? parseFloat(parkingSpace.dim_pricing_model.monthly_rate.toString()) : 0,
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
