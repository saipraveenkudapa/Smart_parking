import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp } = await request.json()

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      )
    }

    // First try to verify with Supabase Auth
    const { data: supabaseData, error: supabaseError } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: otp,
      type: 'sms',
    })

    // If Supabase verification fails, fall back to our pending user system
    if (supabaseError) {
      console.log('Supabase OTP verification failed, trying pending user fallback:', supabaseError.message)
      
      const pendingUser = await prisma.pendingUser.findFirst({
        where: {
          phoneNumber,
          otp,
          otpExpiry: {
            gt: new Date(),
          },
        },
      })

      if (!pendingUser) {
        return NextResponse.json(
          { error: 'Invalid or expired OTP' },
          { status: 400 }
        )
      }

      // Create user from pending user
      const user = await prisma.user.create({
        data: {
          fullName: pendingUser.fullName,
          email: pendingUser.email,
          password: pendingUser.password,
          phoneNumber: pendingUser.phoneNumber,
          role: pendingUser.role,
          phoneVerified: true,
        },
      })

      await prisma.pendingUser.delete({
        where: { id: pendingUser.id },
      })

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      })

      return NextResponse.json(
        {
          message: 'Phone verified successfully!',
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            phoneVerified: true,
          },
          token,
        },
        { status: 200 }
      )
    }

    // Supabase verification succeeded - now create user in our database
    const pendingUser = await prisma.pendingUser.findFirst({
      where: {
        phoneNumber,
      },
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: 'No pending registration found for this phone number' },
        { status: 400 }
      )
    }

    const user = await prisma.user.create({
      data: {
        fullName: pendingUser.fullName,
        email: pendingUser.email,
        password: pendingUser.password,
        phoneNumber: pendingUser.phoneNumber,
        role: pendingUser.role,
        phoneVerified: true,
      },
    })

    await prisma.pendingUser.delete({
      where: { id: pendingUser.id },
    })

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return NextResponse.json(
      {
        message: 'Phone verified successfully!',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phoneVerified: true,
        },
        token,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('OTP verification error:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this email or phone number already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}
