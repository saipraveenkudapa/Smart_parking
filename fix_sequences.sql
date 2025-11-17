-- Fix auto-increment sequences for all tables in park_connect schema
-- Run this in Supabase SQL Editor

-- Fix users table sequence (uses dim_users prefix in sequence name)
SELECT setval(
  'park_connect.dim_users_user_id_seq',
  COALESCE((SELECT MAX(user_id) FROM park_connect.users), 0) + 1,
  false
);

-- Fix vehicle table sequence (uses dim_vehicle prefix in sequence name)
SELECT setval(
  'park_connect.dim_vehicle_vehicle_id_seq',
  COALESCE((SELECT MAX(vehicle_id) FROM park_connect.vehicle), 0) + 1,
  false
);

-- Fix parking_spaces table sequence (uses dim_parking_spaces prefix in sequence name)
SELECT setval(
  'park_connect.dim_parking_spaces_space_id_seq',
  COALESCE((SELECT MAX(space_id) FROM park_connect.parking_spaces), 0) + 1,
  false
);

-- Fix space_location table sequence (uses dim_space_location prefix in sequence name)
SELECT setval(
  'park_connect.dim_space_location_location_id_seq',
  COALESCE((SELECT MAX(location_id) FROM park_connect.space_location), 0) + 1,
  false
);

-- Fix availability table sequence (uses fact_availability prefix in sequence name)
SELECT setval(
  'park_connect.fact_availability_availability_id_seq',
  COALESCE((SELECT MAX(availability_id) FROM park_connect.availability), 0) + 1,
  false
);

-- Fix fact_bookings table sequence
SELECT setval(
  'park_connect.fact_bookings_booking_id_seq',
  COALESCE((SELECT MAX(booking_id) FROM park_connect.fact_bookings), 0) + 1,
  false
);

-- Fix favorites table sequence (uses dim_favorites prefix in sequence name)
SELECT setval(
  'park_connect.dim_favorites_favorite_id_seq',
  COALESCE((SELECT MAX(favorite_id) FROM park_connect.favorites), 0) + 1,
  false
);

-- Fix payout table sequence (uses dim_payout prefix in sequence name)
SELECT setval(
  'park_connect.dim_payout_payout_id_seq',
  COALESCE((SELECT MAX(payout_id) FROM park_connect.payout), 0) + 1,
  false
);

-- Fix reviews table sequence (uses dim_reviews prefix in sequence name)
SELECT setval(
  'park_connect.dim_reviews_review_id_seq',
  COALESCE((SELECT MAX(review_id) FROM park_connect.reviews), 0) + 1,
  false
);

-- Verify the sequences are fixed
SELECT 
  'users' as table_name,
  last_value as next_id
FROM park_connect.dim_users_user_id_seq
UNION ALL
SELECT 
  'vehicle' as table_name,
  last_value as next_id
FROM park_connect.dim_vehicle_vehicle_id_seq
UNION ALL
SELECT 
  'parking_spaces' as table_name,
  last_value as next_id
FROM park_connect.dim_parking_spaces_space_id_seq
UNION ALL
SELECT 
  'space_location' as table_name,
  last_value as next_id
FROM park_connect.dim_space_location_location_id_seq
UNION ALL
SELECT 
  'availability' as table_name,
  last_value as next_id
FROM park_connect.fact_availability_availability_id_seq
UNION ALL
SELECT 
  'fact_bookings' as table_name,
  last_value as next_id
FROM park_connect.fact_bookings_booking_id_seq
UNION ALL
SELECT 
  'favorites' as table_name,
  last_value as next_id
FROM park_connect.dim_favorites_favorite_id_seq
UNION ALL
SELECT 
  'payout' as table_name,
  last_value as next_id
FROM park_connect.dim_payout_payout_id_seq
UNION ALL
SELECT 
  'reviews' as table_name,
  last_value as next_id
FROM park_connect.dim_reviews_review_id_seq;
