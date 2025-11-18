-- Fix pricing_model and parking_spaces schema
-- Run this in Supabase SQL Editor

-- Step 1: Drop the foreign key constraint from pricing_model first (the dependent object)
ALTER TABLE park_connect.pricing_model 
DROP CONSTRAINT IF EXISTS pricing_model_pricing_id_fkey;

-- Step 2: Drop the foreign key constraint if it exists the other way
ALTER TABLE park_connect.pricing_model 
DROP CONSTRAINT IF EXISTS pricing_model_parking_spaces_fkey;

-- Step 3: Now drop the unique constraint on parking_spaces.pricing_id
ALTER TABLE park_connect.parking_spaces 
DROP CONSTRAINT IF EXISTS parking_spaces_pricing_id_key CASCADE;

-- Step 4: Drop the composite primary key from pricing_model
ALTER TABLE park_connect.pricing_model 
DROP CONSTRAINT IF EXISTS pricing_model_pkey;

-- Step 5: Drop the GENERATED ALWAYS AS IDENTITY from parking_spaces.pricing_id
ALTER TABLE park_connect.parking_spaces 
ALTER COLUMN pricing_id DROP IDENTITY IF EXISTS;

-- Step 6: Drop the default value
ALTER TABLE park_connect.parking_spaces 
ALTER COLUMN pricing_id DROP DEFAULT;

-- Step 7: Make pricing_id nullable in parking_spaces
ALTER TABLE park_connect.parking_spaces 
ALTER COLUMN pricing_id DROP NOT NULL;

-- Step 8: Make pricing_id the primary key of pricing_model
ALTER TABLE park_connect.pricing_model 
ADD PRIMARY KEY (pricing_id);

-- Step 9: Add the correct foreign key from parking_spaces to pricing_model
ALTER TABLE park_connect.parking_spaces 
ADD CONSTRAINT parking_spaces_pricing_id_fkey 
FOREIGN KEY (pricing_id) 
REFERENCES park_connect.pricing_model(pricing_id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Verify the changes
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('park_connect.parking_spaces'::regclass, 'park_connect.pricing_model'::regclass)
ORDER BY conrelid, conname;
