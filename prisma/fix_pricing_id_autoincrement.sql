-- Fix pricing_model.pricing_id to be auto-incrementing
-- Run this in Supabase SQL Editor

-- Step 1: Create a sequence for pricing_id
CREATE SEQUENCE IF NOT EXISTS park_connect.pricing_model_pricing_id_seq;

-- Step 2: Set the sequence to start from the current max value + 1
SELECT setval('park_connect.pricing_model_pricing_id_seq', COALESCE((SELECT MAX(pricing_id) FROM park_connect.pricing_model), 0) + 1, false);

-- Step 3: Set pricing_id column to use the sequence as default
ALTER TABLE park_connect.pricing_model 
  ALTER COLUMN pricing_id SET DEFAULT nextval('park_connect.pricing_model_pricing_id_seq');

-- Step 4: Set the sequence to be owned by the column (so it gets dropped if column is dropped)
ALTER SEQUENCE park_connect.pricing_model_pricing_id_seq OWNED BY park_connect.pricing_model.pricing_id;

-- Verify the change
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_schema = 'park_connect' 
  AND table_name = 'pricing_model' 
  AND column_name = 'pricing_id';
