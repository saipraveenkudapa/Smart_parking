import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signupSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    const validatedData = signupSchema.parse(body)
    
    // Check if email already exists in main users table
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })
    
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }
    
    // Check if phone number already exists in main users table
    const existingUserByPhone = await prisma.user.findFirst({
      where: { phoneNumber: validatedData.phoneNumber },
    })
    
    if (existingUserByPhone) {
      return NextResponse.json(
        { error: 'User with this phone number already exists' },
        { status: 400 }
      )
    }
    
    // Check if email exists in pending users table
    const existingPendingByEmail = await prisma.pendingUser.findFirst({
      where: { email: validatedData.email },
    })
    
    if (existingPendingByEmail) {
      return NextResponse.json(
        { error: 'A verification email has already been sent to this email. Please check your inbox or try again later.' },
        { status: 400 }
      )
    }
    
    // Check if phone number exists in pending users table
    const existingPendingByPhone = await prisma.pendingUser.findFirst({
      where: { phoneNumber: validatedData.phoneNumber },
    })
    
    if (existingPendingByPhone) {
      return NextResponse.json(
        { error: 'This phone number is already registered with a pending account. Please verify your email first.' },
        { status: 400 }
      )
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
    
    // Create verification URL - Use Vercel's URL or production URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://smart-parking-delta.vercel.app')
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`
    
    // Send magic link email using Supabase Auth
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: validatedData.email,
        options: {
          emailRedirectTo: verificationUrl,
          shouldCreateUser: false, // Don't create Supabase user, just use email service
        },
      })
      
      if (error) {
        console.error('Supabase email error:', error.message)
      } else {
        console.log('✉️ Verification email sent via Supabase to:', validatedData.email)
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
    }
    
    return NextResponse.json(
      {
        message: 'Account created successfully! Please check your email to verify your account.',
        email: pendingUser.email,
        verificationUrl, // Include URL as fallback for manual verification
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
