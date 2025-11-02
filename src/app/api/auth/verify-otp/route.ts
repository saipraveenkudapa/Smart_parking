import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyOTP } from '@/lib/sms'
import { verifyToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { otp } = await req.json()
    
    if (!otp) {
      return NextResponse.json({ error: 'OTP is required' }, { status: 400 })
    }
    
    // Get user from JWT token
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Verify OTP
    const isValid = verifyOTP(user.phoneNumber, otp)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }
    
    // Update user as phone verified
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true },
    })
    
    return NextResponse.json({
      message: 'Phone number verified successfully',
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
