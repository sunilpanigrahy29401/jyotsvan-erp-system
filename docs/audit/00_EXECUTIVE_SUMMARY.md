# 00 — Executive Summary (plain language)

Audit date 2026-11-05 · repo commit `bb842e8` (+ docs) · method: read-only code review, `tsc`, `vite build`, static parsing. **Nothing was run against a real database or with real credentials**, so nothing below is "proven working"; everything is "present in code" unless stated.
Status key used everywhere: **A\*** real backend + real database in code, never executed by me (UNVERIFIED at runtime) · **B** looks real but is UI-only / browser-storage / hard-coded / simulated · **C** partly built · **D** not started.

## What you actually have
A large, good-looking **prototype**: ~105,000 lines of screens (React) and ~79,000 lines of server code (Express + PostgreSQL), 227 database tables declared, ~700 API URLs. It is strongest in **warehouse/inventory, purchasing, quality control, batches, distribution (C&F / distributors / retailers), sales orders and HR**. It is weakest exactly where an ERP must be trustworthy: **login, security, accounting, tax filing, and anything that talks to the outside world** (WhatsApp, e-invoice, shipping, payment, marketplaces).

## Real vs fake (short version)
| Area | Verdict |
|---|---|
| Operations screens + server logic (stock, GRN, production, QC, batches) | **A\*** — real SQL, stock ledger, row locking. Never run by me |
| Distribution, retailers, field sales, sales orders, returns | **A\*/C** |
| HR + payroll | **C** — attendance/leave/payslips real; PF/ESI roughly right, **professional tax wrong (flat ₹200)**, TDS is typed by hand |
| Finance | **C** — invoices, payments, credit notes, GST split exist; **no real accounting books** (no chart of accounts, no journal, no profit & loss, no balance sheet) |
| Login & user/role/branch settings | **B** — **runs in the browser** (see risk #1) |
| E-invoice, e-way bill, GST returns, TDS filing, bank reconciliation | **D / stub** |
| WhatsApp, inbox, email, shipping, payment gateways | **D** (only a settings card) |
| Shopify / Amazon / Flipkart / Myntra / Meta / Google Ads | **B/C** — code exists but silently switches to **fake data** when keys are missing, even after a failed live login on Amazon |
| AI assistant | **C** — real Gemini call on the server, but **returns invented sales numbers** if the database lookup fails |
| Partner portals, rewards, franchise POS, helpdesk, MRP, offline mobile app | **D** |
| Multi-tenancy | **C/B** — tables carry `organization_id`, but nothing enforces it |
| Tests / CI / backups / monitoring | **D** — zero tests |

## Overall completion against your PRD (conservative)
- **Screens / UI present:** ~45% of PRD scope. **Server logic present:** ~30%. **Database present:** ~35%. **Correct and safe enough to use with real money/data: ~5–10%.**
- Blended "how much of the PRD is truly done": **~20%** (breadth is wide, depth and trust are thin).

## Top 10 risks (details in `04_SECURITY_AND_RISKS.md`)
1. **Anyone can log in as anyone.** If the cloud login fails or isn't configured, the app accepts **any email and any password**, creates the user, and makes any email containing "admin" a super-admin (`src/services/auth.ts:105-190`). Permissions are decided in the browser.
2. **The server has no authentication at all.** ~700 URLs trust headers/parameters sent by the browser, including which company's data to read. Anyone who can reach the server can read or change everything.
3. **A public URL runs any SQL you send** (`POST /api/db/query`) and another re-runs all database migrations (`/api/db/init`).
4. **Company/user/role/branch settings live in the browser's localStorage** (`src/services/database.ts`), not in the database — a second, disconnected copy of "who exists".
5. **No accounting core**: the PRD's central promise (every sale/purchase/payroll posts balanced entries) cannot work yet.
6. **Fake data masquerades as real**: integrations fall back to simulated sessions; AI tools return hard-coded revenue (₹48.5 lakh / 1,420 orders) on failure; migrations run ~293 INSERT statements on every boot (some seed demo invoices and marketplace orders) into the live database.
7. **Passwords-grade secrets handled loosely**: hard-coded encryption key fallback; database SSL checks disabled; Vite is set to expose every `INSFORGE_*` variable (including database URL and service-role key) to the browser in dev mode.
8. **Compliance is a placeholder**: no e-invoice/e-way bill generation, no GSTR data, wrong/partial payroll statutory rules.
9. **Nothing is tested** and the database schema is created by code on every server start (no versioning, no rollback).
10. **Two different tenant IDs** (`org-jyotsvan-corp` in 154 places, `org-jyotsvan-core` in the Meta ads code) — Meta data can silently land under a tenant that does not exist.

## Recommendation (details in `06_RECOMMENDED_ARCHITECTURE.md`)
**Do not restart from zero, and do not extend as-is.** Choose **"keep the screens and the operations/distribution business logic, rebuild the foundation underneath"**:
- **Rewrite now (4–8 weeks, blocks everything):** login & session, server-side permissions, tenant isolation (database-level), audit log, settings persistence, secrets handling, migration runner.
- **Build new (the real gap):** accounting core + GST/e-invoice/e-way bill, event/outbox + job runner, partner identity, rewards, WhatsApp, inbox (Chatwoot).
- **Keep and harden:** inventory, procurement, QC, formulation/production/batches, distribution, sales orders, HR, design system, most pages.
- **Quarantine until real:** every integration "sandbox" path and all demo seeding.
Rough effort to reach PRD phases 1–5 with a small team: **9–14 months**; a full restart would not be faster because ~180k lines of reusable breadth would be rewritten, but it would be cleaner. Hence: refactor-in-place with a strict new foundation.

## Decisions I need from you → `08_QUESTIONS_AND_DECISIONS.md`
Most urgent: who owns the InsForge project/database and is there real data in it; GST/e-invoice provider (blocks compliance); WhatsApp provider; reward-point rules; franchise accounting model.
