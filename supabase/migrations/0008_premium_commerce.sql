-- Premium storefront: collections merchandising, bestsellers override, banners, search.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_best_seller_manual boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS editorial_html text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS text_en text,
  ADD COLUMN IF NOT EXISTS style text NOT NULL DEFAULT 'band';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.store_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  image_path text,
  cta_label text NOT NULL DEFAULT '',
  cta_url text NOT NULL DEFAULT '',
  placement text NOT NULL DEFAULT 'homepage',
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.search_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  term text NOT NULL,
  synonym text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.search_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  query text NOT NULL,
  target_type text NOT NULL,
  target_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.search_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  query text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE public.store_banners ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.search_boosts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.search_promotions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON public.store_banners FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON public.search_synonyms FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON public.search_boosts FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON public.search_promotions FROM anon, authenticated;
