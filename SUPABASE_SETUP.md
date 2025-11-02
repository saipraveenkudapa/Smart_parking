# 🗄️ Supabase Database Setup Guide

Complete guide for setting up Supabase PostgreSQL for Park-Connect.

---

## 📝 Step-by-Step Setup

### 1. Create Supabase Account & Project

1. Visit [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign in"**
3. Sign up with GitHub (recommended) or email
4. You'll land on the **All Projects** page

### 2. Create a New Project

1. Click **"New Project"**
2. Select your **Organization** (or create one)
3. Fill in project details:
   - **Name:** `park-connect` (or your choice)
   - **Database Password:** 
     - Click "Generate a password" or create your own
     - **⚠️ CRITICAL:** Save this password! You cannot recover it later
     - Store it in a password manager or secure note
   - **Region:** Choose closest to your location
     - US East (N. Virginia) - `us-east-1`
     - Europe (Frankfurt) - `eu-central-1`
     - Asia Pacific (Singapore) - `ap-southeast-1`
   - **Pricing Plan:** Free (includes 500MB database)
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

---

## 🔗 Get Database Connection Strings

### Method 1: From Dashboard (Recommended)

1. After project is ready, go to **Settings** (⚙️ in sidebar)
2. Click **"Database"** in the left menu
3. Scroll down to **Connection String** section
4. You'll see multiple options:

#### For Next.js/Serverless (Connection Pooling)
```
URI format (with connection pooling):
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```
- **Use this for:** `DATABASE_URL` in `.env`
- Good for serverless/edge functions
- Handles many concurrent connections

#### For Migrations (Direct Connection)
```
URI format (direct):
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```
- **Use this for:** `DIRECT_URL` in `.env`
- Required for Prisma migrations and schema pushes
- Direct connection without pooling

### Method 2: Build It Manually

If you prefer to build the connection strings:

**Template:**
```
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"

DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

**Replace:**
- `[PROJECT-REF]` - Find in Settings → General → Reference ID
- `[PASSWORD]` - Your database password from step 2.3
- `[REGION]` - Your chosen region (e.g., `us-east-1`)

---

## ⚙️ Configure .env File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and paste your connection strings:
   ```env
   # Replace with YOUR actual values
   DATABASE_URL="postgresql://postgres.abcdefghijk:YourPassword123@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"
   
   DIRECT_URL="postgresql://postgres:YourPassword123@db.abcdefghijk.supabase.co:5432/postgres"
   
   JWT_SECRET="generate-random-secret-here"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

3. Generate a secure JWT secret:
   ```bash
   # macOS/Linux
   openssl rand -base64 32
   
   # Or use online generator: https://generate-secret.vercel.app/32
   ```

---

## 🚀 Initialize Database Schema

### Step 1: Generate Prisma Client
```bash
npm run db:generate
```
This creates the Prisma client based on your schema.

### Step 2: Push Schema to Supabase
```bash
npm run db:push
```
This creates all tables in Supabase without creating migration files (perfect for development).

### Step 3: Verify Tables Created

**Option A: Supabase Dashboard**
1. Go to your Supabase project
2. Click **"Table Editor"** in sidebar
3. You should see 3 tables:
   - ✅ `users`
   - ✅ `listings`
   - ✅ `bookings`

**Option B: Prisma Studio**
```bash
npm run db:studio
```
Opens a visual database editor at `http://localhost:5555`

---

## 🔍 Enable Useful Extensions (Optional)

### PostGIS (for location features)
1. Go to **Database** → **Extensions** in Supabase
2. Search for `postgis`
3. Click **Enable**
4. Allows advanced geospatial queries (useful for search by distance)

### pg_stat_statements (for performance monitoring)
1. Already enabled by default
2. Go to **Database** → **Query Performance** to see stats

---

## 📊 View Your Data

### Supabase Table Editor
- **URL:** `https://app.supabase.com/project/[YOUR-PROJECT-REF]/editor`
- Visual interface to view/edit rows
- Can create new rows manually for testing

### Prisma Studio (Local)
```bash
npm run db:studio
```
- Opens at `http://localhost:5555`
- More advanced filtering and editing
- Works offline

---

## 🧪 Test Database Connection

### Quick Test with Prisma
```bash
npx prisma db push
```
If successful, you'll see:
```
✓ Your database is now in sync with your Prisma schema
```

### Test in Code
Create a test file: `test-db.js`
```javascript
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const userCount = await prisma.user.count()
  console.log(`✅ Connected! Total users: ${userCount}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Run:
```bash
node test-db.js
```

---

## 🔐 Security Best Practices

### 1. Row Level Security (RLS) - For Production
While we're using JWT for auth, you can add extra security:

```sql
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only read their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);
```

### 2. Environment Variables
- ✅ Never commit `.env` to Git (already in `.gitignore`)
- ✅ Use different databases for dev/staging/production
- ✅ Rotate passwords periodically

### 3. Connection Pooling
- Already configured with `?pgbouncer=true`
- Prevents running out of connections on free tier
- Limit: 15 concurrent connections (free tier)

---

## 💰 Supabase Free Tier Limits

| Resource | Free Tier Limit |
|----------|----------------|
| **Database Size** | 500 MB |
| **Bandwidth** | 2 GB/month |
| **Concurrent Connections** | 15 direct, 200 pooled |
| **Projects** | 2 active |
| **Auto-pause** | After 7 days inactivity |

**For College Project:** Free tier is more than enough!

---

## 🆘 Common Issues & Solutions

### Issue: "password authentication failed"
**Solution:**
- Double-check your password in `.env`
- Make sure there are no spaces or special characters causing issues
- Try resetting database password in Settings → Database → Reset Password

### Issue: "database is paused"
**Solution:**
- Free tier databases pause after 7 days of inactivity
- Go to dashboard and click **"Restore"** or **"Resume"**
- Takes ~1 minute to restart

### Issue: "too many connections"
**Solution:**
- You're likely using `DATABASE_URL` without `?pgbouncer=true`
- Make sure connection pooling is enabled in your connection string
- Or use fewer concurrent queries

### Issue: "relation does not exist"
**Solution:**
```bash
# Re-push your schema
npm run db:push

# Or create migrations
npm run db:migrate
```

### Issue: "SSL connection required"
**Solution:**
- Supabase requires SSL by default (this is good!)
- Prisma handles this automatically
- If needed, add to connection string: `?sslmode=require`

---

## 📚 Useful Supabase Features for Later

### 1. SQL Editor
- Run custom SQL queries
- Found at: Database → SQL Editor
- Can create custom views, functions, triggers

### 2. Database Backups
- Free tier: Daily backups (7 days retention)
- Manual backups available

### 3. Realtime Subscriptions (Advanced)
```javascript
// Listen to database changes in real-time
const subscription = supabase
  .from('listings')
  .on('INSERT', payload => {
    console.log('New listing!', payload.new)
  })
  .subscribe()
```

### 4. Database Functions
```sql
-- Example: Custom function to search nearby listings
CREATE FUNCTION search_nearby(lat float, lng float, radius_km float)
RETURNS TABLE (id text, distance float) AS $$
  SELECT id, 
    ST_Distance(
      ST_MakePoint(longitude, latitude)::geography,
      ST_MakePoint(lng, lat)::geography
    ) / 1000 as distance
  FROM listings
  WHERE ST_DWithin(
    ST_MakePoint(longitude, latitude)::geography,
    ST_MakePoint(lng, lat)::geography,
    radius_km * 1000
  );
$$ LANGUAGE sql;
```

---

## 🎓 For Your College Presentation

### Key Points to Highlight:

1. **Why Supabase?**
   - Free PostgreSQL hosting
   - Built-in features (auth, storage, realtime)
   - Better than local database for demos
   - Production-ready infrastructure

2. **Prisma + Supabase Benefits:**
   - Type-safe database queries
   - Automatic migrations
   - Great developer experience
   - Easy to switch databases if needed

3. **Security:**
   - SSL-encrypted connections
   - Connection pooling for performance
   - Row-level security available
   - Automatic backups

---

## 🔗 Useful Links

- **Supabase Dashboard:** https://app.supabase.com
- **Supabase Docs:** https://supabase.com/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Prisma + Supabase Guide:** https://supabase.com/docs/guides/integrations/prisma

---

**Need Help?** Check the main README.md troubleshooting section or Supabase community forums.
