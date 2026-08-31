# Manual Admin RAVILO

Adminul este centrul de control. Storefront-ul afișează doar ce publici aici.

URL: `/admin`

## Roluri

- STAFF — citire
- EDITOR — conținut
- MANAGER — catalog, stoc, comenzi, reduceri
- ADMIN — utilizatori (nu SUPER_ADMIN)
- SUPER_ADMIN — tot, inclusiv MFA obligatoriu recomandat

Permisiunile se verifică pe server. Ascunderea unui buton nu este autorizare.

## Produse

- Prețurile se salvează în bani (199.99 RON = 19999)
- `costPrice` nu apare niciodată în magazin
- Variantele au SKU propriu
- Stocul se urmărește per variantă × depozit
- Nu hardcoda produse în frontend

## Categorii și colecții

- Categorii: ierarhie (Auto → Încărcare)
- Colecții: merchandising (RAVILO Picks, New Arrivals)

## Homepage și navigație

- Secțiuni enable/disable
- Hero, categorii, picks, editorial, jurnal, newsletter — din CMS
- Meniuri header / mobile / footer

## Comenzi

- Snapshot: dacă schimbi produsul mâine, comanda veche rămâne
- Statusul de plată vine din procesator, nu din browser
- Refund-ul cere permisiune `order.refund` și confirmare

## Inventar

- Disponibil = cantitate − rezervat
- Checkout rezervă stoc ~15 minute
- Cron-ul eliberează rezervările expirate
- Ledger-ul arată cine a modificat stocul

## Reduceri

Toate regulile se evaluează pe server. Codul din browser este doar un input.

## Setări

Nume magazin, CUI, prag transport gratuit, prefix comenzi, social, SEO implicit.

Nu inventa date legale. Până le completezi, storefront-ul afișează placeholder.

## Audit

Logurile sunt read-only. Nu există ștergere din UI.

## SEO

Fiecare produs, categorie, colecție, pagină și articol are title / description / canonical.
