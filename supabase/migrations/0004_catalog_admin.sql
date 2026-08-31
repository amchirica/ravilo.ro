-- Catalog admin extras. Safe to re-run.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_sort_order_idx ON public.products (sort_order, published_at DESC);
CREATE INDEX IF NOT EXISTS categories_featured_idx ON public.categories (is_featured, sort_order);
