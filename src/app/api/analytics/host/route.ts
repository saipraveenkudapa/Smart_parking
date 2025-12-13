import { NextRequest, NextResponse } from 'next/server'
import { supabaseFunctions } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

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

    console.log(`[Host Analytics API] User: ${userId} (parsed: ${ownerIdNum}), Metric: ${metric}`)

    if (!metric) {
      return NextResponse.json({ error: 'Metric parameter required' }, { status: 400 })
    }

    let data

    switch (metric) {
      case 'current_month_earnings':
        data = await supabaseFunctions.getCurrentMonthEarnings(ownerIdNum)
        break
      
      case 'current_space_status':
        data = await supabaseFunctions.getCurrentSpaceStatus(ownerIdNum)
        break
      
      case 'monthly_occupancy_rate':
        data = await supabaseFunctions.getMonthlyOccupancyRate(ownerIdNum)
        break
      
      case '2weeks_bookings':
        data = await supabaseFunctions.getOwner2WeeksBookings(ownerIdNum)
        break
      
      case '2weeks_income':
        data = await supabaseFunctions.getOwner2WeeksIncome(ownerIdNum)
        break
      
      case 'average_rating':
        data = await supabaseFunctions.getOwnerAverageRating(ownerIdNum)
        break
      
      case 'total_bookings_this_month':
        data = await supabaseFunctions.getTotalBookingsThisMonth(ownerIdNum)
        break
      
      case 'lifetime_revenue':
        data = await supabaseFunctions.getTotalLifetimeRevenue(ownerIdNum)
        break
      
      default:
        return NextResponse.json({ error: 'Unknown metric' }, { status: 400 })
    }

    console.log(`[Host Analytics API] Fetched ${metric}:`, data)
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('[Host Analytics API] Error:', error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
