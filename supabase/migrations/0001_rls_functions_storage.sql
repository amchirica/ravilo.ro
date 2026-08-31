-- RAVILO: RLS, grants, auth trigger, inventory functions, storage.
-- Apply AFTER 0000_init.sql
-- App uses service role (bypasses RLS). RLS protects PostgREST anon/authenticated.

-- Identity link (Supabase Auth)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    ALTER TABLE public.profiles
      DROP CONSTRAINT IF EXISTS profiles_id_fk;
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fk
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    NEW.raw_user_meta_data->>'phone',
    'CUSTOMER',
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'ACTIVE'::user_status ELSE 'PENDING_VERIFICATION'::user_status END
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.profiles.first_name),
        last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), public.profiles.last_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('role', true) IN ('authenticated', 'anon') THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Cannot change role or status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

CREATE OR REPLACE FUNCTION public.reserve_inventory(p_variant_id uuid, p_location_id uuid, p_qty integer)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.inventory_levels
  SET reserved_quantity = reserved_quantity + p_qty
  WHERE variant_id = p_variant_id
    AND location_id = p_location_id
    AND (quantity - reserved_quantity) >= p_qty
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'insufficient_stock';
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_inventory(p_variant_id uuid, p_location_id uuid, p_qty integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.inventory_levels
  SET reserved_quantity = GREATEST(reserved_quantity - p_qty, 0)
  WHERE variant_id = p_variant_id AND location_id = p_location_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_inventory_sale(p_variant_id uuid, p_location_id uuid, p_qty integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.inventory_levels
  SET quantity = quantity - p_qty,
      reserved_quantity = reserved_quantity - p_qty
  WHERE variant_id = p_variant_id
    AND location_id = p_location_id
    AND reserved_quantity >= p_qty
    AND quantity >= p_qty;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory_confirm_failed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_inventory(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_inventory(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_inventory_sale(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.order_sequence (id, last_number) VALUES (1, 1)
  ON CONFLICT (id) DO UPDATE SET last_number = public.order_sequence.last_number + 1
  RETURNING last_number INTO n;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.next_order_number() FROM PUBLIC, anon, authenticated;

-- Enable RLS on all public tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Default: revoke table access from anon/authenticated (PostgREST)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Profiles: own row only; cannot update role/status (trigger + WITH CHECK)
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()));

-- Addresses
CREATE POLICY addresses_own ON public.addresses
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Wishlist
CREATE POLICY wishlist_own ON public.wishlist_items
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Orders: authenticated can SELECT own only. Guests have no policy (server token only).
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY order_items_select_own ON public.order_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.profile_id = auth.uid()));
CREATE POLICY order_history_select_own ON public.order_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.profile_id = auth.uid()));

-- Reviews: public approved; owner sees own
CREATE POLICY reviews_select_approved ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (status = 'APPROVED' OR profile_id = auth.uid());
CREATE POLICY reviews_insert_own ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() AND status = 'PENDING');
CREATE POLICY reviews_update_own_pending ON public.reviews
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() AND status = 'PENDING')
  WITH CHECK (profile_id = auth.uid() AND status = 'PENDING');

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE ON public.reviews TO authenticated;

-- Catalog is served via server DTOs (hides cost_price / supplier). No anon SELECT on products.

-- Storage buckets (no-op if storage schema is absent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES
      ('products', 'products', true),
      ('cms', 'cms', true),
      ('journal', 'journal', true),
      ('avatars', 'avatars', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    CREATE POLICY storage_public_read ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id IN ('products', 'cms', 'journal', 'avatars'));
    CREATE POLICY storage_avatar_write ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    CREATE POLICY storage_avatar_update ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
