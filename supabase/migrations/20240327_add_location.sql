-- Add location column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS location text;

-- Make location column not null for new records
ALTER TABLE public.products ALTER COLUMN location SET NOT NULL; 