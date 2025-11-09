'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'RENTER' as 'RENTER' | 'HOST',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Check Your Email! 📧</h2>
            
            <p className="text-gray-600 mb-6 text-lg">
              We've sent a verification link to:<br/>
              <strong className="text-gray-900">{formData.email}</strong>
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
              <p className="text-sm text-blue-900">
                <strong>What's next?</strong><br/>
                1. Check your inbox (and spam folder)<br/>
                2. Click the verification link in the email<br/>
                3. Your account will be activated automatically<br/>
                4. Login and start using Park-Connect!
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-gray-600">
                ⏰ The verification link expires in 24 hours
              </p>
            </div>

            <Link
              href="/login"
              className="block w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h1>
          <p className="text-gray-600">Join Park-Connect today</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1234567890"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must include uppercase, lowercase, number, and symbol
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I want to:
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="RENTER"
                  checked={formData.role === 'RENTER'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'RENTER' | 'HOST' })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Find parking</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="HOST"
                  checked={formData.role === 'HOST'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'RENTER' | 'HOST' })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">List my space</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
