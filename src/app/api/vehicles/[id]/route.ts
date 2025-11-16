import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// PATCH - Update a vehicle
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
    const vehicleId = parseInt(id)
    
    if (isNaN(vehicleId)) {
      return NextResponse.json(
        { error: 'Invalid vehicle ID' },
        { status: 400 }
      )
    }

    const userId = parseInt(payload.userId)
    const body = await req.json()

    // Check if vehicle exists and belongs to user
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { vehicleId },
    })

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    if (existingVehicle.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this vehicle' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (body.licensePlate) {
      // Check if new license plate conflicts with another vehicle
      if (body.licensePlate.toUpperCase() !== existingVehicle.licensePlate) {
        const conflict = await prisma.vehicle.findUnique({
          where: { licensePlate: body.licensePlate.toUpperCase() },
        })
        if (conflict) {
          return NextResponse.json(
            { error: 'A vehicle with this license plate already exists' },
            { status: 409 }
          )
        }
      }
      updateData.licensePlate = body.licensePlate.toUpperCase()
    }

    if (body.make) updateData.make = body.make
    if (body.model) updateData.model = body.model
    
    if (body.year) {
      const currentYear = new Date().getFullYear()
      const vehicleYear = parseInt(body.year)
      if (isNaN(vehicleYear) || vehicleYear < 1900 || vehicleYear > currentYear + 1) {
        return NextResponse.json(
          { error: 'Invalid vehicle year' },
          { status: 400 }
        )
      }
      updateData.year = vehicleYear
    }

    if (body.color !== undefined) updateData.color = body.color || null
    if (body.vehicleType) updateData.vehicleType = body.vehicleType.toLowerCase()

    // Handle setting as default
    if (body.isDefault === true) {
      // Unset other defaults first
      await prisma.vehicle.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
      updateData.isDefault = true
    } else if (body.isDefault === false) {
      updateData.isDefault = false
    }

    // Update the vehicle
    const updatedVehicle = await prisma.vehicle.update({
      where: { vehicleId },
      data: updateData,
    })

    return NextResponse.json({
      message: 'Vehicle updated successfully',
      vehicle: updatedVehicle,
    })
  } catch (error) {
    console.error('Update vehicle error:', error)
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a vehicle
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
    const vehicleId = parseInt(id)
    
    if (isNaN(vehicleId)) {
      return NextResponse.json(
        { error: 'Invalid vehicle ID' },
        { status: 400 }
      )
    }

    const userId = parseInt(payload.userId)

    // Check if vehicle exists and belongs to user
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { vehicleId },
    })

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    if (existingVehicle.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this vehicle' },
        { status: 403 }
      )
    }

    // Check if vehicle has active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        vehicleId,
        bookingStatus: {
          in: ['pending', 'confirmed'],
        },
      },
    })

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with active bookings. Please cancel bookings first.' },
        { status: 400 }
      )
    }

    // Delete the vehicle
    await prisma.vehicle.delete({
      where: { vehicleId },
    })

    return NextResponse.json({
      message: 'Vehicle deleted successfully',
    })
  } catch (error) {
    console.error('Delete vehicle error:', error)
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    )
  }
}
