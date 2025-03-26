-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;

-- Create new policy that checks both authentication and seller_id
CREATE POLICY "Users can create products with their ID as seller"
  ON public.products 
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND auth.uid() = seller_id
  ); 