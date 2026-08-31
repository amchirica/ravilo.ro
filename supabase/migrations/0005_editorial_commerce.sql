-- RAVILO: editorial CMS, reviews, FAQ scope, newsletter, merchandising.
-- Additive. Reuses articles (blog + guides), reviews, faq_items, pages, homepage_sections.

DO $$ BEGIN
  ALTER TYPE public.publish_status ADD VALUE IF NOT EXISTS 'SCHEDULED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.review_status ADD VALUE IF NOT EXISTS 'ARCHIVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.relation_kind ADD VALUE IF NOT EXISTS 'FREQUENTLY_BOUGHT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'WHY_RAVILO';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'REVIEWS';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'GUIDES';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.content_kind AS ENUM ('ARTICLE', 'GUIDE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.review_kind AS ENUM ('PRODUCT', 'STORE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS content_kind public.content_kind DEFAULT 'ARTICLE' NOT NULL,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS reading_time integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS author_id uuid,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE TABLE IF NOT EXISTS public.article_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '' NOT NULL,
  image_url text,
  meta_title text,
  meta_description text,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.article_category_map (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.article_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.article_related (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  related_article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0 NOT NULL,
  PRIMARY KEY (article_id, related_article_id)
);

CREATE TABLE IF NOT EXISTS public.article_categories_products (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, category_id)
);

ALTER TABLE public.reviews
  ALTER COLUMN product_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS review_kind public.review_kind DEFAULT 'PRODUCT' NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_name text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.faq_items
  ADD COLUMN IF NOT EXISTS scope text DEFAULT 'global' NOT NULL,
  ADD COLUMN IF NOT EXISTS category_label text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS template text DEFAULT 'default' NOT NULL;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS show_in_menu boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS seo_content text DEFAULT '' NOT NULL;

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL UNIQUE,
  status text DEFAULT 'subscribed' NOT NULL,
  source text DEFAULT 'footer' NOT NULL,
  consent_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;

ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS subject text;

CREATE INDEX IF NOT EXISTS articles_kind_status_idx ON public.articles (content_kind, status, published_at DESC);
CREATE INDEX IF NOT EXISTS reviews_product_status_idx ON public.reviews (product_id, status);

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON public.products USING gin (name gin_trgm_ops);
EXCEPTION WHEN undefined_object OR feature_not_supported THEN
  NULL;
END $$;

ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_category_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_related ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_categories_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.article_categories FROM anon, authenticated;
REVOKE ALL ON public.article_category_map FROM anon, authenticated;
REVOKE ALL ON public.article_related FROM anon, authenticated;
REVOKE ALL ON public.article_categories_products FROM anon, authenticated;
REVOKE ALL ON public.newsletter_subscribers FROM anon, authenticated;
