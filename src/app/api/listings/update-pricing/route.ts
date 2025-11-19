import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function PUT(req: NextRequest) {
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
    const { spaceId, hourlyRate, dailyRate, weeklyRate, monthlyRate } = body

    // Validate required fields
    if (!spaceId || !hourlyRate || !dailyRate || !monthlyRate) {
      return NextResponse.json(
        { error: 'Missing required fields: spaceId, hourlyRate, dailyRate, monthlyRate' },
        { status: 400 }
      )
    }

    // Get current parking space with pricing info
    const parkingSpace = await prisma.parking_spaces.findUnique({
      where: { space_id: parseInt(spaceId) },
      select: { 
        space_id: true, 
        pricing_id: true,
        title: true 
      },
    })

    if (!parkingSpace) {
      return NextResponse.json(
        { error: 'Parking space not found' },
        { status: 404 }
      )
    }

    // Calculate next pricing_id (current + 1)
    const nextPricingId = parkingSpace.pricing_id + 1

    // Mark current pricing as not current
    await prisma.pricing_model.updateMany({
      where: {
        space_id: parkingSpace.space_id,
        is_current: true,
      },
      data: {
        is_current: false,
      },
    })

    // Create new pricing record with incremented pricing_id
    const newPricing = await prisma.pricing_model.create({
      data: {
        pricing_id: nextPricingId,
        space_id: parkingSpace.space_id,
        valid_from: new Date(),
        is_current: true,
        hourly_rate: parseFloat(hourlyRate),
        daily_rate: parseFloat(dailyRate),
        weekly_rate: weeklyRate ? parseFloat(weeklyRate) : null,
        monthly_rate: parseFloat(monthlyRate),
      },
    })

    // Update parking_spaces table with new pricing_id reference
    await prisma.parking_spaces.update({
      where: { space_id: parkingSpace.space_id },
      data: { pricing_id: nextPricingId },
    })

    return NextResponse.json(
      {
        message: 'Pricing updated successfully',
        pricing: {
          pricingId: newPricing.pricing_id,
          hourlyRate: newPricing.hourly_rate,
          dailyRate: newPricing.daily_rate,
          weeklyRate: newPricing.weekly_rate,
          monthlyRate: newPricing.monthly_rate,
          validFrom: newPricing.valid_from,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update pricing error:', error)
    return NextResponse.json(
      { error: 'Failed to update pricing' },
      { status: 500 }
    )
  }
}
