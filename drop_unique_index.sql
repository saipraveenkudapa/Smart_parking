-- Remove UNIQUE constraint from parking_spaces.pricing_id completely
-- Run this in Supabase SQL Editor

-- Step 1: Check all constraints and indexes on parking_spaces
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'park_connect.parking_spaces'::regclass
  AND conname LIKE '%pricing%';

-- Step 2: Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'park_connect' 
  AND tablename = 'parking_spaces'
  AND indexname LIKE '%pricing%';

-- Step 3: Drop ALL unique constraints on pricing_id
ALTER TABLE park_connect.parking_spaces 
DROP CONSTRAINT IF EXISTS parking_spaces_pricing_id_key CASCADE;

-- Step 4: Drop the unique index (it might exist separately)
DROP INDEX IF EXISTS park_connect.parking_spaces_pricing_id_key CASCADE;

-- Step 5: Verify everything is removed
SELECT 
    'Constraints' as type,
    conname AS name
FROM pg_constraint
WHERE conrelid = 'park_connect.parking_spaces'::regclass
  AND conname LIKE '%pricing%'
UNION ALL
SELECT 
    'Indexes' as type,
    indexname AS name
FROM pg_indexes
WHERE schemaname = 'park_connect' 
  AND tablename = 'parking_spaces'
  AND indexname LIKE '%pricing%';
