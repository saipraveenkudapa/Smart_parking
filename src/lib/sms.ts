/**
 * SMS Service for sending OTP via Twilio
 * Sends real SMS messages to users
 */

import twilio from 'twilio'

const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Send OTP via SMS using Twilio
 * Falls back to console if Twilio not configured
 */
export async function sendOTP(phoneNumber: string, otp: string): Promise<void> {
  // If Twilio is configured, send real SMS
  if (client && process.env.TWILIO_PHONE_NUMBER) {
    try {
      await client.messages.create({
        body: `Your Park-Connect verification code is: ${otp}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      })
      console.log(`✅ SMS sent to ${phoneNumber}`)
    } catch (error) {
      console.error('❌ Failed to send SMS:', error)
      // Fallback to console
      console.log('\n📱 SMS OTP (Twilio failed, showing in console):')
      console.log(`To: ${phoneNumber}`)
      console.log(`OTP: ${otp}\n`)
    }
  } else {
    // Fallback: log to console if Twilio not configured
    console.log('\n📱 SMS OTP (Twilio not configured):')
    console.log(`To: ${phoneNumber}`)
    console.log(`OTP: ${otp}`)
    console.log('This OTP is valid for 5 minutes.\n')
  }
}

/**
 * Store OTP in memory (for college project)
 * In production, use Redis or database
 */
const otpStore = new Map<string, { otp: string; expiry: number }>()

export function storeOTP(phoneNumber: string, otp: string): void {
  const expiry = Date.now() + 5 * 60 * 1000 // 5 minutes
  otpStore.set(phoneNumber, { otp, expiry })
}

export function verifyOTP(phoneNumber: string, otp: string): boolean {
  const stored = otpStore.get(phoneNumber)
  if (!stored) return false
  
  if (Date.now() > stored.expiry) {
    otpStore.delete(phoneNumber)
    return false
  }
  
  if (stored.otp === otp) {
    otpStore.delete(phoneNumber)
    return true
  }
  
  return false
}
