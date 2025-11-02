# 🚀 Quick Start Guide

Get Park-Connect running in 10 minutes!

---

## ⚡ Prerequisites Checklist

- ✅ Node.js 18+ installed (`node --version`)
- ✅ npm installed (`npm --version`)
- ✅ Supabase account created (free at [supabase.com](https://supabase.com))

---

## 📝 5-Step Setup

### Step 1: Install Dependencies (2 min)

```bash
cd /Users/saipraveenkudapa/Desktop/Smart_Parking
npm install
```

### Step 2: Create Supabase Project (3 min)

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Enter project name: `park-connect`
4. **Save your database password!** 📝
5. Choose region (e.g., US East)
6. Wait 2 minutes for provisioning

### Step 3: Get Connection Strings (1 min)

In Supabase Dashboard:
- Go to **Settings** → **Database**
- Scroll to **Connection String**
- Copy **both** connection strings:
  - URI (Connection pooling) → for `DATABASE_URL`
  - Direct connection → for `DIRECT_URL`

### Step 4: Configure Environment (1 min)

```bash
# Create .env file
cp .env.example .env

# Edit .env (use nano, vim, or VS Code)
nano .env
```

Paste your Supabase URLs:
```env
DATABASE_URL="postgresql://postgres.[PROJECT]:[PASSWORD]@...pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
JWT_SECRET="any-random-32-character-string-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Step 5: Initialize Database (2 min)

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase (creates tables)
npm run db:push

# Start development server
npm run dev
```

---

## ✅ Verify It Works

1. **Check Server Running:**
   - Open [http://localhost:3000](http://localhost:3000)
   - You should see the Park-Connect homepage

2. **Check Database Tables:**
   - Go to Supabase Dashboard → **Table Editor**
   - You should see: `users`, `listings`, `bookings`

3. **Test Signup:**
   - Click "Sign Up" on the website
   - Fill in the form with role "Renter"
   - Submit
   - Check console for email verification link

---

## 🧪 Test the Application

### Create a Test User

```bash
# Using curl
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "Test1234!",
    "phoneNumber": "+1234567890",
    "role": "RENTER"
  }'
```

Or use the UI at [http://localhost:3000/signup](http://localhost:3000/signup)

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'
```

Or use the UI at [http://localhost:3000/login](http://localhost:3000/login)

---

## 📊 View Your Data

### Option 1: Supabase Table Editor
- URL: `https://app.supabase.com/project/[YOUR-PROJECT]/editor`
- Click on `users` table to see registered users

### Option 2: Prisma Studio
```bash
npm run db:studio
```
- Opens at [http://localhost:5555](http://localhost:5555)
- Visual database browser

---

## 🎯 What's Implemented

### ✅ Working Features
- User signup with role selection (Renter/Host)
- User login with JWT authentication
- Password hashing (bcrypt)
- Email verification system (check console)
- SMS OTP verification (console-based)
- Home page with search bar
- Responsive UI with Tailwind CSS

### 🚧 To Be Built Next
- Search results page with map
- Listing detail pages
- Host dashboard
- Create listing form
- Booking system
- Stripe payments

---

## 🆘 Troubleshooting

### "Cannot connect to database"
```bash
# Verify your .env has correct Supabase URLs
cat .env | grep DATABASE

# Test connection
npx prisma db push
```

### "Module not found" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Supabase project paused
- Go to dashboard and click "Restore"
- Free tier pauses after 7 days inactivity

---

## 📚 Next Steps

1. **Read the Full Docs:**
   - `README.md` - Complete documentation
   - `SUPABASE_SETUP.md` - Detailed Supabase guide

2. **Explore the Code:**
   - `src/app/api/auth/` - Authentication API routes
   - `src/app/signup/` - Signup page
   - `src/app/login/` - Login page
   - `prisma/schema.prisma` - Database schema

3. **Build More Features:**
   - Check the TODO list in project
   - Start with search results page
   - Add listing creation form
   - Integrate Stripe for payments

---

## 🎓 For Your Presentation

### Demo Flow:
1. Show homepage → explain search functionality
2. Sign up as Renter → show JWT token in console
3. Sign up as Host → show role-based system
4. Show Supabase tables → explain database structure
5. Show Prisma schema → explain data models
6. Show code structure → explain Next.js API routes

### Key Talking Points:
- **Modern Stack:** Next.js 14, TypeScript, Prisma, Supabase
- **Security:** JWT auth, bcrypt password hashing, SSL connections
- **Scalability:** Serverless architecture, connection pooling
- **Free Hosting:** Vercel + Supabase free tiers

---

## 💡 Pro Tips

1. **Development:**
   ```bash
   # Run Prisma Studio in background while developing
   npm run db:studio &
   
   # In another terminal
   npm run dev
   ```

2. **Database Changes:**
   ```bash
   # After modifying prisma/schema.prisma
   npm run db:generate
   npm run db:push
   ```

3. **Environment Variables:**
   - Never commit `.env` to Git
   - Use `.env.example` as template
   - Different databases for dev/prod

4. **Testing:**
   - Use Prisma Studio to add test data
   - Use browser DevTools Network tab to debug API calls
   - Check console for email verification links

---

## 🔗 Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema (no migrations)
npm run db:migrate       # Create migration
npm run db:studio        # Open database UI

# Code Quality
npm run lint             # Check code style
```

---

## ✨ You're All Set!

Your Park-Connect application is now running with:
- ✅ Next.js frontend and API
- ✅ Supabase PostgreSQL database
- ✅ User authentication system
- ✅ Email/SMS verification stubs

**Happy coding! 🚀**

Need help? Check:
- `README.md` for detailed docs
- `SUPABASE_SETUP.md` for database help
- Supabase Discord: https://discord.supabase.com
