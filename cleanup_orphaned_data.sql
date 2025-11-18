-- Clean up orphaned pricing_id references before adding foreign key
-- Run this in Supabase SQL Editor

-- Step 1: Check which pricing_ids in parking_spaces don't exist in pricing_model
SELECT DISTINCT ps.pricing_id, COUNT(*) as count
FROM park_connect.parking_spaces ps
LEFT JOIN park_connect.pricing_model pm ON ps.pricing_id = pm.pricing_id
WHERE pm.pricing_id IS NULL AND ps.pricing_id IS NOT NULL
GROUP BY ps.pricing_id
ORDER BY ps.pricing_id;

-- Step 2: Set orphaned pricing_id values to NULL
UPDATE park_connect.parking_spaces
SET pricing_id = NULL
WHERE pricing_id IS NOT NULL 
  AND pricing_id NOT IN (SELECT pricing_id FROM park_connect.pricing_model);

-- Step 3: Verify the cleanup
SELECT 
    (SELECT COUNT(*) FROM park_connect.parking_spaces WHERE pricing_id IS NULL) as null_count,
    (SELECT COUNT(*) FROM park_connect.parking_spaces WHERE pricing_id IS NOT NULL) as valid_count,
    (SELECT COUNT(*) FROM park_connect.parking_spaces) as total_count;

-- Step 4: Now add the foreign key constraint
ALTER TABLE park_connect.parking_spaces 
ADD CONSTRAINT parking_spaces_pricing_id_fkey 
FOREIGN KEY (pricing_id) 
REFERENCES park_connect.pricing_model(pricing_id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;
