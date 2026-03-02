
-- Orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL DEFAULT ('ORD-' || lpad(floor(random() * 100000)::text, 5, '0')),
  consumer_id uuid NOT NULL,
  farmer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  commission_amount numeric(10,2) NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Disputes table
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_number text NOT NULL DEFAULT ('DSP-' || lpad(floor(random() * 10000)::text, 4, '0')),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  farmer_id uuid NOT NULL,
  consumer_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('Quality Issue', 'Late Delivery', 'Wrong Item', 'Missing Item', 'Other')),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Review', 'Resolved', 'Closed')),
  amount numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- RLS for orders
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Farmers can view own orders" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = farmer_id);
CREATE POLICY "Consumers can view own orders" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = consumer_id);
CREATE POLICY "Consumers can insert orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = consumer_id);
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Farmers can update own orders" ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = farmer_id);

-- RLS for disputes
CREATE POLICY "Admins can view all disputes" ON public.disputes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update disputes" ON public.disputes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Consumers can insert disputes" ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = consumer_id);
CREATE POLICY "Users can view own disputes" ON public.disputes FOR SELECT TO authenticated
  USING (auth.uid() = farmer_id OR auth.uid() = consumer_id);

-- Triggers for updated_at
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER disputes_updated_at BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
