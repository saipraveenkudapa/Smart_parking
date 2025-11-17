import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Find user with valid token
    const user = await prisma.users.findFirst({
      where: {
        reset_token: token,
        reset_token_expiry: {
          gt: new Date(),
        },
        is_verified: false,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Mark user as verified and clear token
    const verifiedUser = await prisma.users.update({
      where: { user_id: user.user_id },
      data: {
        is_verified: true,
        reset_token: null,
        reset_token_expiry: null,
      },
    })

    // Generate auth token
    const authToken = generateToken({
      userId: verifiedUser.user_id.toString(),
      email: verifiedUser.email,
      role: 'driver', // No userType in new schema
    })

    return NextResponse.json(
      {
        message: 'Email verified successfully!',
        user: {
          id: verifiedUser.user_id,
          email: verifiedUser.email,
          fullName: verifiedUser.full_name,
          phoneNumber: verifiedUser.phone_number,
          emailVerified: true,
        },
        token: authToken,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Email verification error:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}
