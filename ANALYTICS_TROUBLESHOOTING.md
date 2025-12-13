# Analytics Dashboard Troubleshooting Guide

## Common Issues and Solutions

### 1. **No Data Showing in Dashboards**

#### Check Browser Console
1. Open your browser's Developer Tools (F12 or Cmd+Option+I on Mac)
2. Go to the **Console** tab
3. Look for error messages with tags:
   - `[Host Analytics API]` - Host dashboard issues
   - `[Admin Analytics API]` - Admin dashboard issues
   - `Fetching Supabase metrics...` - Frontend data fetching

#### Check Terminal/Server Logs
Look for these log messages in your terminal where `npm run dev` is running:
- `[Host Analytics API] User: X, Metric: Y` - Shows which user and metric is being requested
- `[Admin Analytics API] Metric: X` - Shows which admin metric is being requested
- `Supabase error (function_name):` - Shows Supabase RPC errors

### 2. **"Missing Supabase environment variables" Error**

**Cause:** Environment variables not configured

**Solution:**
```bash
# Check if .env file exists
ls -la .env

# Make sure these variables are set:
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

**Get credentials from:**
1. Go to https://app.supabase.com/project/YOUR_PROJECT/settings/api
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. **"Function not found" Errors**

**Cause:** Supabase database functions not created

**Solution:** Verify all 16 functions exist in your Supabase database:

#### Admin Functions (7):
```sql
-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname LIKE 'ad_%' OR proname LIKE 'get_monthly_platform%';
```

Should return:
- `ad_get_active_bookings_now`
- `ad_get_active_users_last_30_days`
- `ad_get_platform_revenue_this_month`
- `ad_get_total_platform_revenue`
- `ad_get_total_spaces_listed`
- `ad_get_total_users`
- `get_monthly_platform_revenue_past_12_months`

#### Host Functions (8):
```sql
-- Check if host functions exist
SELECT proname FROM pg_proc WHERE proname LIKE 'get_current_%' OR proname LIKE 'get_owner_%' OR proname LIKE 'get_total_%';
```

Should return:
- `get_current_month_earnings`
- `get_current_space_status`
- `get_monthly_occupancy_rate`
- `get_owner_2weeks_bookings`
- `get_owner_2weeks_income`
- `get_owner_average_rating`
- `get_total_bookings_this_month`
- `get_total_lifetime_revenue`

**If missing:** You need to create these functions in Supabase SQL Editor using the queries you provided.

### 4. **"Unauthorized" or "Invalid token" Errors**

**Cause:** Authentication token issues

**Solution:**
1. Check if user is logged in:
   ```javascript
   // Open browser console and run:
   localStorage.getItem('token')
   // Should return a JWT token string
   ```

2. If no token, log out and log back in:
   ```
   /logout → /login
   ```

3. Check JWT secret matches between frontend and backend:
   ```env
   # .env file
   JWT_SECRET="your-secret-key"
   ```

### 5. **Data is Always Zero**

**Cause:** No data in database OR userId mismatch

**Solution:**

#### Verify Data Exists:
```sql
-- Check bookings table
SELECT COUNT(*) FROM park_connect.bookings;

-- Check parking spaces
SELECT COUNT(*) FROM park_connect.parking_spaces;

-- Check users
SELECT COUNT(*) FROM park_connect.users;
```

#### Verify User ID Mapping:
```javascript
// Browser console
const token = localStorage.getItem('token');
const decoded = JSON.parse(atob(token.split('.')[1]));
console.log('User ID from token:', decoded.userId);
```

Then check if this userId matches `owner_id` in database:
```sql
SELECT id, email FROM park_connect.users WHERE id = 'YOUR_USER_ID';
SELECT owner_id, title FROM park_connect.parking_spaces WHERE owner_id = 'YOUR_USER_ID';
```

### 6. **"Cannot read property of undefined" Errors**

**Cause:** API response structure mismatch

**Debug Steps:**
1. Check browser console for API response logs:
   ```
   API Responses: { earnings: {...}, lifetimeRevenue: {...}, ... }
   ```

2. Verify response has expected structure:
   ```javascript
   // Expected structure:
   {
     data: [{ total_earnings: 100, ... }]
   }
   ```

3. Check for error responses:
   ```javascript
   // Error response:
   {
     error: "Function not found"
   }
   ```

### 7. **Charts Not Rendering**

**Cause:** Missing or empty data arrays

**Solution:**
1. Check if bookings are being fetched:
   ```
   // Console should show:
   bookings: [...]
   ```

2. Verify date formatting:
   ```javascript
   // Dates should be valid ISO strings:
   "2024-12-01T10:00:00Z"
   ```

3. Check chart data generation functions return non-empty arrays

### 8. **Slow Loading**

**Cause:** Too many API calls or slow database queries

**Optimization Tips:**
1. API calls are already parallelized with `Promise.all()`
2. Check database query performance:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM park_connect.get_current_month_earnings(1);
   ```
3. Add indexes if needed:
   ```sql
   CREATE INDEX idx_bookings_owner_id ON park_connect.bookings(owner_id);
   ```

## Testing Checklist

### Before Testing Dashboards:
- [ ] Environment variables configured in `.env`
- [ ] All 16 Supabase functions created
- [ ] User logged in with valid JWT token
- [ ] At least some sample data in database
- [ ] Development server running (`npm run dev`)
- [ ] Browser console open to see errors

### Test Each Dashboard:
1. **Host Analytics** (`/host/analytics`):
   - [ ] Lifetime revenue shows correctly
   - [ ] Current month earnings displays
   - [ ] Average rating shows (if reviews exist)
   - [ ] Occupancy rate calculates
   - [ ] 2-week trends display
   - [ ] Space status list shows listings
   - [ ] Charts render with data

2. **Admin Analytics** (`/admin/analytics`):
   - [ ] Active bookings count shows
   - [ ] Active users count displays
   - [ ] Platform revenue totals show
   - [ ] Total users count correct
   - [ ] Total spaces count correct
   - [ ] 12-month revenue chart renders
   - [ ] All metrics load without errors

3. **Renter Analytics** (`/renter/analytics`):
   - [ ] Total spending shows
   - [ ] Booking history displays
   - [ ] Spending charts render
   - [ ] Most used location shows

## Quick Debug Commands

### Check Environment:
```bash
# Verify Supabase URL is accessible
curl https://your-project.supabase.co

# Check if dev server is running
curl http://localhost:3000/api/analytics/host?metric=lifetime_revenue
```

### Check Database:
```sql
-- Test function directly
SELECT * FROM park_connect.get_total_lifetime_revenue(1);

-- Check recent bookings
SELECT * FROM park_connect.bookings ORDER BY created_at DESC LIMIT 10;
```

### Check Browser:
```javascript
// Test API call
fetch('/api/analytics/host?metric=lifetime_revenue', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(console.log)
```

## Getting Help

If you're still stuck after trying these solutions:

1. **Collect Debug Info:**
   - Browser console errors (screenshot)
   - Terminal/server logs (copy text)
   - Network tab showing failed API calls
   - Your user ID and database query results

2. **Check Logs:**
   - Look for `[Host Analytics API]` logs in terminal
   - Check browser console for `API Responses:` logs
   - Verify Supabase function errors with `Supabase error (function_name):`

3. **Test Individual Components:**
   - Test one API endpoint at a time
   - Test one Supabase function at a time
   - Isolate whether issue is frontend or backend

## Success Indicators

You'll know everything is working when:
- ✅ All dashboards load without console errors
- ✅ Metrics display real numbers (not all zeros)
- ✅ Charts render with actual data
- ✅ Console shows successful API logs
- ✅ No red error messages in browser or terminal
- ✅ Data updates when you add new bookings
