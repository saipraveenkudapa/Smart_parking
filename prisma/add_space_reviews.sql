-- Add space_id column to reviews table to support parking space reviews
ALTER TABLE park_connect.reviews 
ADD COLUMN IF NOT EXISTS space_id INTEGER;

-- Add foreign key constraint
ALTER TABLE park_connect.reviews
ADD CONSTRAINT fk_reviews_space_id 
FOREIGN KEY (space_id) REFERENCES park_connect.parking_spaces(space_id)
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_reviews_space_id ON park_connect.reviews(space_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON park_connect.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON park_connect.reviews(rating);
