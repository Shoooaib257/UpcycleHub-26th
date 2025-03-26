-- Add status column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text;

-- Set default value for existing records
UPDATE public.products SET status = 'active' WHERE status IS NULL;

-- Make status column not null and set default value
ALTER TABLE public.products ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN status SET DEFAULT 'active'; 