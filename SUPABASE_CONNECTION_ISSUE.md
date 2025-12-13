# Supabase Connection Diagnostic

## Issue Found: DNS Resolution Failure

Your Supabase functions are not working because there's a **DNS/network error**:

```
Error: getaddrinfo ENOTFOUND haxkwqwamgaeodrxqygc.supabase.co
```

This means your computer **cannot resolve** the Supabase domain name.

## Possible Causes:

### 1. **No Internet Connection** (Most Likely)
- Check if you're connected to the internet
- Try opening https://google.com in your browser
- Try pinging: `ping haxkwqwamgaeodrxqygc.supabase.co`

### 2. **Supabase Project Paused/Deleted**
- Free tier Supabase projects pause after inactivity
- Go to https://app.supabase.com/project/haxkwqwamgaeodrxqygc
- Check if project shows "PAUSED" or doesn't exist
- If paused, click "Restore Project" button

### 3. **Firewall/VPN Blocking Supabase**
- Corporate firewall might block Supabase
- VPN might be interfering
- Try disabling VPN temporarily

### 4. **Wrong Supabase URL**
- Verify project exists at: https://app.supabase.com/project/haxkwqwamgaeodrxqygc
- Check Settings → API → Project URL matches: `https://haxkwqwamgaeodrxqygc.supabase.co`

## Quick Tests:

### Test 1: Check Internet
```bash
ping google.com
```

### Test 2: Check Supabase Domain
```bash
ping haxkwqwamgaeodrxqygc.supabase.co
```

### Test 3: Check if Project Exists
Open in browser:
```
https://app.supabase.com/project/haxkwqwamgaeodrxqygc
```

### Test 4: Test API Directly
```bash
curl https://haxkwqwamgaeodrxqygc.supabase.co
```

## Solutions:

### If Project is Paused:
1. Go to https://app.supabase.com
2. Find your project "haxkwqwamgaeodrxqygc"
3. Click "Restore Project"
4. Wait 1-2 minutes for restoration
5. Try loading dashboards again

### If Project Doesn't Exist:
You'll need to:
1. Create new Supabase project
2. Run all SQL queries to create functions
3. Update `.env` with new credentials

### If Network Issue:
1. Check internet connection
2. Disable VPN if using one
3. Check firewall settings
4. Try different network (mobile hotspot)

## What's Happening Now:

From your browser console log:
```
[Host Analytics API] User: 3 (parsed: 3), Metric: lifetime_revenue
```

- ✅ User is authenticated (User ID: 3)
- ✅ API route is being called correctly
- ✅ Metric parameter is correct
- ❌ **Supabase cannot be reached** (DNS failure)

The Next.js app is working fine, but it **cannot connect to Supabase** to fetch the data.

## Next Steps:

1. **Check if Supabase project is paused:**
   - Go to: https://app.supabase.com/project/haxkwqwamgaeodrxqygc
   - If shows "PAUSED", click "Restore"
   
2. **Wait for restoration** (if paused)
   - Takes 1-2 minutes
   
3. **Test connection:**
   ```bash
   curl https://haxkwqwamgaeodrxqygc.supabase.co
   ```
   Should return HTML, not an error

4. **Reload dashboard** and check browser console

## Expected Behavior Once Fixed:

When Supabase is accessible, you should see in **browser console**:
```javascript
Fetching Supabase metrics...
API Responses: {
  earnings: [{ total_earnings: 0 }],
  lifetimeRevenue: [{ total_revenue: 0, booking_count: 0 }],
  // ... more data
}
Supabase metrics loaded successfully
```

And in **terminal logs**:
```
[Host Analytics API] User: 3 (parsed: 3), Metric: lifetime_revenue
[Host Analytics API] Fetched lifetime_revenue: [{ total_revenue: 0, booking_count: 0 }]
```

## Important Note:

Even if functions return **zero values**, that's actually OK if you don't have data yet. The error we're seeing now is that **Supabase cannot be reached at all**.

Once Supabase is accessible again, the dashboards will work, even if they show zeros (which means no bookings/data yet).
