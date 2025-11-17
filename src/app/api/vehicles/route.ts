import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Get user's vehicles
export async function GET(req: NextRequest) {
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

    const userId = parseInt(payload.userId)

    // Get all vehicles for this user
    const vehicles = await prisma.vehicle.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        vehicle_id: 'desc',
      },
    })

    // Map to maintain API compatibility
    const mappedVehicles = vehicles.map(v => ({
      vehicleId: v.vehicle_id,
      userId: v.user_id,
      licensePlate: v.license_plate,
      make: v.make,
      model: v.model,
      year: v.year,
      color: v.color,
      vehicleType: v.vehicle_type,
    }))

    return NextResponse.json({ vehicles: mappedVehicles })
  } catch (error) {
    console.error('Get vehicles error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    )
  }
}

// POST - Add a new vehicle
export async function POST(req: NextRequest) {
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

    const userId = parseInt(payload.userId)
    const body = await req.json()
    const { licensePlate, make, model, year, color, vehicleType, isDefault } = body

    // Validate required fields
    if (!licensePlate || !make || !model || !year) {
      return NextResponse.json(
        { error: 'Missing required fields: licensePlate, make, model, year' },
        { status: 400 }
      )
    }

    // Validate year
    const currentYear = new Date().getFullYear()
    const vehicleYear = parseInt(year)
    if (isNaN(vehicleYear) || vehicleYear < 1900 || vehicleYear > currentYear + 1) {
      return NextResponse.json(
        { error: 'Invalid vehicle year' },
        { status: 400 }
      )
    }

    // Check if license plate already exists
    const existingVehicle = await prisma.vehicle.findFirst({
      where: { license_plate: licensePlate.toUpperCase() },
    })

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'A vehicle with this license plate already exists' },
        { status: 409 }
      )
    }

    // Note: dim_vehicle doesn't have isDefault field in park_connect schema
    // Removed default vehicle logic

    // Create the vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        user_id: userId,
        license_plate: licensePlate.toUpperCase(),
        make,
        model,
        year: vehicleYear,
        color: color || null,
        vehicle_type: vehicleType?.toLowerCase() || 'sedan',
      },
    })

    return NextResponse.json(
      {
        message: 'Vehicle added successfully',
        vehicle: {
          vehicleId: vehicle.vehicle_id,
          userId: vehicle.user_id,
          licensePlate: vehicle.license_plate,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          vehicleType: vehicle.vehicle_type,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create vehicle error:', error)
    return NextResponse.json(
      { error: 'Failed to add vehicle' },
      { status: 500 }
    )
  }
}
