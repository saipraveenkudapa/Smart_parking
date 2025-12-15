import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

type Interval = { startMs: number; endMs: number }

type BookingWindowRow = {
  start_time: Date
  end_time: Date
}

type AvailabilityWindowRow = {
  available_start: Date | null
  available_end: Date | null
}

const mergeIntervals = (intervals: Interval[]) => {
  const sorted = intervals
    .filter((i) => Number.isFinite(i.startMs) && Number.isFinite(i.endMs) && i.endMs > i.startMs)
    .sort((a, b) => a.startMs - b.startMs)

  const merged: Interval[] = []
  for (const interval of sorted) {
    const last = merged[merged.length - 1]
    if (!last || interval.startMs > last.endMs) {
      merged.push({ ...interval })
      continue
    }
    last.endMs = Math.max(last.endMs, interval.endMs)
  }
  return merged
}

const sumIntervalsMs = (intervals: Interval[]) => {
  return intervals.reduce((total, i) => total + (i.endMs - i.startMs), 0)
}

const round2 = (n: number) => Math.round(n * 100) / 100

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

    // Availability windows (unioned)
    const availabilityRows = await prisma.$queryRaw<AvailabilityWindowRow[]>`
      SELECT
        a.available_start,
        a.available_end
      FROM park_connect.availability a
      WHERE
        a.owner_id = ${ownerId}
        AND a.is_available = TRUE
        ${listingId ? Prisma.sql`AND a.space_id = ${listingId}` : Prisma.empty}
    `

    const availabilityIntervals = availabilityRows
      .map((row) => {
        const startMs = Math.max((row.available_start?.getTime() ?? rangeStartMs), rangeStartMs)
        const endMs = Math.min((row.available_end?.getTime() ?? rangeEndMs), rangeEndMs)
        return { startMs, endMs }
      })
      .filter((i) => i.endMs > i.startMs)

    const mergedAvailability = mergeIntervals(availabilityIntervals)
    const totalAvailableMs = sumIntervalsMs(mergedAvailability)

    if (totalAvailableMs <= 0) {
      return NextResponse.json({
        data: {
          occupancyPercentage: 0,
          totalAvailableHours: 0,
          totalBookedHours: 0,
        },
      })
    }

    // Booked windows (confirmed + completed only), unioned and clamped to range
    const bookingRows = await prisma.$queryRaw<BookingWindowRow[]>`
      SELECT
        b.start_time,
        b.end_time
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

    const bookingIntervals = bookingRows
      .map((row) => {
        const startMs = Math.max(row.start_time.getTime(), rangeStartMs)
        const endMs = Math.min(row.end_time.getTime(), rangeEndMs)
        return { startMs, endMs }
      })
      .filter((i) => i.endMs > i.startMs)

    const mergedBookings = mergeIntervals(bookingIntervals)
    const totalBookedMs = sumIntervalsMs(mergedBookings)

    const totalAvailableHours = totalAvailableMs / (1000 * 60 * 60)
    const totalBookedHours = totalBookedMs / (1000 * 60 * 60)

    const occupancyPercentage = round2((totalBookedMs / totalAvailableMs) * 100)

    return NextResponse.json({
      data: {
        occupancyPercentage,
        totalAvailableHours: round2(totalAvailableHours),
        totalBookedHours: round2(totalBookedHours),
      },
    })
  } catch (error) {
    console.error('[Host Dashboard Occupancy API] Error:', error)
    return NextResponse.json({ error: 'Failed to compute occupancy rate' }, { status: 500 })
  }
}
