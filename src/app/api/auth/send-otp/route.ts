import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP, sendOTP, storeOTP } from '@/lib/sms'
import { verifyToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
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
      where: { userId: parseInt(payload.userId) },
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    if (!user.phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found for this user' }, { status: 400 })
    }
    
    // Generate and send OTP
    const otp = generateOTP()
    storeOTP(user.phoneNumber, otp)
    await sendOTP(user.phoneNumber, otp)
    
    return NextResponse.json({
      message: 'OTP sent successfully',
      phoneNumber: user.phoneNumber,
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
