CREATE TABLE IF NOT EXISTS public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  public_order_number text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  sku text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  reason text NOT NULL,
  resolution text NOT NULL,
  package_opened boolean NOT NULL DEFAULT true,
  unused boolean NOT NULL DEFAULT false,
  iban text,
  iban_holder text NOT NULL DEFAULT '',
  street text NOT NULL DEFAULT '',
  street_number text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  county text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  return_method text NOT NULL DEFAULT 'CUSTOMER_SHIP',
  description text NOT NULL,
  photo_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'PENDING',
  admin_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS return_requests_status_idx ON public.return_requests (status, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS return_requests_email_idx ON public.return_requests (email);
--> statement-breakpoint
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON public.return_requests FROM anon, authenticated;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('returns', 'returns', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP POLICY IF EXISTS storage_returns_public_read ON storage.objects;
    CREATE POLICY storage_returns_public_read ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id = 'returns');
  END IF;
END $$;
