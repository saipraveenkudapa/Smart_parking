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
    
    // Check if user already exists in main users table
    const existingUser = await prisma.user.findFirst({
      where: {
        email: validatedData.email,
      },
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }
    
    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    // Delete any existing pending user with same email (cleanup old attempts)
    await prisma.pendingUser.deleteMany({
      where: {
        email: validatedData.email,
      },
    })
    
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
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`
    
    // Send verification email via Supabase Auth
    const { error: emailError } = await supabase.auth.signInWithOtp({
      email: validatedData.email,
      options: {
        emailRedirectTo: verificationUrl,
      },
    })
    
    if (emailError) {
      console.error('Failed to send verification email via Supabase:', emailError)
      // Log verification link as fallback
      console.log(`� Verification link for ${validatedData.email}:`)
      console.log(verificationUrl)
    }
    
    return NextResponse.json(
      {
        message: 'Verification email sent! Please check your inbox.',
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
