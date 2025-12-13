/**
 * Test script to verify Supabase functions are working
 * Run with: node scripts/test-supabase-functions.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
  process.exit(1)
}

console.log('✅ Supabase credentials found')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testFunctions() {
  console.log('\n🧪 Testing Supabase Functions...\n')

  const testUserId = 3 // User ID from your log

  // Test all host functions
  const hostFunctions = [
    { name: 'get_current_month_earnings', param: 'p_owner_id' },
    { name: 'get_current_space_status', param: 'p_owner_id' },
    { name: 'get_monthly_occupancy_rate', param: 'p_owner_id' },
    { name: 'get_owner_2weeks_bookings', param: 'p_owner_id' },
    { name: 'get_owner_2weeks_income', param: 'p_owner_id' },
    { name: 'get_owner_average_rating', param: 'p_owner_id' },
    { name: 'get_total_bookings_this_month', param: 'p_owner_id' },
    { name: 'get_total_lifetime_revenue', param: 'p_owner_id' },
  ]

  console.log('📊 Testing Host Functions (User ID: ' + testUserId + ')\n')

  for (const func of hostFunctions) {
    try {
      const { data, error } = await supabase.rpc(func.name, {
        [func.param]: testUserId
      })

      if (error) {
        console.error(`❌ ${func.name}:`, error.message)
        console.error('   Details:', error)
      } else {
        console.log(`✅ ${func.name}:`)
        console.log('   Data:', JSON.stringify(data, null, 2))
      }
    } catch (err) {
      console.error(`❌ ${func.name}: Exception -`, err.message)
    }
  }

  // Test admin functions
  const adminFunctions = [
    'ad_get_active_bookings_now',
    'ad_get_active_users_last_30_days',
    'ad_get_platform_revenue_this_month',
    'ad_get_total_platform_revenue',
    'ad_get_total_spaces_listed',
    'ad_get_total_users',
    'get_monthly_platform_revenue_past_12_months',
  ]

  console.log('\n\n📊 Testing Admin Functions\n')

  for (const funcName of adminFunctions) {
    try {
      const { data, error } = await supabase.rpc(funcName)

      if (error) {
        console.error(`❌ ${funcName}:`, error.message)
      } else {
        console.log(`✅ ${funcName}:`)
        console.log('   Data:', JSON.stringify(data, null, 2))
      }
    } catch (err) {
      console.error(`❌ ${funcName}: Exception -`, err.message)
    }
  }

  // Check if user has any data
  console.log('\n\n🔍 Checking Database Data for User ' + testUserId + '\n')

  try {
    // Check parking spaces
    const { data: spaces, error: spacesError } = await supabase
      .from('parking_spaces')
      .select('id, title, owner_id')
      .eq('owner_id', testUserId)

    if (spacesError) {
      console.error('❌ Error fetching parking spaces:', spacesError.message)
    } else {
      console.log(`✅ Parking Spaces: ${spaces?.length || 0}`)
      if (spaces && spaces.length > 0) {
        console.log('   Spaces:', spaces.map(s => `${s.id}: ${s.title}`).join(', '))
      }
    }

    // Check bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, total_amount, listing:parking_spaces!inner(owner_id)')
      .eq('parking_spaces.owner_id', testUserId)

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError.message)
    } else {
      console.log(`✅ Bookings for User's Spaces: ${bookings?.length || 0}`)
    }
  } catch (err) {
    console.error('❌ Error checking database:', err.message)
  }

  console.log('\n✅ Test completed!\n')
}

testFunctions().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
