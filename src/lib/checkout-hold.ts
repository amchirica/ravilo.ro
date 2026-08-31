/** Stripe Checkout expires_at must be 30 minutes–24 hours from now. */
export const STRIPE_MIN_HOLD_SECONDS = 30 * 60;
export const STRIPE_MAX_HOLD_SECONDS = 24 * 60 * 60;

export function checkoutHoldSeconds(reservationMinutes: number): number {
  const requested = Math.max(1, Math.floor(reservationMinutes)) * 60;
  return Math.min(STRIPE_MAX_HOLD_SECONDS, Math.max(STRIPE_MIN_HOLD_SECONDS, requested));
}

export function stripeLocale(locale: string): "ro" | "en" {
  return locale.toLowerCase().startsWith("en") ? "en" : "ro";
}
