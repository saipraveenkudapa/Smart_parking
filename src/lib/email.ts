import nodemailer from 'nodemailer'

interface SendVerificationEmailParams {
  to: string
  name: string
  verificationUrl: string
}

export async function sendVerificationEmail({
  to,
  name,
  verificationUrl,
}: SendVerificationEmailParams) {
  // Check if SMTP credentials are configured
  const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
  
  if (!smtpConfigured) {
    console.log('⚠️ SMTP not configured - Email will not be sent automatically')
    console.log(`✉️ Manual verification link for ${to}:`)
    console.log(verificationUrl)
    return { 
      success: false, 
      error: 'SMTP not configured',
      verificationUrl // Return URL for fallback display
    }
  }

  try {
    // Create transporter with generic SMTP settings
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    // Send email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Park Connect" <${process.env.SMTP_USER}>`,
      to: to,
      subject: 'Verify your email - Park Connect',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center;">
                        <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🅿️ Park Connect</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 20px 40px 40px 40px;">
                        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Welcome, ${name}! 👋</h2>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                          Thank you for signing up for Park Connect. We're excited to have you join our parking community!
                        </p>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                          To complete your registration and start using Park Connect, please verify your email address by clicking the button below:
                        </p>
                        
                        <!-- Button -->
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td align="center" style="padding: 0 0 30px 0;">
                              <a href="${verificationUrl}" style="display: inline-block; padding: 14px 40px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                                Verify Email Address
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="color: #2563eb; font-size: 14px; word-break: break-all; margin: 0 0 20px 0;">
                          ${verificationUrl}
                        </p>
                        
                        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                          <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0;">
                            This verification link will expire in 24 hours. If you didn't create an account with Park Connect, you can safely ignore this email.
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                        <p style="color: #6b7280; font-size: 12px; margin: 0;">
                          © ${new Date().getFullYear()} Park Connect. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })

    console.log('✅ Verification email sent successfully to:', to)
    console.log('Message ID:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending verification email:', error)
    return { success: false, error }
  }
}
