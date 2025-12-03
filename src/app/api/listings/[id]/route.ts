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

    // Verify ownership through availability table
    const availability = await prisma.availability.findFirst({
      where: {
        space_id: spaceId,
        owner_id: parseInt(payload.userId),
      },
    })

    if (!availability) {
      return NextResponse.json(
        { error: 'Not authorized to edit this listing' },
        { status: 403 }
      )
    }

    // Handle toggle active status
    if (body.isActive !== undefined) {
      await prisma.availability.updateMany({
        where: {
          space_id: spaceId,
          owner_id: parseInt(payload.userId),
        },
        data: {
          is_available: body.isActive,
        },
      })

      return NextResponse.json({
        message: 'Listing status updated successfully',
        isActive: body.isActive,
      })
    }

    // Handle full listing update
    const {
      title,
      description,
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      spaceType,
      hasCCTV,
      hasEVCharging,
      hourlyPrice,
      dailyPrice,
      weeklyPrice,
      monthlyPrice,
    } = body

    // Update location
    const parkingSpace = await prisma.parking_spaces.findUnique({
      where: { space_id: spaceId },
      select: { location_id: true },
    })

    if (parkingSpace?.location_id) {
      await prisma.space_location.update({
        where: { location_id: parkingSpace.location_id },
        data: {
          ...(address && { address }),
          ...(city && { city }),
          ...(state && { state }),
          ...(zipCode && { zip_code: zipCode }),
          ...(latitude && { latitude: latitude.toString() }),
          ...(longitude && { longitude: longitude.toString() }),
        },
      })
    }

    // Update parking space
    await prisma.parking_spaces.update({
      where: { space_id: spaceId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(spaceType && { space_type: spaceType.toLowerCase() }),
        ...(hasCCTV !== undefined && { has_cctv: hasCCTV }),
        ...(hasEVCharging !== undefined && { ev_charging: hasEVCharging }),
      },
    })

    // Update pricing if provided
    if (hourlyPrice !== undefined || dailyPrice !== undefined || monthlyPrice !== undefined) {
      // Mark current pricing as not current
      await prisma.pricing_model.updateMany({
        where: {
          space_id: spaceId,
          is_current: true,
        },
        data: {
          is_current: false,
        },
      })

      // Get next pricing_id
      const currentSpace = await prisma.parking_spaces.findUnique({
        where: { space_id: spaceId },
        select: { pricing_id: true },
      })
      const nextPricingId = (currentSpace?.pricing_id || 0) + 1

      // Create new pricing record
      await prisma.pricing_model.create({
        data: {
          pricing_id: nextPricingId,
          space_id: spaceId,
          valid_from: new Date(),
          is_current: true,
          hourly_rate: hourlyPrice ? parseFloat(hourlyPrice) : 0,
          daily_rate: dailyPrice ? parseFloat(dailyPrice) : 0,
          weekly_rate: weeklyPrice ? parseFloat(weeklyPrice) : 0,
          monthly_rate: monthlyPrice ? parseFloat(monthlyPrice) : 0,
        },
      })

      // Update parking_spaces with new pricing_id
      await prisma.parking_spaces.update({
        where: { space_id: spaceId },
        data: { pricing_id: nextPricingId },
      })
    }

    return NextResponse.json({
      message: 'Listing updated successfully',
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

    // Verify ownership through availability table
    const availability = await prisma.availability.findFirst({
      where: {
        space_id: spaceId,
        owner_id: parseInt(payload.userId),
      },
    })

    if (!availability) {
      return NextResponse.json(
        { error: 'Not authorized to delete this listing' },
        { status: 403 }
      )
    }

    // Check for active bookings
    const activeBookings = await prisma.bookings.findFirst({
      where: {
        availability: {
          space_id: spaceId,
        },
        booking_status: {
          in: ['CONFIRMED', 'PENDING'],
        },
      },
    })

    if (activeBookings) {
      return NextResponse.json(
        { error: 'Cannot delete listing with active bookings' },
        { status: 400 }
      )
    }

    // Get location_id before deletion
    const parkingSpace = await prisma.parking_spaces.findUnique({
      where: { space_id: spaceId },
      select: { location_id: true },
    })

    // Get all availability IDs for this space
    const availabilityRecords = await prisma.availability.findMany({
      where: { space_id: spaceId },
      select: { availability_id: true },
    })
    const availabilityIds = availabilityRecords.map(a => a.availability_id)

    // Get all booking IDs for this space
    const bookingRecords = await prisma.bookings.findMany({
      where: { availability_id: { in: availabilityIds } },
      select: { booking_id: true },
    })
    const bookingIds = bookingRecords.map(b => b.booking_id)

    // Delete in order (respecting foreign key constraints):
    // 1. Delete reviews related to bookings for this space
    if (bookingIds.length > 0) {
      await prisma.reviews.deleteMany({
        where: { booking_id: { in: bookingIds } },
      })
    }

    // 2. Delete favorites
    await prisma.favorites.deleteMany({
      where: { space_id: spaceId },
    })

    // 3. Delete bookings
    if (availabilityIds.length > 0) {
      await prisma.bookings.deleteMany({
        where: { availability_id: { in: availabilityIds } },
      })
    }

    // 4. Delete availability records
    await prisma.availability.deleteMany({
      where: { space_id: spaceId },
    })

    // 5. Delete pricing models
    await prisma.pricing_model.deleteMany({
      where: { space_id: spaceId },
    })

    // 6. Delete the parking space
    await prisma.parking_spaces.delete({
      where: { space_id: spaceId },
    })

    // 7. Delete the location (if it exists and is not shared)
    if (parkingSpace?.location_id) {
      const otherSpacesWithLocation = await prisma.parking_spaces.count({
        where: { location_id: parkingSpace.location_id },
      })
      
      if (otherSpacesWithLocation === 0) {
        await prisma.space_location.delete({
          where: { location_id: parkingSpace.location_id },
        })
      }
    }

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

    // Convert string ID to integer
    const spaceId = parseInt(id)
    if (isNaN(spaceId)) {
      return NextResponse.json(
        { error: 'Invalid parking space ID' },
        { status: 400 }
      )
    }


    // Fetch parking space and location
    const parkingSpace = await prisma.parking_spaces.findUnique({
      where: { space_id: spaceId },
      include: {
        space_location: true,
      },
    })

    // Fetch availability (for is_available, available_from, available_to, isGated, isCovered)
    const availability = await prisma.availability.findFirst({
      where: { space_id: spaceId },
    })

    if (!parkingSpace) {
      return NextResponse.json(
        { error: 'Parking space not found' },
        { status: 404 }
      )
    }

    // Fetch pricing data
    const pricing = await prisma.pricing_model.findFirst({
      where: {
        space_id: spaceId,
        is_current: true,
      },
    })

    // Parse images - handle different formats
    let imageArray: string[] = []
    if (parkingSpace.images) {
      const trimmed = parkingSpace.images.trim()
      if (trimmed.includes('|||')) {
        imageArray = trimmed.split('|||').filter((img: string) => img.trim())
      } else {
        imageArray = [trimmed]
      }
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
      hourlyPrice: pricing ? Number(pricing.hourly_rate) : 0,
      dailyPrice: pricing ? Number(pricing.daily_rate) : 0,
      weeklyPrice: pricing ? Number(pricing.weekly_rate) : 0,
      monthlyPrice: pricing ? Number(pricing.monthly_rate) : 0,
      hasCCTV: parkingSpace.has_cctv || false,
      hasEVCharging: parkingSpace.ev_charging || false,
      isActive: availability?.is_available ?? true,
      availableFrom: availability?.available_start ? availability.available_start.toISOString().split('T')[0] : '',
      availableTo: availability?.available_end ? availability.available_end.toISOString().split('T')[0] : '',
      isInstantBook: parkingSpace.is_instant_book,
      images: imageArray,
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
