
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_id text UNIQUE;

CREATE SEQUENCE IF NOT EXISTS public.user_number_seq START 1;

UPDATE public.profiles
SET display_id = EXTRACT(YEAR FROM created_at)::text
  || UPPER(LEFT(REGEXP_REPLACE(full_name, '[^a-zA-Z]', '', 'g'), 4))
  || LPAD(nextval('public.user_number_seq')::text, 3, '0')
WHERE display_id IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _name text;
  _prefix text;
  _num text;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'USER');
  _prefix := EXTRACT(YEAR FROM now())::text || UPPER(LEFT(REGEXP_REPLACE(_name, '[^a-zA-Z]', '', 'g'), 4));
  _num := LPAD(nextval('public.user_number_seq')::text, 3, '0');

  INSERT INTO public.profiles (user_id, full_name, phone, farm_name, farm_location, language, display_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'farm_name',
    NEW.raw_user_meta_data->>'farm_location',
    COALESCE(NEW.raw_user_meta_data->>'language', 'en'),
    _prefix || _num
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'consumer')
  );
  RETURN NEW;
END;
$function$;
