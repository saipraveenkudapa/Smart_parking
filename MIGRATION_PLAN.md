# Database Migration Plan
## From Current Schema to New Schema

**Date**: November 16, 2025  
**Status**: Ready for Review

---

## 📋 Overview

This document outlines the migration from the current Prisma-managed schema to the new database schema with auto-incrementing integer IDs.

---

## 🔄 Major Changes

### 1. **ID System Change**
- **Current**: String-based CUIDs (`@default(cuid())`)
- **New**: Auto-incrementing integers (`@default(autoincrement())`)

### 2. **Table Structure Changes**

| Current Table | New Table | Status |
|--------------|-----------|--------|
| `users` | `users` | ✅ Updated structure |
| `pending_users` | ❌ Not in new schema | ⚠️ Will be removed |
| `listings` | `parking_spaces` | ✅ Renamed & restructured |
| `bookings` | `bookings` | ✅ Restructured |
| ➕ N/A | `vehicles` | ✅ New table |
| ➕ N/A | `availability` | ✅ New table |
| ➕ N/A | `favorites` | ✅ New table |
| ➕ N/A | `reviews` | ✅ New table |
| ➕ N/A | `payouts` | ✅ New table |
| ➕ N/A | `support_tickets` | ✅ New table |

---

## 📊 Field Mapping

### **Users Table**
| Current Field | New Field | Type Change | Notes |
|--------------|-----------|-------------|-------|
| `id` (String) | `user_id` (Int) | ✅ Changed | Auto-increment |
| `email` | `email` | ✅ Same | |
| `password` | `password_hash` | ✅ Renamed | |
| `fullName` | `full_name` | ✅ Snake case | |
| `phoneNumber` | `phone_number` | ✅ Snake case | |
| `role` (Enum) | `user_type` (String) | ✅ Changed | 'driver' or 'owner' |
| `emailVerified` | `is_verified` | ✅ Renamed | |
| ➕ N/A | `profile_photo_url` | ✅ New | Array of URLs |
| ➕ N/A | `date_of_birth` | ✅ New | Date field |
| ➕ N/A | `last_login` | ✅ New | Timestamp |
| ➕ N/A | `status` | ✅ New | 'active', 'suspended', 'inactive' |
| ➕ N/A | `address`, `city`, `state`, `zip_code` | ✅ New | User location |
| ➕ N/A | `rating_as_driver` | ✅ New | Decimal(3,2) |
| ➕ N/A | `rating_as_owner` | ✅ New | Decimal(3,2) |

### **Parking Spaces (formerly Listings)**
| Current Field | New Field | Type Change | Notes |
|--------------|-----------|-------------|-------|
| `id` (String) | `space_id` (Int) | ✅ Changed | Auto-increment |
| `hostId` | `owner_id` | ✅ Renamed | Int foreign key |
| `title` | `title` | ✅ Same | |
| `description` | `description` | ✅ Same | |
| `address` | `address` | ✅ Same | |
| `city` | `city` | ✅ Same | |
| `state` | `state` | ✅ Same | |
| `zipCode` | `zip_code` | ✅ Snake case | |
| `latitude` | `latitude` | ✅ Same | Now Decimal(10,8) |
| `longitude` | `longitude` | ✅ Same | Now Decimal(11,8) |
| `spaceType` (Enum) | `space_type` (String) | ✅ Changed | Lowercase string |
| `vehicleSize` | ❌ Removed | ⚠️ | UI field dropped (not in DB) |
| `accessInstructions` | `access_instructions` | ✅ Snake case | |
| `monthlyPrice` | `monthly_rate` | ✅ Renamed | Now Decimal(10,2) |
| `price` | ➕ Multiple rates | ✅ Changed | Split into hourly/daily/weekly/monthly |
| `pricingType` | ❌ Removed | ⚠️ | Now have separate rate fields |
| `isActive` | `status` | ✅ Changed | 'active', 'inactive', 'maintenance' |
| `hasCCTV` | `has_cctv` | ✅ Snake case | |
| `hasEVCharging` | `ev_charging` | ✅ Renamed | |
| `isGated` | ❌ Removed | ✅ | Dropped from UI to match schema |
| `isCovered` | ❌ Removed | ✅ | Dropped from UI to match schema |
| ➕ N/A | `is_instant_book` | ✅ New | Boolean |

### **Bookings Table**
| Current Field | New Field | Type Change | Notes |
|--------------|-----------|-------------|-------|
| `id` (String) | `booking_id` (Int) | ✅ Changed | Auto-increment |
| `renterId` | `driver_id` | ✅ Renamed | Int foreign key |
| `listingId` | `space_id` | ✅ Renamed | Int foreign key |
| ➕ N/A | `vehicle_id` | ✅ New | Int foreign key |
| `startDate` | `start_time` | ✅ Renamed | Now DateTime |
| `endDate` | `end_time` | ✅ Renamed | Now DateTime |
| `vehicleDetails` (String) | ❌ Removed | ⚠️ | Now uses vehicle_id relation |
| ➕ N/A | `booking_date` | ✅ New | When booking was made |
| ➕ N/A | `duration_hours` | ✅ New | Decimal(10,2) |
| `monthlyPrice` | ❌ Removed | ⚠️ | |
| `totalMonths` | ❌ Removed | ⚠️ | |
| `platformFee` | `service_fee` | ✅ Renamed | Now Decimal(10,2) |
| `totalAmount` | `total_amount` | ✅ Snake case | Now Decimal(10,2) |
| ➕ N/A | `owner_payout` | ✅ New | Decimal(10,2) |
| `status` (Enum) | `booking_status` (String) | ✅ Changed | Lowercase string |
| `paidAt` | `payment_status` | ✅ Changed | Now separate status field |
| ➕ N/A | `access_code` | ✅ New | For space access |
| ➕ N/A | `special_instructions` | ✅ New | Text field |
| ➕ N/A | `cancellation_date` | ✅ New | When cancelled |
| ➕ N/A | `cancellation_reason` | ✅ New | Why cancelled |

---

## 🆕 New Tables

### **Vehicles**
- Stores user vehicle information
- Links to bookings
- One user can have multiple vehicles
- One vehicle marked as default

### **Availability**
- Defines when parking spaces are available
- Date-based with time ranges
- Can mark unavailable with reason

### **Favorites**
- Users can favorite parking spaces
- Quick access to preferred locations

### **Reviews**
- Two-way reviews (driver ↔ owner)
- Rating system (1-5 stars)
- Linked to bookings
- Verified status

### **Payouts**
- Owner payment tracking
- Period-based (start/end dates)
- Multiple payout methods
- Status tracking

### **Support Tickets**
- User support system
- Can be linked to bookings
- Priority levels
- Status tracking

---

## 🗺️ Page Mapping

### **Affected Pages & Components**

#### 1. **Authentication Pages**
- `/signup` - Update to use new User model
- `/login` - Update password field reference
- `/verify-email` - Update to use new User model

#### 2. **User Profile Pages**
- `/profile` - Add new fields (profile photo, ratings, address)
- Create `/profile/vehicles` - Manage vehicles
- Update user API routes

#### 3. **Listing/Space Pages**
- `/host/list-space` - Update to ParkingSpace model
  - Add hourly/daily/weekly rate options
  - Update field names (snake_case)
- `/search` - Update to query ParkingSpace
- `/listing/[id]` - Update to use space_id

#### 4. **Booking Pages**
- `/renter/bookings` - Update to new Booking structure
  - Add vehicle selection
  - Show access code
  - Display duration in hours
- `/host/bookings` - Update owner payout display
- Create booking flow with vehicle selection

#### 5. **New Pages to Create**
- `/favorites` - View favorited spaces
- `/reviews` - Manage reviews
- `/payouts` - Owner payout dashboard
- `/support` - Support ticket system
- `/availability` - Manage space availability (host)

---

## 🔧 API Routes to Update

### **User Routes**
- ✅ `POST /api/auth/signup` - Update User model
- ✅ `POST /api/auth/login` - Update password_hash reference
- ✅ `GET /api/users/profile` - Add new fields
- ➕ `POST /api/users/vehicles` - Create vehicle
- ➕ `GET /api/users/vehicles` - List vehicles
- ➕ `PUT /api/users/vehicles/[id]` - Update vehicle
- ➕ `DELETE /api/users/vehicles/[id]` - Delete vehicle

### **Parking Space Routes**
- ✅ `POST /api/listings/create` → `/api/spaces/create`
- ✅ `GET /api/listings` → `/api/spaces`
- ✅ `GET /api/listings/[id]` → `/api/spaces/[id]`
- ➕ `GET /api/spaces/availability/[id]` - Check availability
- ➕ `POST /api/spaces/availability` - Set availability

### **Booking Routes**
- ✅ `POST /api/bookings` - Update with vehicle_id
- ✅ `GET /api/bookings` - Update field mappings
- ➕ `POST /api/bookings/[id]/cancel` - Cancel booking

### **New API Routes**
- ➕ `POST /api/favorites` - Add favorite
- ➕ `DELETE /api/favorites/[id]` - Remove favorite
- ➕ `GET /api/favorites` - List favorites
- ➕ `POST /api/reviews` - Create review
- ➕ `GET /api/reviews/[id]` - Get reviews
- ➕ `GET /api/payouts` - List payouts
- ➕ `POST /api/support` - Create ticket
- ➕ `GET /api/support` - List tickets

---

## 📝 Migration Steps

### **Step 1: Backup Current Database**
```bash
# Export current data
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### **Step 2: Replace Prisma Schema**
```bash
# Backup current schema
cp prisma/schema.prisma prisma/schema_old.prisma

# Replace with new schema
mv prisma/schema_new.prisma prisma/schema.prisma
```

### **Step 3: Reset Database (⚠️ DESTRUCTIVE)**
```bash
# This will drop all tables and recreate them
npx prisma db push --force-reset
```

### **Step 4: Generate Prisma Client**
```bash
npx prisma generate
```

### **Step 5: Update Application Code**
- Update all User model references
- Update all Listing → ParkingSpace references
- Update all Booking model references
- Add Vehicle model usage
- Update API routes
- Update component props and types

### **Step 6: Test Application**
- Test user registration/login
- Test space creation
- Test booking flow with vehicle selection
- Test all new features

---

## ⚠️ Important Notes

1. **Data Loss Warning**: This migration will **drop all existing data**. Make sure to backup before proceeding.

2. **Breaking Changes**: 
   - All IDs change from String to Int
   - Many field names change to snake_case
   - Some enums become strings
   - Listing → ParkingSpace rename

3. **Required New Features**:
   - Vehicle management system
   - Availability calendar
   - Review system
   - Favorites feature
   - Support ticket system
   - Payout tracking

4. **Environment Variables**: No changes needed - same DATABASE_URL and DIRECT_URL

---

## ✅ Testing Checklist

- [ ] User signup with new fields
- [ ] User login
- [ ] Create parking space with all rates
- [ ] Search parking spaces
- [ ] Add/edit/delete vehicles
- [ ] Create booking with vehicle selection
- [ ] View booking with access code
- [ ] Add/remove favorites
- [ ] Create review after booking
- [ ] Check space availability
- [ ] Create support ticket
- [ ] View payout dashboard (host)

---

## 🚀 Next Steps

1. **Review this migration plan**
2. **Backup current database**
3. **Confirm you want to proceed**
4. **Execute migration steps**
5. **Update application code systematically**
6. **Test thoroughly before deploying**

Would you like me to proceed with the migration?
