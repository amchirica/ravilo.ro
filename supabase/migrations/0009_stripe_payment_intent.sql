-- Optional Stripe payment intent id for refunds/admin (session id remains provider_payment_id).
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider_payment_intent_id text;
--> statement-breakpoint
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;
