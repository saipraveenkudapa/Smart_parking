import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signupSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    const validatedData = signupSchema.parse(body)
    
    // Check if user already exists in main users table (email or phone)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { phoneNumber: validatedData.phoneNumber },
        ],
      },
    })
    
    if (existingUser) {
      if (existingUser.email === validatedData.email) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: 'User with this phone number already exists' },
          { status: 400 }
        )
      }
    }
    
    // Check if email or phone exists in pending users table
    const existingPendingUser = await prisma.pendingUser.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { phoneNumber: validatedData.phoneNumber },
        ],
      },
    })
    
    if (existingPendingUser) {
      if (existingPendingUser.email === validatedData.email) {
        return NextResponse.json(
          { error: 'A verification email has already been sent to this email. Please check your inbox or try again later.' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: 'This phone number is already registered with a pending account' },
          { status: 400 }
        )
      }
    }
    
    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    // Create pending user (not in main users table yet)
    const pendingUser = await prisma.pendingUser.create({
      data: {
        fullName: validatedData.fullName,
        email: validatedData.email,
        password: hashedPassword,
        phoneNumber: validatedData.phoneNumber,
        role: validatedData.role,
        verificationToken,
        tokenExpiry,
      },
    })
    
    // Create verification URL
    // Use Vercel's automatic URL if available, fallback to env variable
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`
    
    // Send verification email
    const emailResult = await sendVerificationEmail({
      to: validatedData.email,
      name: validatedData.fullName,
      verificationUrl,
    })
    
    if (!emailResult.success) {
      // Log the error but still return success since user is created
      console.error('Failed to send email, but user created. Verification URL:', verificationUrl)
    }
    
    return NextResponse.json(
      {
        message: 'Verification email sent! Please check your inbox and spam folder.',
        email: pendingUser.email,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
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
