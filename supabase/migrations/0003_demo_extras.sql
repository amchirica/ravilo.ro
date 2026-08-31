-- Bundle images + unique slug for idempotent demo seed.

ALTER TABLE public.bundles
  ADD COLUMN IF NOT EXISTS image_path text;

CREATE UNIQUE INDEX IF NOT EXISTS bundles_slug_uidx ON public.bundles (slug);
