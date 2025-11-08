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

    // Find pending user with valid token
    const pendingUser = await prisma.pendingUser.findFirst({
      where: {
        verificationToken: token,
        tokenExpiry: {
          gt: new Date(),
        },
      },
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Create actual user account
    const user = await prisma.user.create({
      data: {
        fullName: pendingUser.fullName,
        email: pendingUser.email,
        password: pendingUser.password,
        phoneNumber: pendingUser.phoneNumber,
        role: pendingUser.role,
        emailVerified: true,
      },
    })

    // Delete pending user
    await prisma.pendingUser.delete({
      where: { id: pendingUser.id },
    })

    // Generate auth token
    const authToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return NextResponse.json(
      {
        message: 'Email verified successfully!',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
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
