-- Migration: Switch from phone to email verification
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/haxkwqwamgaeodrxqygc/sql/new

-- 1. Update users table
ALTER TABLE users 
  ALTER COLUMN "phoneNumber" DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS users_phoneNumber_key,
  RENAME COLUMN "phoneVerified" TO "emailVerified";

-- 2. Update pending_users table
ALTER TABLE pending_users
  ALTER COLUMN "phoneNumber" DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS pending_users_phoneNumber_key,
  RENAME COLUMN "otp" TO "verificationToken",
  RENAME COLUMN "otpExpiry" TO "tokenExpiry";

-- 3. Verify changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('users', 'pending_users')
ORDER BY table_name, ordinal_position;
