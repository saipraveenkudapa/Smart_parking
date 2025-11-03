# 🅿️ Park-Connect: Peer-to-Peer Parking Marketplace

A Next.js web application that connects individuals with unused parking spaces (Hosts) to those seeking monthly parking (Renters). Built as a college project demonstration.

## 📚 Documentation

- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Detailed database setup guide
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Current implementation status
- **[README.md](./README.md)** - Complete documentation (this file)

## 🎯 Features

### ✅ Implemented (MVP)
- **User Authentication**
  - Signup with role selection (Renter/Host)
  - Login with JWT-based sessions
  - Password hashing with bcrypt
  - Email verification system
  - SMS OTP verification (console-based for demo)
  - Password reset flow

- **Home Page**
  - Search bar for parking locations
  - Popular cities quick links
  - Role-based CTAs

- **Database Models**
  - Users (with email/phone verification)
  - Listings (parking spaces)
  - Bookings (rental transactions)

### 🚧 To Be Implemented
- Search results with map view
- Listing detail pages
- Host dashboard
- Multi-step listing creation
- Stripe payment integration
- Admin panel

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Supabase PostgreSQL with Prisma ORM
- **Authentication:** JWT + bcrypt
- **Styling:** Tailwind CSS
- **Map:** Leaflet (for search results)
- **Email:** Nodemailer (SMTP)
- **SMS:** Twilio (optional, console-based for demo)
- **Payments:** Stripe (to be integrated)

---

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available)
- (Optional) Gmail account for SMTP emails
- (Optional) Twilio account for SMS

---

## 🚀 Installation & Setup

### 1. Clone and Install Dependencies

```bash
cd Smart_Parking
npm install
```

### 2. Setup Supabase Database

**Step-by-step Supabase Setup:**

1. **Create a Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up/login (free tier includes 500MB database + 2GB bandwidth)
   - Click "New Project"
   - Choose organization, enter project name
   - **IMPORTANT:** Save the database password shown (you'll need it!)
   - Select a region close to you (e.g., US East, Europe West)
   - Click "Create new project" (takes ~2 minutes)

2. **Get Database Connection Strings**
   - Go to Project Settings (⚙️ icon in sidebar)
   - Navigate to **Database** section
   - Scroll to **Connection String** section
   - Copy both:
     - **Connection Pooling (Transaction mode)** → This is your `DATABASE_URL`
     - **Direct Connection** → This is your `DIRECT_URL`
   - Replace `[YOUR-PASSWORD]` in both URLs with your database password

3. **Enable Required Extensions** (optional, but recommended)
   - Go to **Database** → **Extensions** in Supabase dashboard
   - Search and enable: `postgis` (for location/map features later)

### 3. Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values
nano .env
```

**Minimum Required Configuration:**
```env
# From Supabase Dashboard -> Settings -> Database
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Generate random secret: openssl rand -base64 32
JWT_SECRET="your-random-secret-key-change-this"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Optional (for email verification):**
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"  # Generate at https://myaccount.google.com/apppasswords
```

### 4. Initialize Database with Prisma

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase (creates tables)
npm run db:push

# Verify tables created in Supabase Dashboard -> Table Editor

# (Optional) Open Prisma Studio to view/edit data locally
npm run db:studio
```

**Verify in Supabase:**
- Go to Supabase Dashboard → **Table Editor**
- You should see 3 tables: `users`, `listings`, `bookings`

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
Smart_Parking/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/          # Auth API routes
│   │   ├── signup/            # Signup page
│   │   ├── login/             # Login page
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   └── lib/
│       ├── prisma.ts          # Database client
│       ├── auth.ts            # JWT & password utils
│       ├── validations.ts     # Zod schemas
│       ├── email.ts           # Email service
│       └── sms.ts             # SMS OTP service
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🧪 Testing the Application

### 1. Test User Registration

```bash
# Method 1: Use the UI
Open http://localhost:3000/signup

# Method 2: Use curl
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "phoneNumber": "+1234567890",
    "role": "RENTER"
  }'
```

### 2. Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Verify Email

```bash
# Check console for verification link (if SMTP not configured)
# Click the link or make a GET request:
curl http://localhost:3000/api/auth/verify-email?token=YOUR_TOKEN
```

---

## 🗄️ Database Schema

### Users Table
- `id`, `email`, `password` (hashed), `fullName`, `phoneNumber`
- `role`: RENTER | HOST | ADMIN
- `emailVerified`, `phoneVerified` (boolean flags)
- Verification tokens

### Listings Table
- Location: address, city, state, zipCode, coordinates
- Details: title, description, spaceType, vehicleSize
- Security: isGated, hasCCTV, isCovered, hasEVCharging
- Pricing: monthlyPrice, securityDeposit

### Bookings Table
- Rental details: startDate, endDate, vehicleDetails
- Pricing: monthlyPrice, totalMonths, platformFee, totalAmount
- Status: PENDING | CONFIRMED | CANCELLED | COMPLETED

---

## 🔐 Security Features

- ✅ Password hashing with bcrypt (salt rounds: 10)
- ✅ JWT-based authentication with expiry
- ✅ Email verification required for bookings
- ✅ Phone OTP verification (console-based for demo)
- ✅ Input validation with Zod schemas
- ✅ HTTPS enforcement in production (via Next.js)
- ✅ SQL injection prevention (Prisma)

---


---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify-email?token=...` - Verify email
- `POST /api/auth/send-otp` - Send SMS OTP (requires JWT)
- `POST /api/auth/verify-otp` - Verify SMS OTP (requires JWT)

---

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Check your Supabase connection strings in .env
# Make sure you replaced [YOUR-PASSWORD] with actual password

# Test connection with Prisma
npx prisma db push

# Verify in Supabase Dashboard -> Settings -> Database
# Check if "Connection pooler" is enabled
```

### "Prisma Client not generated"
```bash
npm run db:generate
```

### "Port 3000 already in use"
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or run on different port
PORT=3001 npm run dev
```

### Supabase Connection Issues
```bash
# Make sure you're using BOTH connection strings:
# DATABASE_URL (pooler) for edge functions/serverless
# DIRECT_URL (direct) for migrations

# Check Supabase project is not paused (free tier pauses after 7 days inactivity)
# Go to dashboard and click "Restore" if needed
```

---

## 📦 Deployment

### Vercel (Recommended - Works seamlessly with Supabase)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# - DATABASE_URL (from Supabase)
# - DIRECT_URL (from Supabase)
# - JWT_SECRET
# - NEXT_PUBLIC_APP_URL (your Vercel URL)
```

**Important:** Supabase free tier works great with Vercel's serverless functions!

### Alternative: Netlify

1. Push code to GitHub
2. Create new site on [Netlify](https://netlify.com)
3. Connect GitHub repo
4. Add environment variables in Netlify dashboard
5. Build command: `npm run build`
6. Publish directory: `.next`

---

## 👨‍💻 Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema to database
npm run db:migrate   # Create migration
npm run db:studio    # Open Prisma Studio
```

---

## 📄 License

This is a college project for educational purposes.

---

## 🤝 Contact

For questions about this project, please contact your instructor or TA.

**Built with ❤️ using Next.js and TypeScript**
