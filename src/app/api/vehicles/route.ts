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
        userId,
      },
      orderBy: [
        { isDefault: 'desc' }, // Default vehicle first
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ vehicles })
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
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { licensePlate: licensePlate.toUpperCase() },
    })

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'A vehicle with this license plate already exists' },
        { status: 409 }
      )
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.vehicle.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    // Create the vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        userId,
        licensePlate: licensePlate.toUpperCase(),
        make,
        model,
        year: vehicleYear,
        color: color || null,
        vehicleType: vehicleType?.toLowerCase() || 'sedan',
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json(
      {
        message: 'Vehicle added successfully',
        vehicle,
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
