import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

type HostDashboardMetricsRow = {
  earnings: number | string | null
  bookings: bigint | number | string | null
}

type HostRatingRow = {
  avg_rating: number | string | null
  review_count: bigint | number | string | null
}

const toUtcMonthStart = (d: Date) => {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const ownerId = Number.parseInt(decoded.userId, 10)
    if (!Number.isFinite(ownerId)) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')

    const now = new Date()
    const endDate = endParam ? new Date(endParam) : now
    const startDate = startParam ? new Date(startParam) : toUtcMonthStart(endDate)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start/end date' }, { status: 400 })
    }

    if (endDate <= startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    const [metricsRows, ratingRows] = await Promise.all([
      prisma.$queryRaw<HostDashboardMetricsRow[]>`
        SELECT
          COALESCE(SUM(COALESCE(b.owner_payout, 0)), 0) AS earnings,
          COUNT(*)::bigint AS bookings
        FROM park_connect.bookings b
        JOIN park_connect.availability a
          ON a.availability_id = b.availability_id
        WHERE
          a.owner_id = ${ownerId}
          AND UPPER(b.booking_status) IN ('CONFIRMED', 'COMPLETED')
          AND b.start_time >= ${startDate}
          AND b.start_time < ${endDate};
      `,
      prisma.$queryRaw<HostRatingRow[]>`
        SELECT
          COALESCE(AVG(r.rating), 0) AS avg_rating,
          COUNT(r.review_id)::bigint AS review_count
        FROM park_connect.reviews r
        WHERE
          r.reviewee_id = ${ownerId}
          AND UPPER(COALESCE(r.review_type, 'USER')) = 'USER'
          AND r.created_at >= ${startDate}
          AND r.created_at < ${endDate};
      `
    ])

    const metrics = metricsRows?.[0]
    const rating = ratingRows?.[0]

    return NextResponse.json({
      data: {
        earnings: Number(metrics?.earnings ?? 0) || 0,
        bookings: Number(metrics?.bookings ?? 0) || 0,
        rating: Number(rating?.avg_rating ?? 0) || 0,
        reviewCount: Number(rating?.review_count ?? 0) || 0
      }
    })
  } catch (error) {
    console.error('[Host Dashboard Metrics API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard metrics' }, { status: 500 })
  }
}
