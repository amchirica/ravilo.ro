# Data retention — RAVILO

Periods below are **engineering defaults for review by counsel**. They are not legal advice and are not universal truth for Romania or the EU.

Configure actual values with a lawyer before processing live customer money.

| Data | Suggested starting point | Notes |
| --- | --- | --- |
| Auth sessions | Supabase Auth project settings | Server does not store passwords |
| Audit logs | 24 months | Security/ops; no secrets |
| Orders + invoices | Legal accounting retention | Do **not** physically delete fiscal records on account deletion |
| Email outbox metadata | 12 months | Template, recipient, provider id, status — not full body forever |
| Search analytics | 12 months | Term + result count; no user id |
| Abandoned carts | 90 days | Guest token hash only |
| Account deletion | Pseudonymize profile; keep order snapshots | Retention obligations first |
| Payment provider ids | Keep with the order | Never card PAN/CVV |

Account deletion request (`/cont/date`) is queued (`data_requests`). Staff process it: anonymize `profiles` PII, keep order/payment rows required for accounting.

Marketing consent is explicit and separate from checkout.
