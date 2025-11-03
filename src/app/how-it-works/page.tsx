'use client'

import Link from 'next/link'
import Header from '@/components/Header'

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <Header />

      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-12">How Park-Connect Works</h1>

        {/* For Renters */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-primary-600 mb-8">🚗 For Renters</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-5xl mb-4">1️⃣</div>
              <h3 className="text-xl font-semibold mb-3">Search for Parking</h3>
              <p className="text-gray-600">
                Enter your location and browse available parking spaces near you. Filter by price, features, and availability.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-5xl mb-4">2️⃣</div>
              <h3 className="text-xl font-semibold mb-3">Book Your Space</h3>
              <p className="text-gray-600">
                Select your preferred parking spot, choose your rental period, and complete the booking with secure payment.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-5xl mb-4">3️⃣</div>
              <h3 className="text-xl font-semibold mb-3">Start Parking</h3>
              <p className="text-gray-600">
                Get access instructions from the host and start using your parking space. Simple and hassle-free!
              </p>
            </div>
          </div>
        </section>

        {/* For Hosts */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-green-600 mb-8">🏠 For Hosts</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-5xl mb-4">1️⃣</div>
              <h3 className="text-xl font-semibold mb-3">List Your Space</h3>
              <p className="text-gray-600">
                Sign up as a host and create a listing for your unused parking space. Add photos, description, and pricing.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-5xl mb-4">2️⃣</div>
              <h3 className="text-xl font-semibold mb-3">Accept Bookings</h3>
              <p className="text-gray-600">
                Review booking requests from renters. Accept the ones that work for you and set your availability.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-5xl mb-4">3️⃣</div>
              <h3 className="text-xl font-semibold mb-3">Earn Money</h3>
              <p className="text-gray-600">
                Get paid monthly for your parking space. Turn your unused driveway or garage into passive income!
              </p>
            </div>
          </div>
        </section>

        {/* Safety & Trust */}
        <section className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-3xl font-bold text-center mb-8">🔒 Safety & Trust</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3">✓ Verified Users</h3>
              <p className="text-gray-600">
                All users verify their phone numbers and email addresses. Build trust with our community.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">✓ Secure Payments</h3>
              <p className="text-gray-600">
                All transactions are processed securely. Hosts receive payments directly, renters get instant booking confirmation.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">✓ Clear Communication</h3>
              <p className="text-gray-600">
                Message hosts directly with questions. Get access instructions and support throughout your rental.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">✓ Flexible Cancellation</h3>
              <p className="text-gray-600">
                Review cancellation policies before booking. Both hosts and renters have clear terms and protections.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <div className="flex justify-center gap-4">
            <Link
              href="/signup?role=renter"
              className="bg-primary-600 text-white px-8 py-4 rounded-lg hover:bg-primary-700 text-lg font-semibold"
            >
              Find Parking
            </Link>
            <Link
              href="/signup?role=host"
              className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 text-lg font-semibold"
            >
              List Your Space
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 Park-Connect. College Project Demo.</p>
        </div>
      </footer>
    </div>
  )
}
