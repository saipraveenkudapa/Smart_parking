import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
// Prefer server-only keys for server routes; fall back to anon for local/dev.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Expected SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

if (!/^https:\/\//.test(supabaseUrl)) {
  throw new Error(`Invalid SUPABASE_URL (must start with https://): ${supabaseUrl}`)
}

const decodeJwtPayload = (jwt: string): any | null => {
  const parts = jwt.split('.')
  if (parts.length < 2) return null

  const payload = parts[1]
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

  try {
    const json = typeof Buffer !== 'undefined'
      ? Buffer.from(padded, 'base64').toString('utf8')
      : atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

const assertSupabaseConfigMatches = () => {
  // Helpful guard: Supabase URL and API key must belong to the same project.
  // (The key is a JWT whose payload includes a `ref` field.)
  const urlRef = new URL(supabaseUrl).hostname.split('.')[0]
  const payload = decodeJwtPayload(supabaseKey)
  const keyRef = payload?.ref

  if (keyRef && urlRef && keyRef !== urlRef) {
    throw new Error(
      `Supabase config mismatch: SUPABASE_URL project ref is "${urlRef}" but API key ref is "${keyRef}". Update your anon/service_role key to match the URL's project.`
    )
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

// Type definitions for Supabase function returns
export interface ActiveBookingsNow {
  active_bookings: number
}

export interface ActiveUsersLast30Days {
  active_users: number
}

export interface PlatformRevenueThisMonth {
  month_start: string
  total_platform_revenue: number
  total_bookings: number
}

export interface TotalPlatformRevenue {
  total_platform_revenue: number
  total_bookings: number
}

export interface TotalSpacesListed {
  total_spaces: number
}

export interface TotalUsers {
  total_users: number
}

export interface CurrentMonthEarnings {
  owner_id: number
  month_start: string
  total_earnings: number
}

export interface CurrentSpaceStatus {
  space_id: number
  space_title: string
  is_available: boolean
  current_booking_status: string
  current_status: string
}

export interface MonthlyOccupancyRate {
  owner_id: number
  month_start: string
  month_end: string
  occupied_days: number
  total_days: number
  occupancy_rate: number
}

export interface MonthlyPlatformRevenue {
  month_year: string
  month_start: string
  total_platform_revenue: number
  booking_count: number
}

export interface Owner2WeeksBookings {
  current_count: number
  diff_count: number
}

export interface Owner2WeeksIncome {
  current_income: number
  diff_income: number
}

export interface OwnerAverageRating {
  owner_id: number
  avg_rating: number
  review_count: number
}

export interface TotalBookingsThisMonth {
  owner_id: number
  month_start: string
  total_bookings: number
}

export interface TotalLifetimeRevenue {
  owner_id: number
  total_revenue: number
  booking_count: number
}

// Supabase RPC function calls
export const supabaseFunctions = {
  // Admin functions - no parameters needed
  async getActiveBookingsNow() {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('ad_get_active_bookings_now')
    if (error) {
      console.error('Supabase error (ad_get_active_bookings_now):', error)
      throw error
    }
    return data as ActiveBookingsNow[]
  },

  async getActiveUsersLast30Days() {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('ad_get_active_users_last_30_days')
    if (error) {
      console.error('Supabase error (ad_get_active_users_last_30_days):', error)
      throw error
    }
    return data as ActiveUsersLast30Days[]
  },

  async getPlatformRevenueThisMonth() {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('ad_get_platform_revenue_this_month')
    if (error) {
      console.error('Supabase error (ad_get_platform_revenue_this_month):', error)
      throw error
    }
    return data as PlatformRevenueThisMonth[]
  },

  async getTotalPlatformRevenue() {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('ad_get_total_platform_revenue')
    if (error) {
      console.error('Supabase error (ad_get_total_platform_revenue):', error)
      throw error
    }
    return data as TotalPlatformRevenue[]
  },

  async getTotalSpacesListed() {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('ad_get_total_spaces_listed')
    if (error) {
      console.error('Supabase error (ad_get_total_spaces_listed):', error)
      throw error
    }
    return data as TotalSpacesListed[]
  },

  async getTotalUsers() {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('ad_get_total_users')
    if (error) {
      console.error('Supabase error (ad_get_total_users):', error)
      throw error
    }
    return data as TotalUsers[]
  },

  async getMonthlyPlatformRevenuePast12Months() {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('get_monthly_platform_revenue_past_12_months')
    if (error) {
      console.error('Supabase error (get_monthly_platform_revenue_past_12_months):', error)
      throw error
    }
    return data as MonthlyPlatformRevenue[]
  },

  // Owner/Host functions - require p_owner_id parameter
  async getCurrentMonthEarnings(ownerId: number) {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('get_current_month_earnings', {
      p_owner_id: ownerId
    })
    if (error) {
      console.error('Supabase error (get_current_month_earnings):', error)
      throw error
    }
    return data as CurrentMonthEarnings[]
  },

  async getCurrentSpaceStatus(ownerId: number) {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('get_current_space_status', {
      p_owner_id: ownerId
    })
    if (error) {
      console.error('Supabase error (get_current_space_status):', error)
      throw error
    }
    return data as CurrentSpaceStatus[]
  },

  async getMonthlyOccupancyRate(ownerId: number) {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('get_monthly_occupancy_rate', {
      p_owner_id: ownerId
    })
    if (error) {
      console.error('Supabase error (get_monthly_occupancy_rate):', error)
      throw error
    }
    return data as MonthlyOccupancyRate[]
  },

  async getOwner2WeeksBookings(ownerId: number) {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('get_owner_2weeks_bookings', {
      p_owner_id: ownerId
    })
    if (error) {
      console.error('Supabase error (get_owner_2weeks_bookings):', error)
      throw error
    }
    return data as Owner2WeeksBookings[]
  },

  async getOwner2WeeksIncome(ownerId: number) {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('get_owner_2weeks_income', {
      p_owner_id: ownerId
    })
    if (error) {
      console.error('Supabase error (get_owner_2weeks_income):', error)
      throw error
    }
    return data as Owner2WeeksIncome[]
  },

  async getOwnerAverageRating(ownerId: number) {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('get_owner_average_rating', {
      p_owner_id: ownerId
    })
    if (error) {
      console.error('Supabase error (get_owner_average_rating):', error)
      throw error
    }
    return data as OwnerAverageRating[]
  },

  async getTotalBookingsThisMonth(ownerId: number) {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('get_total_bookings_this_month', {
      p_owner_id: ownerId
    })
    if (error) {
      console.error('Supabase error (get_total_bookings_this_month):', error)
      throw error
    }
    return data as TotalBookingsThisMonth[]
  },

  async getTotalLifetimeRevenue(ownerId: number) {
    assertSupabaseConfigMatches()
    const { data, error } = await supabase.rpc('get_total_lifetime_revenue', {
      p_owner_id: ownerId
    })
    if (error) {
      console.error('Supabase error (get_total_lifetime_revenue):', error)
      throw error
    }
    return data as TotalLifetimeRevenue[]
  },
}
