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

    // Optional: Check if user is admin
    // if (decoded.role !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric')

    if (!metric) {
      return NextResponse.json({ error: 'Metric parameter required' }, { status: 400 })
    }

    let data

    switch (metric) {
      case 'active_bookings_now':
        data = await supabaseFunctions.getActiveBookingsNow()
        break
      
      case 'active_users_last_30_days':
        data = await supabaseFunctions.getActiveUsersLast30Days()
        break
      
      case 'platform_revenue_this_month':
        data = await supabaseFunctions.getPlatformRevenueThisMonth()
        break
      
      case 'total_platform_revenue':
        data = await supabaseFunctions.getTotalPlatformRevenue()
        break
      
      case 'total_spaces_listed':
        data = await supabaseFunctions.getTotalSpacesListed()
        break
      
      case 'total_users':
        data = await supabaseFunctions.getTotalUsers()
        break
      
      case 'monthly_platform_revenue_12_months':
        data = await supabaseFunctions.getMonthlyPlatformRevenuePast12Months()
        break
      
      default:
        return NextResponse.json({ error: 'Unknown metric' }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Admin analytics API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin analytics' },
      { status: 500 }
    )
  }
}
