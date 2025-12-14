import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type CurrentMonthEarningsRow = {
  owner_id: number
  month_start: Date
  total_earnings: number | string | null
}

type LifetimeRevenueRow = {
  owner_id: number
  total_revenue: number | string | null
  booking_count: bigint | number | string
}

type TwoWeeksBookingsRow = {
  current_count: bigint | number | string
  diff_count: bigint | number | string
}

type TwoWeeksIncomeRow = {
  current_income: number | string | null
  diff_income: number | string | null
}

type AverageRatingRow = {
  owner_id: number
  avg_rating: number | string | null
  review_count: bigint | number | string
}

type TotalBookingsThisMonthRow = {
  owner_id: number
  month_start: Date
  total_bookings: bigint | number | string
}

type MonthlyOccupancyRateRow = {
  owner_id: number
  month_start: Date
  month_end: Date
  occupied_days: number
  total_days: number
  occupancy_rate: number | string
}

type CurrentSpaceStatusRow = {
  space_id: number
  space_title: string
  is_available: boolean
  current_booking_status: string
  current_status: string
}

const normalizeArray = <T,>(rows: T[] | null | undefined): T[] => (Array.isArray(rows) ? rows : [])

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

const toSafeInt = (value: unknown, fallback = 0): number => {
  const asNumber = toFiniteNumber(value, fallback)
  return Number.isFinite(asNumber) ? Math.trunc(asNumber) : fallback
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

    const userId = decoded.userId
    const ownerIdNum = parseInt(userId, 10)
    
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric')

    if (!metric) {
      return NextResponse.json({ error: 'Metric parameter required' }, { status: 400 })
    }

    let data

    switch (metric) {
      case 'current_month_earnings':
        data = normalizeArray(
          await prisma.$queryRaw<CurrentMonthEarningsRow[]>`
            WITH bounds AS (
              SELECT
                date_trunc('month', now())::date AS month_start,
                (date_trunc('month', now()) + interval '1 month') AS next_month_start
            )
            SELECT
              ${ownerIdNum}::int AS owner_id,
              bnd.month_start,
              COALESCE(SUM(COALESCE(b.owner_payout, 0)), 0) AS total_earnings
            FROM bounds bnd
            LEFT JOIN park_connect.bookings b
              ON b.start_time >= bnd.month_start
             AND b.start_time < bnd.next_month_start
             AND b.booking_status IN ('CONFIRMED', 'COMPLETED')
            LEFT JOIN park_connect.availability a
              ON a.availability_id = b.availability_id
            WHERE a.owner_id = ${ownerIdNum}
            GROUP BY bnd.month_start;
          `
        ).map((row) => ({
          ...row,
          total_earnings: toFiniteNumber(row.total_earnings, 0),
        }))
        break
      
      case 'current_space_status':
        data = normalizeArray(
          await prisma.$queryRaw<CurrentSpaceStatusRow[]>`
            WITH owner_spaces AS (
              SELECT DISTINCT ps.space_id, ps.title
              FROM park_connect.parking_spaces ps
              JOIN park_connect.availability a
                ON a.space_id = ps.space_id
              WHERE a.owner_id = ${ownerIdNum}
            )
            SELECT
              os.space_id,
              os.title AS space_title,
              COALESCE(av.is_available_now, false) AS is_available,
              COALESCE(bk.booking_status, 'NONE') AS current_booking_status,
              CASE
                WHEN bk.booking_status IS NOT NULL THEN 'BOOKED'
                WHEN COALESCE(av.is_available_now, false) THEN 'AVAILABLE'
                ELSE 'UNAVAILABLE'
              END AS current_status
            FROM owner_spaces os
            LEFT JOIN LATERAL (
              SELECT true AS is_available_now
              FROM park_connect.availability a
              WHERE
                a.owner_id = ${ownerIdNum}
                AND a.space_id = os.space_id
                AND a.is_available = true
                AND now() >= a.available_start
                AND now() < a.available_end
              LIMIT 1
            ) av ON true
            LEFT JOIN LATERAL (
              SELECT b.booking_status
              FROM park_connect.bookings b
              JOIN park_connect.availability a
                ON a.availability_id = b.availability_id
              WHERE
                a.owner_id = ${ownerIdNum}
                AND a.space_id = os.space_id
                AND b.booking_status IN ('CONFIRMED', 'COMPLETED')
                AND now() >= b.start_time
                AND now() < b.end_time
              ORDER BY b.start_time DESC
              LIMIT 1
            ) bk ON true
            ORDER BY os.space_id;
          `
        )
        break
      
      case 'monthly_occupancy_rate':
        data = normalizeArray(
          await prisma.$queryRaw<MonthlyOccupancyRateRow[]>`
            WITH bounds AS (
              SELECT
                date_trunc('month', now())::date AS month_start,
                ((date_trunc('month', now()) + interval '1 month')::date - 1) AS month_end
            ),
            days AS (
              SELECT generate_series(b.month_start, b.month_end, interval '1 day')::date AS d, b.month_start, b.month_end
              FROM bounds b
            ),
            occupied AS (
              SELECT
                COUNT(*)::int AS occupied_days,
                (MAX(d.month_end) - MIN(d.month_start) + 1)::int AS total_days
              FROM days d
              WHERE EXISTS (
                SELECT 1
                FROM park_connect.bookings b
                JOIN park_connect.availability a
                  ON a.availability_id = b.availability_id
                WHERE
                  a.owner_id = ${ownerIdNum}
                  AND b.booking_status IN ('CONFIRMED', 'COMPLETED')
                  AND tsrange(b.start_time, b.end_time, '[)') && tsrange(d.d::timestamp, (d.d + 1)::timestamp, '[)')
              )
            )
            SELECT
              ${ownerIdNum}::int AS owner_id,
              b.month_start,
              b.month_end,
              o.occupied_days,
              o.total_days,
              CASE WHEN o.total_days > 0 THEN round((o.occupied_days::numeric / o.total_days::numeric) * 100, 2) ELSE 0 END AS occupancy_rate
            FROM bounds b
            CROSS JOIN occupied o;
          `
        ).map((row) => ({
          ...row,
          occupied_days: toSafeInt(row.occupied_days, 0),
          total_days: toSafeInt(row.total_days, 0),
          occupancy_rate: toFiniteNumber(row.occupancy_rate, 0),
        }))
        break
      
      case '2weeks_bookings':
        data = normalizeArray(
          await prisma.$queryRaw<TwoWeeksBookingsRow[]>`
            WITH base AS (
              SELECT b.start_time
              FROM park_connect.bookings b
              JOIN park_connect.availability a
                ON a.availability_id = b.availability_id
              WHERE
                a.owner_id = ${ownerIdNum}
                AND b.booking_status IN ('CONFIRMED', 'COMPLETED')
            ),
            counts AS (
              SELECT
                COUNT(*) FILTER (WHERE start_time >= (now() - interval '14 days'))::bigint AS current_count,
                COUNT(*) FILTER (WHERE start_time >= (now() - interval '28 days') AND start_time < (now() - interval '14 days'))::bigint AS prev_count
              FROM base
            )
            SELECT
              c.current_count,
              (c.current_count - c.prev_count)::bigint AS diff_count
            FROM counts c;
          `
        ).map((row) => ({
          current_count: toSafeInt(row.current_count, 0),
          diff_count: toSafeInt(row.diff_count, 0),
        }))
        break
      
      case '2weeks_income':
        data = normalizeArray(
          await prisma.$queryRaw<TwoWeeksIncomeRow[]>`
            WITH base AS (
              SELECT b.start_time, b.owner_payout
              FROM park_connect.bookings b
              JOIN park_connect.availability a
                ON a.availability_id = b.availability_id
              WHERE
                a.owner_id = ${ownerIdNum}
                AND b.booking_status IN ('CONFIRMED', 'COMPLETED')
            ),
            sums AS (
              SELECT
                COALESCE(SUM(owner_payout) FILTER (WHERE start_time >= (now() - interval '14 days')), 0)::numeric AS current_income,
                COALESCE(SUM(owner_payout) FILTER (WHERE start_time >= (now() - interval '28 days') AND start_time < (now() - interval '14 days')), 0)::numeric AS prev_income
              FROM base
            )
            SELECT
              s.current_income,
              (s.current_income - s.prev_income)::numeric AS diff_income
            FROM sums s;
          `
        ).map((row) => ({
          current_income: toFiniteNumber(row.current_income, 0),
          diff_income: toFiniteNumber(row.diff_income, 0),
        }))
        break
      
      case 'average_rating':
        data = normalizeArray(
          await prisma.$queryRaw<AverageRatingRow[]>`
            SELECT
              ${ownerIdNum}::int AS owner_id,
              COALESCE(AVG(r.rating)::numeric, 0)::numeric AS avg_rating,
              COUNT(r.review_id)::bigint AS review_count
            FROM park_connect.reviews r
            WHERE
              r.reviewee_id = ${ownerIdNum}
              AND COALESCE(r.review_type, 'DRIVER_TO_OWNER') = 'DRIVER_TO_OWNER';
          `
        ).map((row) => ({
          ...row,
          avg_rating: toFiniteNumber(row.avg_rating, 0),
          review_count: toSafeInt(row.review_count, 0),
        }))
        break
      
      case 'total_bookings_this_month':
        data = normalizeArray(
          await prisma.$queryRaw<TotalBookingsThisMonthRow[]>`
            WITH bounds AS (
              SELECT
                date_trunc('month', now())::date AS month_start,
                (date_trunc('month', now()) + interval '1 month') AS next_month_start
            )
            SELECT
              ${ownerIdNum}::int AS owner_id,
              bnd.month_start,
              COUNT(*)::bigint AS total_bookings
            FROM bounds bnd
            JOIN park_connect.bookings b
              ON b.start_time >= bnd.month_start
             AND b.start_time < bnd.next_month_start
             AND b.booking_status IN ('CONFIRMED', 'COMPLETED')
            JOIN park_connect.availability a
              ON a.availability_id = b.availability_id
            WHERE a.owner_id = ${ownerIdNum}
            GROUP BY bnd.month_start;
          `
        ).map((row) => ({
          ...row,
          total_bookings: toSafeInt(row.total_bookings, 0),
        }))
        break
      
      case 'lifetime_revenue':
        data = normalizeArray(
          await prisma.$queryRaw<LifetimeRevenueRow[]>`
            SELECT
              ${ownerIdNum}::int AS owner_id,
              COALESCE(SUM(COALESCE(b.owner_payout, 0)), 0)::numeric AS total_revenue,
              COUNT(*)::bigint AS booking_count
            FROM park_connect.bookings b
            JOIN park_connect.availability a
              ON a.availability_id = b.availability_id
            WHERE
              a.owner_id = ${ownerIdNum}
              AND b.booking_status IN ('CONFIRMED', 'COMPLETED');
          `
        ).map((row) => ({
          ...row,
          total_revenue: toFiniteNumber(row.total_revenue, 0),
          booking_count: toSafeInt(row.booking_count, 0),
        }))
        break
      
      default:
        return NextResponse.json({ error: 'Unknown metric' }, { status: 400 })
    }
    return NextResponse.json({ data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics'
    console.error('[Host Analytics API] Error:', message, error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
