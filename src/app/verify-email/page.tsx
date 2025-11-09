'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('Verifying your email...')
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setStatus('error')
        setMessage('Invalid verification link')
        return
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (response.ok) {
          setStatus('success')
          setMessage(data.message)
          
          // Store token
          if (data.token) {
            localStorage.setItem('token', data.token)
            localStorage.setItem('user', JSON.stringify(data.user))
          }

          // Countdown before redirect
          let count = 3
          const interval = setInterval(() => {
            count--
            setCountdown(count)
            if (count === 0) {
              clearInterval(interval)
              router.push('/')
            }
          }, 1000)
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed')
        }
      } catch (error) {
        setStatus('error')
        setMessage('An error occurred during verification')
      }
    }

    verifyEmail()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50 px-4">
      <div className="max-w-lg w-full">
        {/* Park-Connect Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center gap-2">
              <span className="text-5xl">🅿️</span>
              <span className="text-3xl font-bold text-gray-800">Park-Connect</span>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center border border-gray-100">
          {status === 'verifying' && (
            <>
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 border-8 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-3">Verifying Your Email</h1>
              <p className="text-lg text-gray-600 mb-4">Please wait while we confirm your account...</p>
              <div className="flex justify-center gap-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-3">Email Verified Successfully! 🎉</h1>
              <p className="text-lg text-gray-600 mb-6">
                Welcome to Park-Connect! Your account is now active.
              </p>
              
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 text-left">
                <p className="text-sm text-green-800">
                  <strong>✓ Account Created</strong><br/>
                  You can now search for parking spaces or list your own space to earn money!
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Redirecting to homepage in</p>
                <div className="text-4xl font-bold text-green-600">{countdown}s</div>
              </div>

              <button
                onClick={() => router.push('/')}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
              >
                Go to Homepage Now
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-red-100 rounded-full"></div>
                <div className="relative w-24 h-24 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
                  <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-3">Verification Failed</h1>
              <p className="text-lg text-gray-600 mb-6">{message}</p>
              
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-left">
                <p className="text-sm text-red-800">
                  <strong>Possible reasons:</strong><br/>
                  • The verification link has expired (valid for 24 hours)<br/>
                  • The link has already been used<br/>
                  • Invalid or corrupted verification token
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/signup')}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
                >
                  Create New Account
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Contact us at support@park-connect.com
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50 px-4">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2">
              <span className="text-5xl">🅿️</span>
              <span className="text-3xl font-bold text-gray-800">Park-Connect</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-10 text-center border border-gray-100">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 border-8 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Loading...</h1>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
