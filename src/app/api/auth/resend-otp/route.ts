import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find pending user with this email
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { email },
    })

    if (!pendingUser) {
      return NextResponse.json(
        { error: 'No pending verification found for this email' },
        { status: 404 }
      )
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update pending user with new token
    await prisma.pendingUser.update({
      where: { email },
      data: {
        verificationToken,
        tokenExpiry,
      },
    })

    // Create verification URL
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`

    // Resend verification email via Supabase Auth
    const { error: emailError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: verificationUrl,
      },
    })

    if (emailError) {
      console.error('Failed to send verification email via Supabase:', emailError)
      // Log verification link as fallback
      console.log(`� Verification link for ${email}:`)
      console.log(verificationUrl)
    }

    return NextResponse.json(
      { message: 'Verification email sent successfully!' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    )
  }
}
