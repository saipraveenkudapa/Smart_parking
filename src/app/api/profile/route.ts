import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string }
    
    // Parse userId as integer since it's stored as string in JWT
    const userId = parseInt(decoded.userId)
    
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        phone_number: true,
        address: true,
        city: true,
        state: true,
        zip_code: true,
        is_verified: true,
        registration_date: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name,
      phoneNumber: user.phone_number,
      address: user.address,
      city: user.city,
      state: user.state,
      zipCode: user.zip_code,
      isVerified: user.is_verified,
      registrationDate: user.registration_date,
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string }
    const body = await req.json()

    // Parse userId as integer since it's stored as string in JWT
    const userId = parseInt(decoded.userId)

    const { fullName, phoneNumber, address, city, state, zipCode } = body

    // Validate required fields
    if (!fullName || !phoneNumber || !address || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if phone number is already taken by another user
    const existingUser = await prisma.users.findFirst({
      where: {
        phone_number: phoneNumber,
        user_id: {
          not: userId,
        },
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Phone number is already in use' },
        { status: 400 }
      )
    }

    // Update user profile
    const updatedUser = await prisma.users.update({
      where: { user_id: userId },
      data: {
        full_name: fullName,
        phone_number: phoneNumber,
        address,
        city,
        state,
        zip_code: zipCode,
        updated_at: new Date(),
      },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        phone_number: true,
        address: true,
        city: true,
        state: true,
        zip_code: true,
        is_verified: true,
        registration_date: true,
      },
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        userId: updatedUser.user_id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        phoneNumber: updatedUser.phone_number,
        address: updatedUser.address,
        city: updatedUser.city,
        state: updatedUser.state,
        zipCode: updatedUser.zip_code,
        isVerified: updatedUser.is_verified,
        registrationDate: updatedUser.registration_date,
      },
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
