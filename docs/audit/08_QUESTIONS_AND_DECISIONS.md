# 08 — Questions and Decisions for You

Answer what you can; "don't know" is a valid answer and I will propose a default. Items marked 🔴 block work in the phase shown.

## A. About what exists (needed in Phase 0)
1. 🔴 **Who owns the InsForge project?** Is there a *real* database behind it today, and does it contain real company data, or only the demo rows the migrations seed? (Decides whether we can freely reset/migrate.)
2. 🔴 Can you give a **read-only** database user (or a copy/dump) so I can verify the live schema, row counts and which demo rows exist? Never the production write credentials.
3. Is the app (or any version of it) already used by staff/partners, or is it still a demo?
4. Which login do you actually use today — InsForge accounts, or the "any email" fallback? (We are removing the fallback.)
5. Are the Meta / Google / Shopify / Amazon / Flipkart / Myntra credentials in the settings **real**? (If yes, they must be rotated: they were stored with a hard-coded key.)
6. Where is it hosted now (AI Studio preview only?) and who has access to the repo, InsForge and Gemini accounts?

## B. Platform decisions
7. 🔴 **Keep InsForge** (managed Postgres + auth) or move to plain managed Postgres + our own auth? Requirement: it must allow Row-Level Security with per-request tenant setting and server-side JWT verification. (My default: keep InsForge for identity if it passes a 1-day spike, else move.)
8. 🔴 Hosting preference and **data residency** (India region?) and monthly infrastructure budget.
9. Will future tenants be **your group companies only** or **external paying customers**? (Affects billing/plans, isolation strictness, support tooling.)
10. Team: who will work on this (you + Claude Code only, freelancers, a team)? Affects task sizing and review process.

## C. Accounting & compliance (Phase 2–3)
11. 🔴 **GSP/IRP provider** for e-invoice and e-way bill (ClearTax, Masters India, Cygnet, other) and API budget. Sandbox credentials needed.
12. Current accounting system (Tally Prime? Zoho? Excel?) and **cut-over date**; do you want to run in parallel for a few months?
13. How many **legal entities and GSTINs** now and in 2 years? Do franchises keep **separate books** (own GSTIN/legal entity) or lite books under the parent? (PRD Q3.)
14. Inventory valuation method (FIFO or weighted average)? Financial-year (Apr–Mar assumed).
15. Do you export (forex)? Composition scheme? Any SEZ/RCM cases? TDS/TCS applicable sections?
16. Who is your accountant/CA who can **sign off** the chart of accounts and test cases?

## D. Business rules
17. 🔴 **Reward points logic**: earn per rupee or per SKU? tiers? expiry? redemption catalogue? who funds it (liability accounting)?
18. Scheme types you really run (buy X get Y, slab discount, cash discount, free goods) and how claims are settled (credit note vs payment).
19. Pricing structure: MRP / PTR / PTS / PTD per partner type — sample price list please.
20. Credit-limit policy: hard block or approval override, and by whom?
21. Approval chains (discount %, PO value, expense, leave, price change): who approves at what thresholds?
22. Payroll: states of operation (for Professional Tax slabs), PF/ESI applicability policy, tax regime default, pay cycle, bonus/gratuity policy, sample payslip.
23. Cosmetics compliance: manufacturing licence details, label formats, BMR template, sun-infusion process parameters (duration, tank, conditions) and QC test parameters.
24. Territories: structure (state/district/pin?) and how field staff are assigned.

## E. Channels & integrations
25. 🔴 **WhatsApp**: direct Cloud API or a BSP (Gupshup / Twilio / 360dialog / Interakt)? Existing numbers? Approved templates?
26. Email provider (SES, SendGrid, Mailgun, Zoho) and sender domain; SMS provider.
27. Marketplaces actually live: Shopify store, Amazon seller account, Flipkart, Myntra? Which first? Shipping aggregator (Shiprocket/Delhivery) and payment gateway (Razorpay/PayU/Cashfree)?
28. IndiaMART account/API plan for lead push; Meta/Google ads accounts and who can authorise OAuth.
29. Chatwoot: OK to self-host? Which channels first (WhatsApp, Instagram, Facebook, website, email)?
30. Hardware: barcode scanners, printers, POS devices, biometric attendance devices?

## F. Priorities
31. 🔴 **Module priority order and the target go-live date for release 1** (my default: foundation → accounting/GST → operations hardening → partner portal → HR statutory → CRM/WhatsApp → franchise → AI).
32. Which 2–3 workflows must work *perfectly* first (e.g., stock → sales order → GST invoice → payment)?
33. Languages: English + Hindi enough? Any regional language for field staff/partners?
34. Acceptance: who will do user-acceptance testing, with what real sample data?

## G. Decisions I will take by default unless you object
Keep the Vite/React UI · keep Node/TypeScript · Postgres RLS for tenancy · Postgres outbox + pg-boss for jobs · Chatwoot for inbox · GSP for e-invoice (no direct IRP) · no code copied from GPL/AGPL projects · demo data only in a dev seed script · all integrations show an explicit LIVE/SANDBOX badge.
