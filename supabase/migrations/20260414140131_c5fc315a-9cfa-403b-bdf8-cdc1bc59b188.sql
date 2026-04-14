
-- 1. Fix messages UPDATE policy: require sender_id = auth.uid()
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages" ON public.messages
FOR UPDATE TO authenticated
USING (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- 2. Block INSERT and DELETE on user_roles for non-service-role
CREATE POLICY "Only service role can insert roles" ON public.user_roles
FOR INSERT TO public
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can delete roles" ON public.user_roles
FOR DELETE TO public
USING (auth.role() = 'service_role');

-- 3. Order price validation trigger
CREATE OR REPLACE FUNCTION public.validate_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculated_total numeric := 0;
  item_record jsonb;
  product_price numeric;
  item_qty integer;
  product_id_val uuid;
BEGIN
  -- Calculate total from items array using actual product prices
  FOR item_record IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    product_id_val := (item_record->>'product_id')::uuid;
    item_qty := COALESCE((item_record->>'quantity')::integer, 1);
    
    SELECT price INTO product_price FROM public.products WHERE id = product_id_val;
    
    IF product_price IS NULL THEN
      RAISE EXCEPTION 'Product % not found', product_id_val;
    END IF;
    
    calculated_total := calculated_total + (product_price * item_qty);
  END LOOP;
  
  -- Override client-supplied values with server-calculated ones
  NEW.total_amount := calculated_total;
  NEW.commission_amount := ROUND(calculated_total * 0.05, 2);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_order_totals_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_totals();
