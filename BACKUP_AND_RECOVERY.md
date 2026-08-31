# Backup și recovery — RAVILO

## Principiu

PostgreSQL este sursa de adevăr. Object storage ține media. Comenzile și plățile trebuie să poată fi reconstruite din DB + evenimentele procesatorului.

## Backup recomandat (producție)

### Bază de date

- Backup zilnic automat la provider (Supabase PITR / Neon / RDS)
- Retention minim: 14 zile; ideal 30 zile + PITR
- Backup înainte de migrații Prisma

### Storage

- Versioning pe bucket (R2 / S3)
- Nu ține fișiere esențiale pe discul instanței Next.js

### Secrete

- Nu include `.env` în backup-uri publice
- Rotire: DB password, `AUTH_SECRET` (invalidează sesiunile), Stripe, SMTP

## Restore (testat cel puțin o dată înainte de lansare)

1. Creează o instanță PostgreSQL goală.
2. Restaurează ultimul dump / PITR.
3. `npx prisma migrate deploy` dacă schema e în urmă.
4. Verifică: login admin, o comandă PAID, un produs, webhook test.
5. Pointerii de storage trebuie să coincidă cu bucket-ul restaurat.

## Comandă dump locală (dev)

```bash
docker compose exec postgres pg_dump -U ravilo ravilo > backup.sql
```

Restore:

```bash
docker compose exec -T postgres psql -U ravilo ravilo < backup.sql
```

## După incident

- Nu șterge `PaymentEvent` / `AuditLog`
- Compară plățile Stripe cu `Payment.providerPaymentId`
- Stocul se reconciliază din ledger, nu din memorie
