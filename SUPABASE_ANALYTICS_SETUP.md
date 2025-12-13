# Supabase Analytics Setup Guide

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Finding Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click on **Settings** (gear icon) in the sidebar
3. Click on **API** under Project Settings
4. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Database Functions Required

All these functions should already be created in your Supabase database under the `park_connect` schema:

### Admin Functions (no parameters)
- `ad_get_active_bookings_now`
- `ad_get_active_users_last_30_days`
- `ad_get_platform_revenue_this_month`
- `ad_get_total_platform_revenue`
- `ad_get_total_spaces_listed`
- `ad_get_total_users`
- `get_monthly_platform_revenue_past_12_months`

### Host Functions (requires `p_owner_id` integer parameter)
- `get_current_month_earnings`
- `get_current_space_status`
- `get_monthly_occupancy_rate`
- `get_owner_2weeks_bookings`
- `get_owner_2weeks_income`
- `get_owner_average_rating`
- `get_total_bookings_this_month`
- `get_total_lifetime_revenue`

## How the Integration Works

1. **Supabase Client** (`/lib/supabase.ts`)
   - Connects to your Supabase database
   - Provides type-safe function wrappers
   - Handles all RPC calls

2. **API Routes** (`/api/analytics/*`)
   - `/api/analytics/host` - Host-specific metrics
   - `/api/analytics/admin` - Platform-wide metrics
   - Authenticates requests with JWT tokens
   - Passes user ID to Supabase functions

3. **Analytics Pages**
   - `/host/analytics` - Host dashboard with earnings, ratings, occupancy
   - `/admin/analytics` - Platform overview with real-time stats
   - `/renter/analytics` - Renter spending analysis

## Testing the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/host/analytics` while logged in as a host

3. Check the browser console for any Supabase errors

4. Verify that metrics are loading correctly

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists in your project root
- Verify the environment variables are set correctly
- Restart your development server

### "Function not found" errors
- Verify all functions exist in your Supabase database
- Check function names match exactly (case-sensitive)
- Ensure functions are accessible (security settings)

### "Unauthorized" errors
- Check that JWT token is being sent in Authorization header
- Verify user ID is being extracted correctly from token
- Ensure user exists in database

### No data showing
- Check browser console for API errors
- Verify functions return data in expected format
- Ensure `p_owner_id` parameter matches user's ID in database

## Data Flow

```
User Authentication (JWT) 
  → Frontend makes API request with token
  → API route validates token & extracts userId
  → API calls Supabase function with userId
  → Supabase executes SQL function
  → Returns data to API route
  → API sends data to frontend
  → Charts and metrics update
```

## Benefits

✅ **Real-time data** - Direct from database functions
✅ **Type-safe** - TypeScript interfaces for all responses
✅ **Performant** - Parallel API calls, optimized queries
✅ **Secure** - JWT authentication, parameter validation
✅ **No external dependencies** - No Tableau or BI tools needed
