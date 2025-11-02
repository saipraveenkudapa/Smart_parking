import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`

  // For college project: log to console if SMTP not configured
  if (!process.env.SMTP_USER) {
    console.log('\n🔗 Email Verification Link (SMTP not configured):')
    console.log(verificationUrl)
    console.log('\n')
    return
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@parkconnect.com',
    to: email,
    subject: 'Verify Your Email - Park-Connect',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Park-Connect!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666;">${verificationUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">
          If you didn't create an account with Park-Connect, please ignore this email.
        </p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

  if (!process.env.SMTP_USER) {
    console.log('\n🔗 Password Reset Link (SMTP not configured):')
    console.log(resetUrl)
    console.log('\n')
    return
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@parkconnect.com',
    to: email,
    subject: 'Reset Your Password - Park-Connect',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        </p>
      </div>
    `,
  })
}
