
-- Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Vegetables',
  price numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  grade text NOT NULL DEFAULT 'A',
  organic boolean NOT NULL DEFAULT false,
  description text,
  farm_name text,
  farm_distance text,
  rating numeric NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  in_stock boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view products
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT TO authenticated USING (true);

-- Farmers can manage own products
CREATE POLICY "Farmers can insert own products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update own products" ON public.products
  FOR UPDATE TO authenticated USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can delete own products" ON public.products
  FOR DELETE TO authenticated USING (auth.uid() = farmer_id);

-- Cart items table
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cart" ON public.cart_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can add to cart" ON public.cart_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart" ON public.cart_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from cart" ON public.cart_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
