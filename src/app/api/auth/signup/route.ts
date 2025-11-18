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
    
    // Check if email already exists
    const existingUserByEmail = await prisma.users.findUnique({
      where: { email: validatedData.email },
    })
    
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }
    
    // Phone number is required in the new schema
    if (!validatedData.phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }
    
    // Check if phone number already exists
    const existingUserByPhone = await prisma.users.findFirst({
      where: { phone_number: validatedData.phoneNumber },
    })
    
    if (existingUserByPhone) {
      return NextResponse.json(
        { error: 'User with this phone number already exists' },
        { status: 400 }
      )
    }
    
    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    // Create user directly (with unverified status)
    // Note: date_of_birth, address, city, state, zip_code are required by DB schema
    // Using placeholder values that user can update in their profile later
    const newUser = await prisma.users.create({
      data: {
        full_name: validatedData.fullName,
        email: validatedData.email,
        password: hashedPassword,
        phone_number: validatedData.phoneNumber!,
        date_of_birth: new Date('1990-01-01'), // Placeholder - user can update in profile
        status: 1, // Active status (SmallInt: 1=active, 0=inactive)
        address: 'To be updated', // Placeholder - required by schema
        city: 'To be updated',    // Placeholder - required by schema
        state: 'XX',              // Placeholder - required by schema
        zip_code: '00000',        // Placeholder - required by schema
        is_verified: false,
        reset_token: verificationToken,
        reset_token_expiry: tokenExpiry,
        registration_date: new Date(),
      },
    })
    
    // Create verification URL - Always use production URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://smart-parking-two-sigma.vercel.app'
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`
    
    // Try to send verification email via SMTP
    const emailResult = await sendVerificationEmail({
      to: validatedData.email,
      name: validatedData.fullName,
      verificationUrl,
    })
    
    if (emailResult.success) {
      console.log('✉️ Verification email sent to:', validatedData.email)
      return NextResponse.json(
        {
          message: 'Account created successfully! Please check your email to verify your account.',
          email: newUser.email,
          userId: newUser.user_id,
          emailSent: true,
        },
        { status: 201 }
      )
    } else {
      // SMTP not configured - return verification URL for manual verification
      console.log('⚠️ SMTP not configured, providing manual verification URL')
      return NextResponse.json(
        {
          message: 'Account created successfully! Use the verification link below.',
          email: newUser.email,
          userId: newUser.user_id,
          emailSent: false,
          verificationUrl, // Show URL button on frontend
        },
        { status: 201 }
      )
    }
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
