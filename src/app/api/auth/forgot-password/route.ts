import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { email, phoneNumber } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required for verification' }, { status: 400 })
    }

    // Find user by email
    const user = await prisma.users.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { message: 'If an account exists with this email and phone number, you will receive a password reset link.' },
        { status: 200 }
      )
    }

    // Verify phone number matches
    if (user.phone_number !== phoneNumber) {
      // Don't reveal the mismatch for security - return generic message
      return NextResponse.json(
        { message: 'If an account exists with this email and phone number, you will receive a password reset link.' },
        { status: 200 }
      )
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Save token to database
    await prisma.users.update({
      where: { email },
      data: {
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
      },
    })

    // Create reset link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`

    // Send email with reset link
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Park Connect" <noreply@parkconnect.com>',
        to: user.email,
        subject: '🅿️ Park Connect - Password Reset Request',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🅿️ Park Connect</h1>
                  <p>Password Reset Request</p>
                </div>
                <div class="content">
                  <p>Hello ${user.full_name || 'User'},</p>
                  <p>We received a request to reset your password for your Park Connect account.</p>
                  <p>Click the button below to reset your password:</p>
                  <center>
                    <a href="${resetLink}" class="button">Reset Password</a>
                  </center>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #4F46E5;">${resetLink}</p>
                  <p><strong>This link will expire in 1 hour.</strong></p>
                  <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} Park Connect. All rights reserved.</p>
                    <p>This is an automated email. Please do not reply.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send password reset email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Password reset link has been sent to your email address.',
        // Include link in response for development/testing only
        ...(process.env.NODE_ENV === 'development' && { resetLink }),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}
