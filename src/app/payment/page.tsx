'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { requireAuth } from '@/lib/clientAuth'

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get booking details from URL (new flow - booking not created yet)
  const listingId = searchParams.get('listingId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const vehicleId = searchParams.get('vehicleId')
  const durationType = searchParams.get('durationType')
  const listingTitle = searchParams.get('title')
  
  // Legacy support: bookingId for old flow (if any pending bookings exist)
  const bookingId = searchParams.get('bookingId')
  const amount = searchParams.get('amount')

  const [bookingDetails, setBookingDetails] = useState<any | null>(null)
  const [bookingLoading, setBookingLoading] = useState(!!bookingId)
  const [bookingError, setBookingError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0)
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
  })

  useEffect(() => {
    if (!requireAuth('/payment')) {
      return
    }

    // Calculate amount from booking details if provided (new flow)
    if (listingId && startDate && endDate && !bookingId) {
      calculateBookingAmount()
    }
  }, [router, listingId, startDate, endDate, bookingId])

  const calculateBookingAmount = async () => {
    setBookingLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setBookingError('Please log in to continue.')
        setBookingLoading(false)
        return
      }

      // Fetch listing details to get pricing
      const listingRes = await fetch(`/api/listings/${listingId}`)
      const listingData = await listingRes.json()
      
      if (!listingRes.ok) {
        throw new Error(listingData.error || 'Failed to fetch listing details')
      }

      const listing = listingData.listing
      const start = new Date(startDate!)
      const end = new Date(endDate!)
      const durationMs = end.getTime() - start.getTime()
      const durationHours = durationMs / (1000 * 60 * 60)
      const durationDays = durationMs / (1000 * 60 * 60 * 24)
      const durationWeeks = durationDays / 7
      const durationMonths = durationDays / 30

      const hourlyRate = Number(listing.hourlyPrice) || 0
      const dailyRate = Number(listing.dailyPrice) || 0
      const weeklyRate = Number(listing.weeklyPrice) || 0
      const monthlyRate = Number(listing.monthlyPrice) || 0

      let subtotal = 0
      const normalizeType = (durationType || '').toLowerCase()

      switch (normalizeType) {
        case '30m':
        case '1h':
          subtotal = hourlyRate * Math.ceil(durationHours)
          break
        case '1d':
        case '24h':
          subtotal = dailyRate * Math.ceil(durationDays)
          break
        case '1w':
          subtotal = weeklyRate * Math.ceil(durationWeeks)
          break
        case '1m':
          subtotal = monthlyRate * Math.ceil(durationMonths)
          break
        case 'custom':
        default:
          if (durationDays >= 30) {
            subtotal = monthlyRate * Math.ceil(durationMonths)
          } else if (durationDays >= 7) {
            subtotal = weeklyRate * Math.ceil(durationWeeks)
          } else if (durationDays >= 1) {
            subtotal = dailyRate * Math.ceil(durationDays)
          } else {
            subtotal = hourlyRate * Math.ceil(durationHours)
          }
          break
      }

      const serviceFee = subtotal * 0.15
      const total = subtotal + serviceFee

      setCalculatedAmount(total)
      setBookingError('')
    } catch (err: any) {
      console.error('Failed to calculate booking amount:', err)
      setBookingError(err.message || 'Failed to calculate booking amount')
    } finally {
      setBookingLoading(false)
    }
  }

  useEffect(() => {
    if (!bookingId) {
      setBookingLoading(false)
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setBookingError('Please log in to view your booking details.')
      setBookingLoading(false)
      return
    }

    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch booking details')
        }
        setBookingDetails(data.booking)
        setBookingError('')
      } catch (err: any) {
        console.error('Failed to load booking details:', err)
        setBookingError(err.message || 'Failed to load booking details')
      } finally {
        setBookingLoading(false)
      }
    }

    fetchBooking()
  }, [bookingId])

  const safeNumber = (value: any) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
  }

  const resolvedAmount = calculatedAmount > 0
    ? calculatedAmount
    : bookingDetails
      ? safeNumber(bookingDetails.totalAmount)
      : safeNumber(amount)

  const serviceFeeAmount = bookingDetails && bookingDetails.serviceFee != null
    ? safeNumber(bookingDetails.serviceFee)
    : resolvedAmount * 0.15

  const bookingBaseAmount = Math.max(resolvedAmount - serviceFeeAmount, 0)
  const displayTitle = bookingDetails?.space?.title || listingTitle || 'Parking Space'
  const paymentDisabled = processing || bookingLoading || resolvedAmount <= 0

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    // Simulate payment processing
    setTimeout(async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setBookingError('Authentication required')
          setProcessing(false)
          return
        }

        // NEW FLOW: Create booking AFTER payment succeeds
        if (listingId && startDate && endDate && vehicleId && !bookingId) {
          const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              listingId,
              startDate,
              endDate,
              vehicleId,
              durationType,
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create booking after payment')
          }

          // Mark payment as completed immediately
          if (data.booking?.bookingId) {
            await fetch(`/api/bookings/${data.booking.bookingId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ paymentStatus: 'completed' }),
            })
          }
        } 
        // LEGACY FLOW: Update existing booking payment status
        else if (bookingId && token) {
          await fetch(`/api/bookings/${bookingId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ paymentStatus: 'completed' }),
          })
        }

        setProcessing(false)
        setPaymentSuccess(true)

        // Redirect to bookings after a short delay
        setTimeout(() => {
          router.push(`/renter/bookings`)
        }, 1500)
      } catch (err: any) {
        console.error('Payment/booking creation failed:', err)
        setBookingError(err.message || 'Payment succeeded but booking creation failed. Please contact support.')
        setProcessing(false)
      }
    }, 2000)
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(' ')
    } else {
      return value
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4)
    }
    return v
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Payment Successful! 🎉</h2>
            <p className="text-gray-600 mb-6">
              Your booking has been confirmed and paid.
            </p>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 text-left">
              <p className="text-sm text-green-800">
                <strong>Transaction ID:</strong> TXN{Math.random().toString(36).substr(2, 9).toUpperCase()}<br/>
                <strong>Amount Paid:</strong> ${resolvedAmount.toFixed(2)}<br/>
                <strong>Status:</strong> <span className="text-green-600 font-semibold">Completed</span>
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Redirecting to your bookings...
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href={`/listing/${listingId || searchParams.get('listingId')}`} className="text-green-600 hover:underline">
              ← Back to Listing
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Payment Form */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>
                {bookingError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                    {bookingError}
                  </div>
                )}

                {/* Payment Form */}
                <form onSubmit={handlePayment}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        value={cardDetails.cardNumber}
                        onChange={(e) => setCardDetails({
                          ...cardDetails,
                          cardNumber: formatCardNumber(e.target.value)
                        })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cardholder Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={cardDetails.cardHolder}
                        onChange={(e) => setCardDetails({
                          ...cardDetails,
                          cardHolder: e.target.value
                        })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry Date *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardDetails.expiryDate}
                          onChange={(e) => setCardDetails({
                            ...cardDetails,
                            expiryDate: formatExpiryDate(e.target.value)
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVV *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="123"
                          maxLength={3}
                          value={cardDetails.cvv}
                          onChange={(e) => setCardDetails({
                            ...cardDetails,
                            cvv: e.target.value.replace(/\D/g, '')
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={paymentDisabled}
                      className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Processing Payment...
                        </span>
                      ) : (
                        `Pay $${resolvedAmount.toFixed(2)}`
                      )}
                    </button>
                  </div>
                </form>

                {/* Security Badge */}
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Secure 256-bit SSL Encrypted Payment</span>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm text-gray-600 mb-2">Parking Space</p>
                  <p className="font-medium">{displayTitle}</p>
                </div>

                {bookingLoading ? (
                  <p className="text-sm text-gray-500 mb-4">Loading latest pricing...</p>
                ) : (
                  <div className="space-y-3 mb-4 pb-4 border-b">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Booking Amount</span>
                      <span className="font-medium">${bookingBaseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Service Fee (15%)</span>
                      <span className="font-medium">${serviceFeeAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${resolvedAmount.toFixed(2)}
                  </span>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-800">
                    🎉 <strong>Demo Mode:</strong> This is a demonstration payment page. No actual charges will be made. Amounts shown come directly from the host's pricing model.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-4">Loading payment details...</p>
        </div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  )
}
