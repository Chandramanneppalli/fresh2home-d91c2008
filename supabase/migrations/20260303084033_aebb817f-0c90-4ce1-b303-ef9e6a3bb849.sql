
CREATE TABLE public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users DEFAULT NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings"
  ON public.platform_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
  ON public.platform_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('platformName', 'FarmLink Connect'),
  ('commissionRate', '10'),
  ('emailNotifications', 'true'),
  ('smsNotifications', 'false'),
  ('autoApproveOrders', 'false'),
  ('maintenanceMode', 'false'),
  ('minOrderAmount', '50'),
  ('maxDeliveryDays', '7');
