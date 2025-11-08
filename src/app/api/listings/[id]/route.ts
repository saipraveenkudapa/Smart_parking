import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// PATCH - Update listing (edit or toggle active status)
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

    // Check if listing exists and belongs to user
    const existingListing = await prisma.listing.findUnique({
      where: { id },
    })

    if (!existingListing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (existingListing.hostId !== payload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this listing' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    // Toggle active status if provided
    if (typeof body.isActive === 'boolean') {
      updateData.isActive = body.isActive
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
    if (body.spaceType) updateData.spaceType = body.spaceType
    if (body.vehicleSize) updateData.vehicleSize = body.vehicleSize
    if (body.monthlyPrice) updateData.monthlyPrice = parseFloat(body.monthlyPrice)
    if (typeof body.isGated === 'boolean') updateData.isGated = body.isGated
    if (typeof body.hasCCTV === 'boolean') updateData.hasCCTV = body.hasCCTV
    if (typeof body.isCovered === 'boolean') updateData.isCovered = body.isCovered
    if (typeof body.hasEVCharging === 'boolean') updateData.hasEVCharging = body.hasEVCharging

    // Update the listing
    const updatedListing = await prisma.listing.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      message: 'Listing updated successfully',
      listing: updatedListing,
    })
  } catch (error) {
    console.error('Update listing error:', error)
    return NextResponse.json(
      { error: 'Failed to update listing' },
      { status: 500 }
    )
  }
}

// DELETE - Delete listing
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

    // Check if listing exists and belongs to user
    const existingListing = await prisma.listing.findUnique({
      where: { id },
    })

    if (!existingListing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (existingListing.hostId !== payload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this listing' },
        { status: 403 }
      )
    }

    // Delete the listing
    await prisma.listing.delete({
      where: { id },
    })

    return NextResponse.json({
      message: 'Listing deleted successfully',
    })
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

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            emailVerified: true,
          },
        },
      },
    })

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Get listing error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listing' },
      { status: 500 }
    )
  }
}
