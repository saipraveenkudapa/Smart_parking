import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations'
import { comparePassword, generateToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    const validatedData = loginSchema.parse(body)
    
    // Find user
    const user = await prisma.dim_users.findUnique({
      where: { email: validatedData.email },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Check if user is verified
    if (!user.is_verified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in' },
        { status: 403 }
      )
    }
    
    // Verify password
    const isValidPassword = await comparePassword(
      validatedData.password,
      user.password
    )
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Update last login (updated_at timestamp)
    await prisma.dim_users.update({
      where: { user_id: user.user_id },
      data: { updated_at: new Date() },
    })
    
    // Generate JWT token
    const token = generateToken({
      userId: user.user_id.toString(),
      email: user.email,
      role: 'driver', // No userType field in new schema
    })
    
    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        phoneNumber: user.phone_number,
        emailVerified: user.is_verified,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    
    if (error instanceof Error && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
