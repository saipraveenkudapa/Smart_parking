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
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
        isVerified: false,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Mark user as verified and clear token
    const verifiedUser = await prisma.user.update({
      where: { userId: user.userId },
      data: {
        isVerified: true,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    // Generate auth token
    const authToken = generateToken({
      userId: verifiedUser.userId.toString(),
      email: verifiedUser.email,
      role: verifiedUser.userType || 'driver',
    })

    return NextResponse.json(
      {
        message: 'Email verified successfully!',
        user: {
          id: verifiedUser.userId,
          email: verifiedUser.email,
          fullName: verifiedUser.fullName,
          role: verifiedUser.userType,
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
