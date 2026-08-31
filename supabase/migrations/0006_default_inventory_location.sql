INSERT INTO public.inventory_locations (name, code, is_default, is_active)
VALUES ('Depozit principal', 'MAIN', true, true)
ON CONFLICT (code) DO UPDATE
SET is_default = true, is_active = true;
