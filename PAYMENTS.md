# RAVILO Payments

RAVILO never stores or processes raw card numbers, CVV, or full PAN. Card collection happens on the payment provider (hosted Checkout or Payment Element).

**Supabase does not confirm payments.** A successful browser redirect is not paid. The Stripe (or mock) webhook, after signature verification, is the source of truth.

## Providers

`PaymentProvider` is an interface. Checkout, refunds, and webhooks call the interface — not Stripe types.

| Provider | Status |
| --- | --- |
| Stripe | Implemented (Checkout Sessions, sandbox-first) |
| NETOPIA Payments | Adapter interface reserved |
| EuPlatesc | Adapter interface reserved |
| PayU | Adapter interface reserved |

Adding a Romanian processor should not require rewriting checkout UI. It requires a new adapter + webhook route + settings flag.

## Money

All amounts are integer **bani**. Stripe RON uses the same minor units. Conversion to provider units is the adapter’s job.

## Lifecycle

```
CART
  → server quote (authoritative totals)
  → ORDER status = PENDING_PAYMENT
  → inventory RESERVATION (TTL, default 15 min)
  → payment session created (providerPaymentId unique)
  → customer pays at provider
  → WEBHOOK signature verified
  → PaymentEvent inserted (idempotent)
  → Payment = PAID
  → Order = PAID
  → reservation converted to SALE
  → email outbox: payment confirmed
```

Browser success URL is **not** authoritative. The confirmation page polls a server endpoint until `paymentStatus = PAID` or the reservation expires. Copy: “Confirmăm plata…”.

## Idempotency

| Event | Guard |
| --- | --- |
| Checkout create | `IdempotencyRecord` + checkout token unique on order |
| Provider session | `Payment.providerPaymentId` unique |
| Webhook | `PaymentEvent` unique `(provider, providerEventId)` |
| Inventory sale | ledger rows keyed by order id + type; skip if already sold |

Replayed webhooks return 200 after the first successful process.

## Webhooks

- Raw body as required by Stripe
- Verify signature with `STRIPE_WEBHOOK_SECRET`
- Reject invalid signatures (400)
- Do not log secret headers or full payloads with PII beyond what is needed
- Process in a DB transaction
- Email failures **do not** roll back a confirmed payment (outbox retry)

## Failure cases

| Case | Behavior |
| --- | --- |
| Declined / cancelled | Order stays `PENDING_PAYMENT` or becomes `CANCELLED`; reservation released |
| Customer closes browser after paying | Webhook still confirms; polling page eventually shows success |
| Success URL hit, webhook delayed | UI stays on “Confirmăm plata…” |
| Success URL hit, payment never succeeded | After TTL, show expired / unpaid |
| Duplicate webhook | Second event no-ops |
| Invalid signature | 400, no state change |
| Timeout / expired session | Cron releases reservation; order cancelled if still unpaid |
| Refund | Adapter calls provider; DB updates only after provider success |

## Refunds

- Server-only, permission `order.refund`
- Confirmation in Admin UI
- Full or partial
- Never mark refunded in DB without provider acknowledgement (except explicitly recorded manual/offline methods, which are separate and audited)
- Order/payment status: `REFUNDED` or `PARTIALLY_REFUNDED`
- Audit log + email

## Stock

- Reservation at checkout start
- Sale on paid webhook
- Release on expiry / cancel / failed payment
- Concurrent checkouts: only one reservation can succeed when `available = 1`

## Live mode (production)

`sk_live_` is accepted only when `NODE_ENV=production`. Localhost must use `sk_test_`.

Production env:

```
NODE_ENV=production
APP_URL=https://ravilo.ro
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Stripe Dashboard (Live) → Developers → Webhooks → Add endpoint:

`https://ravilo.ro/api/webhooks/stripe`

Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `payment_intent.payment_failed`, `charge.refunded`.

Checkout Sessions use dynamic `price_data` (no Stripe Product/Price catalog). Reservation TTL is aligned to Stripe’s 30-minute minimum. CSP `form-action` allows `https://checkout.stripe.com`.

## Test mode

Use Stripe test keys only in development. Never put live secrets in `.env.local`. Test cases:

1. Successful payment
2. Decline
3. Customer cancelled
4. Session timeout
5. Duplicate webhook
6. Paid but browser closed
7. Browser success, webhook missing (until poll/webhook)
8. Full refund
9. Partial refund

## PCI

SAQ A-oriented design: no card fields on ravilo.ro origin except provider iframes/hosted pages allowed by CSP.
