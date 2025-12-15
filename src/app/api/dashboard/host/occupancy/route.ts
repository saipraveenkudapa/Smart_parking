import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

type BookingWindowRow = {
  booking_id: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

const countDaysInRangeInclusive = (rangeStartMs: number, rangeEndMs: number) => {
  if (!Number.isFinite(rangeStartMs) || !Number.isFinite(rangeEndMs) || rangeEndMs <= rangeStartMs) {
    return 0
  }

  const endInclusiveMs = Math.max(rangeStartMs, rangeEndMs - 1)
  const start = new Date(rangeStartMs)
  const endInclusive = new Date(endInclusiveMs)

  const startDayMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0)
  const endDayMs = Date.UTC(endInclusive.getUTCFullYear(), endInclusive.getUTCMonth(), endInclusive.getUTCDate(), 0, 0, 0, 0)
  return Math.floor((endDayMs - startDayMs) / (24 * 60 * 60 * 1000)) + 1
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
    const listingIdParam = searchParams.get('listingId')

    const endDate = endParam ? new Date(endParam) : new Date()
    const startDate = startParam
      ? new Date(startParam)
      : new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start/end date' }, { status: 400 })
    }

    if (endDate <= startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    const rangeStartMs = startDate.getTime()
    const rangeEndMs = endDate.getTime()

    const listingId = listingIdParam ? Number.parseInt(listingIdParam, 10) : null
    if (listingIdParam && !Number.isFinite(listingId)) {
      return NextResponse.json({ error: 'Invalid listingId' }, { status: 400 })
    }

    // Day-based occupancy (per booking): treat each booking as one occupied day unit.
    // This matches the product expectation: 3 bookings in the month => 3 / totalDays.
    const bookingRows = await prisma.$queryRaw<BookingWindowRow[]>`
      SELECT
        DISTINCT b.booking_id
      FROM park_connect.bookings b
      JOIN park_connect.availability a
        ON a.availability_id = b.availability_id
      WHERE
        a.owner_id = ${ownerId}
        ${listingId ? Prisma.sql`AND a.space_id = ${listingId}` : Prisma.empty}
        AND UPPER(b.booking_status) IN ('CONFIRMED', 'COMPLETED')
        AND b.start_time < ${endDate}
        AND b.end_time > ${startDate}
    `

    const totalDays = countDaysInRangeInclusive(rangeStartMs, rangeEndMs)
    const bookedDays = bookingRows.length

    const occupancyPercentage = totalDays > 0 ? round2((bookedDays / totalDays) * 100) : 0

    return NextResponse.json({
      data: {
        occupancyPercentage,
        totalDays,
        bookedDays,
      },
    })
  } catch (error) {
    console.error('[Host Dashboard Occupancy API] Error:', error)
    return NextResponse.json({ error: 'Failed to compute occupancy rate' }, { status: 500 })
  }
}
