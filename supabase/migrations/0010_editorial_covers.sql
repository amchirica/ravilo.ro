-- Covers for CMS pages, plus a shop CTA on journal/guides.
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS excerpt text NOT NULL DEFAULT '';

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS cta_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cta_url text NOT NULL DEFAULT '';
