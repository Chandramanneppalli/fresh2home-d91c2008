ALTER TABLE public.products
ADD COLUMN quality_metrics jsonb DEFAULT NULL,
ADD COLUMN quality_scan_image text DEFAULT NULL;