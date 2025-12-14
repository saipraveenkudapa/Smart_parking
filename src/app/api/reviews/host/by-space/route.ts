import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

type ReviewsBySpaceRow = {
  space_id: number
  title: string
  avg_rating: number | string | null
  total_reviews: number | string
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let decoded: any
    try {
      decoded = verify(token, JWT_SECRET)
    } catch {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    const ownerId = parseInt(decoded.userId, 10)
    if (!Number.isFinite(ownerId)) {
      return NextResponse.json({ error: 'Unauthorized - Invalid user' }, { status: 401 })
    }

    const rows = await prisma.$queryRaw<ReviewsBySpaceRow[]>`
      SELECT
        ps.space_id,
        ps.title,
        AVG(r.rating) AS avg_rating,
        COUNT(r.review_id) AS total_reviews
      FROM park_connect.reviews r
      JOIN park_connect.bookings b ON r.booking_id = b.booking_id
      JOIN park_connect.availability a ON b.availability_id = a.availability_id
      JOIN park_connect.parking_spaces ps ON a.space_id = ps.space_id
      WHERE r.review_type = 'DRIVER_TO_OWNER'
        AND a.owner_id = ${ownerId}
      GROUP BY ps.space_id, ps.title
      ORDER BY total_reviews DESC, ps.space_id ASC
    `

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        spaceId: row.space_id,
        title: row.title,
        avgRating: row.avg_rating === null ? 0 : Number(row.avg_rating),
        totalReviews: Number(row.total_reviews)
      }))
    })
  } catch (error) {
    console.error('Error fetching host reviews by space:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
