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
      where: { vehicle_id: vehicleId },
    })

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    if (existingVehicle.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this vehicle' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (body.licensePlate) {
      // Check if new license plate conflicts with another vehicle
      if (body.licensePlate.toUpperCase() !== existingVehicle.license_plate) {
        const conflict = await prisma.vehicle.findFirst({
          where: { license_plate: body.licensePlate.toUpperCase() },
        })
        if (conflict && conflict.vehicle_id !== vehicleId) {
          return NextResponse.json(
            { error: 'A vehicle with this license plate already exists' },
            { status: 409 }
          )
        }
      }
      updateData.license_plate = body.licensePlate.toUpperCase()
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
    if (body.vehicleType) updateData.vehicle_type = body.vehicleType.toLowerCase()

    // Note: dim_vehicle doesn't have isDefault field - removed that logic

    // Update the vehicle
    const updatedVehicle = await prisma.vehicle.update({
      where: { vehicle_id: vehicleId },
      data: updateData,
    })

    return NextResponse.json({
      message: 'Vehicle updated successfully',
      vehicle: {
        vehicleId: updatedVehicle.vehicle_id,
        userId: updatedVehicle.user_id,
        licensePlate: updatedVehicle.license_plate,
        make: updatedVehicle.make,
        model: updatedVehicle.model,
        year: updatedVehicle.year,
        color: updatedVehicle.color,
        vehicleType: updatedVehicle.vehicle_type,
      },
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
      where: { vehicle_id: vehicleId },
    })

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    if (existingVehicle.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this vehicle' },
        { status: 403 }
      )
    }

    // Note: Cannot check active bookings as fact_bookings doesn't have vehicle_id directly
    // In the normalized schema, vehicle info would need to be tracked differently
    // For now, allow deletion

    // Delete the vehicle
    await prisma.vehicle.delete({
      where: { vehicle_id: vehicleId },
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
