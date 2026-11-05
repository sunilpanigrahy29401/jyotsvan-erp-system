# 02 — Feature Completeness Matrix (Step 3)

Status: **A\*** real backend + DB in code, *not executed by me* (UNVERIFIED at runtime) · **B** UI-only / browser storage / hard-coded / simulated · **C** partial · **D** not started. No row is plain "A": I cannot honestly call anything "working" without running it against a database. "Backend real?" = server code with logic (Y/partial/N). "DB persisted?" = writes to PostgreSQL (Y/N/browser). Evidence = path or function; "(search)" = nothing found by keyword search, verify with `graphify query`.

## Module scorecard (conservative; business-logic % = my confidence the rules are right)
| Module | UI % | Backend % | DB % | Logic correct % | Headline |
|---|---|---|---|---|---|
| Auth / sessions | 70 | 5 | 20 | 0 | login accepts anyone when cloud login fails |
| RBAC / roles | 60 | 5 | 50 | 5 | tables + seed exist, enforced only in browser |
| Multi-tenancy / platform admin | 20 | 10 | 60 | 5 | column exists, nothing enforces it |
| Settings (org/branch/users/roles) | 85 | 0 | 0 | 30 | all browser localStorage |
| Finance & accounting | 70 | 55 | 55 | 30 | invoices/payments yes; no books |
| Sales & order mgmt | 70 | 65 | 70 | 55 | no quotation; invoice link weak |
| CRM | 55 | 50 | 65 | 35 | has 4 type errors; no email/tickets |
| Manufacturing | 75 | 65 | 70 | 55 | no MRP, BMR, job work |
| Inventory & warehouse | 85 | 80 | 80 | 65 | strongest module |
| Procurement | 75 | 65 | 70 | 55 | no RFQ, 3-way match |
| HRMS | 75 | 65 | 70 | 40 | PT wrong, TDS manual, no statutory files |
| Partner network mgmt | 75 | 65 | 70 | 50 | distributors/C&F/retailers real |
| Partner portals | 0 | 0 | 0 | 0 | none (no partner login model) |
| Field sales | 65 | 55 | 60 | 45 | desktop UI, no offline/PWA/photo |
| WhatsApp | 5 | 0 | 5 | 0 | settings card only |
| Omnichannel inbox | 0 | 0 | 0 | 0 | none |
| Email/notifications | 40 | 40 | 60 | 30 | in-app only; no SMTP/SMS/push sending |
| AI | 50 | 45 | 50 | 20 | invents numbers on failure |
| Marketing/ads analytics | 70 | 55 | 65 | 35 | simulated unless real tokens |
| E-commerce/marketplaces | 65 | 50 | 60 | 30 | simulated sessions; settlements not posted |
| Dashboards/analytics | 55 | 40 | 40 | 30 | no report builder |
| Platform (jobs, API keys, i18n, import/export) | 15 | 10 | 20 | — | mostly missing |

## 5.1 Finance & Accounting (India)
| Feature | St | Evidence | Backend | DB | Notes / missing |
|---|---|---|---|---|---|
| Invoices (GST tax invoice) | C | `finance-service.ts:223-380` createInvoice; tables `invoices`,`invoice_items` | Y | Y | CGST/SGST vs IGST split correct in principle; default rate 18%; **no per-line HSN master validation**; rounding to 2 dp only at grand total (`:365`) |
| Place of supply | C | `pricing-service.ts:61-101` compares warehouse state vs customer state | Y | Y | simple state compare; no SEZ/export/RCM/composition |
| HSN/SAC | C | `migrate-finance.ts:149` default `'330499'`, `migrate-product-master.ts:190` fallback `'HSN-8413'` | partial | Y | **fallback HSN `HSN-8413` is not a valid HSN-style code for hair oil (3305)**; no HSN master |
| Payments, allocations, collections | A\*/C | `payments`,`payment_allocations`,`collections` | Y | Y | |
| Credit/debit notes | A\*/C | `credit_notes`,`debit_notes` | Y | Y | GST-linked treatment UNVERIFIED |
| Customer sub-ledger | C | `finance_transactions` (debit, credit, running_balance), 5 insert sites in `finance-service.ts` | Y | Y | party ledger only — **not double-entry** |
| Chart of accounts, journal/contra/receipt/payment vouchers, trial balance, P&L, balance sheet, day book | D | (search) no `accounts`/`journal` tables in `01b` | N | N | the biggest gap |
| Auto-posting from sales/purchases/payroll/stock | D | no posting engine | N | N | |
| Bank accounts, reconciliation, cheques, UPI QR | D | (search) | N | N | Razorpay = settings card |
| E-invoice IRN/QR | B | `invoice-preparation-service.ts` builds a payload only | N | N | no IRP/GSP call |
| E-way bill | B | `eWayBillNumber` typed into a field (`sales-order-routes.ts:307`) | N | partial | no generation/cancel/update |
| GSTR-1/3B, 2A/2B, ITC | D | (search) | N | N | |
| TDS/TCS (non-payroll), challans, 26Q | D | (search) | N | N | |
| Fixed assets & depreciation | D | (search) | N | N | |
| Expenses, petty cash | C | `expenses`,`expense_categories` | Y | Y | claims workflow/accounting link missing |
| Budgeting, cash-flow forecast | D | | N | N | |
| Financial statements, FY close, period lock | D | only `fiscal_year_start_month` setting (`db.ts:240`) | N | N | |
| Multi-currency/forex | D | (search) | N | N | |
| Rewards liability, scheme/trade-promotion accounting | D | | N | N | |
| Audit trail / auditor role | C | `audit_logs` | Y | Y | actor client-supplied |

## 5.2 Sales & Orders
| Feature | St | Evidence | Backend | DB | Notes |
|---|---|---|---|---|---|
| Sales order create/approve/dispatch | A\*/C | `sales-order-service.ts`, `sales-order-routes.ts`; `fulfillment-service.ts` | Y | Y | pricing+credit+reservation chain |
| Quotation / proforma | D | quotation only in procurement/suppliers (search) | N | N | |
| Price lists, tiers, schemes | C | `pricing-service.ts`, distributor price tables | Y | Y | buy-X-get-Y / slab schemes UNVERIFIED |
| Credit limit check/hold | A\*/C | `credit-service.ts` | Y | Y | |
| Partial delivery / backorder / split | C | dispatch items tables | partial | Y | UNVERIFIED |
| Returns/replacement/damage | A\*/C | `sales-return-service.ts` | Y | Y | credit-note link UNVERIFIED |
| Invoice from SO | C | `createInvoice({salesOrderId})` optional param | partial | Y | no automatic conversion found |
| Delivery challan, packing slip, LR/courier tracking | C | transporter/LR fields in dispatch | partial | Y | no courier API |
| Recurring orders, reorder suggestions | D | (search) | N | N | |
| Beat/territory | C | field-sales + distributor territory columns | Y | Y | |
| Targets & incentives | C | `employee_targets` (HR), field-sales targets | partial | Y | no incentive calc → payroll |
| D2C returns/RTO | B | marketplace tables only | N | partial | |

## 5.3 CRM
| Feature | St | Evidence | Backend | DB | Notes |
|---|---|---|---|---|---|
| Leads/contacts/accounts/deals, stages | C | `crm-service.ts` (convertLead `:413`), 19 `crm_*` tables | Y | Y | **type errors in UI wiring** |
| Lead capture (web, Meta, Google, IndiaMART) | B/C | `crm-routes.ts:255` webhook; `source` values | partial | Y | no IndiaMART API/CRM-push/email-parse logic found |
| Dedup, scoring, round-robin | C | `crm_lead_status_history`; scoring/assign UNVERIFIED | partial | Y | |
| Tasks/calls/meetings, calendar sync | C/D | activities UI; no calendar/telephony | partial | Y | |
| Email 2-way, sequences, tracking | D | | N | N | |
| WhatsApp/SMS campaigns | D | | N | N | |
| Quotation builder, e-sign | D | | N | N | |
| Customer 360 | D | (search) | N | N | |
| Workflow automation / webhooks | D | | N | N | |
| Helpdesk/tickets/SLA/CSAT/KB | D | (search `ticket`: 0 hits) | N | N | |
| Partner CRM (KYC, visits) | C | retailer/distributor onboarding | Y | Y | |
| Loyalty/rewards | D | (search) | N | N | |
| DPDP consent/unsubscribe | D | | N | N | |

## 5.4 Manufacturing
| Feature | St | Evidence | Backend | DB | Notes |
|---|---|---|---|---|---|
| Multi-level BOM, versions | A\*/C | `formulation-service.ts`, `migrate-formulations.ts` | Y | Y | |
| Work orders, issue/consume/receive | A\*/C | `production-service.ts` writes `inventory_movements`/`balances` (`:54-1071`) | Y | Y | row locking present |
| Batch/lot traceability, expiry, FEFO, recall | A\*/C | `batch-service.ts`, genealogy tables | Y | Y | FEFO allocation logic UNVERIFIED |
| QC incoming/in-process/final, COA, hold/release | A\*/C | `quality-service.ts`, 8 qc tables | Y | Y | CAPA/deviation thin |
| MRP / planning / capacity / work centres | D | (search; routing mentions minimal) | N | N | |
| BMR / packing record / cosmetics licence / label compliance | D | (search) | N | N | |
| Sun-infusion process steps | D | not modelled (search) | N | N | |
| Packaging, GS1/barcode/serialisation | D | | N | N | |
| Costing (std vs actual, yield) | C | cost columns in production | partial | Y | GL posting none |
| Job work / subcontract / ITC-04 | D | | N | N | |
| Maintenance | C | minimal | partial | partial | |
| Production dashboards | C | batch/production UIs | Y | Y | OEE none |

## 5.5 Inventory & Warehouse
| Feature | St | Evidence | Notes |
|---|---|---|---|
| Item/SKU master, variants, UoM, HSN, barcode | A\*/C | `product-routes.ts`, `migrate-product-master.ts` | UoM conversions UNVERIFIED |
| Multi-warehouse, bins, transfers, adjustments, counts | A\*/C | `warehouse-service.ts` (2,070 lines), transfer/count routers | |
| Real-time, reserved, in-transit stock, by batch/expiry | A\*/C | `inventory-service.ts`, `stock_reservations` | |
| Reorder levels → auto PR | C | reorder columns; auto-PR UNVERIFIED | |
| GRN → QC → putaway; picklist/pack/dispatch | A\*/C | `procurement-service.ts:1369-1650`, fulfillment | barcode scanning D |
| Valuation FIFO/WAC, ageing, ABC | C/D | UNVERIFIED | |
| Secondary stock (distributor/C&F/franchise) | C | `distributor-inventory-service.ts`, C&F | franchise D |
| Marketplace stock sync | B | simulated clients | |
Backend/DB real: Y/Y for all A\*/C rows.

## 5.6 Procurement
| Feature | St | Evidence | Notes |
|---|---|---|---|
| Vendor master, KYC docs, ratings | A\*/C | `supplier-routes.ts` (25), supplier docs | GSTIN validation UNVERIFIED |
| PR → PO → GRN → bill → payment | C | purchase_requests/orders/goods_receipts | **vendor bill/payment: not found** |
| RFQ & quotation comparison, 3-way match | D | (search: 0) | |
| Approvals, blanket orders, landed cost, returns | C/D | approval fields; rest D | |
| Vendor portal | D | | |

## 5.7 HRMS
| Feature | St | Evidence | Notes |
|---|---|---|---|
| Employee master, docs, org chart, onboarding/exit | A\*/C | `people-service.ts`, 24 tables | |
| Attendance (web check-in, shifts, regularisation) | C | `attendance_*` tables | GPS/selfie/biometric UNVERIFIED/D |
| Leave, holidays | A\*/C | leave tables/UI | accrual rules UNVERIFIED |
| Payroll India | C | `hrms-payroll-service.ts:340-400` | **EPF 12% capped ₹15k and ESI 0.75%/3.25% ≤₹21k implemented; PT flat ₹200 (wrong — state slabs); TDS = manually entered monthly amount (no slab/regime calc); no LWF, arrears, bonus, gratuity, F&F, Form 16/24Q, ECR/ESI files, bank file**; "present days = 0 → pay full month" shortcut |
| Loans/advances, claims | C/D | UNVERIFIED | no accounting link |
| Recruitment/ATS | D/C | minimal | |
| Performance (OKR/appraisal/360) | C | `PerformanceScorecards.tsx` | |
| Field-staff TA/incentive | D | | |
| Training, assets, helpdesk, policies | C/D | announcements/policies partial | |
| ESS/MSS | C | `EmployeeSelfService.tsx` | |

## 5.8–5.10 Partners, portals, field sales
| Feature | St | Notes |
|---|---|---|
| Hierarchy Company→C&F→Distributor→Retailer | A\*/C | cf/distributor/retailer modules (3.8k–4.4k UI lines each) |
| Onboarding/KYC/agreements/credit terms/approvals | A\*/C | |
| Partner price lists, schemes, margins | C | |
| Claims & settlements (scheme/damage/expiry) | C/D | claims partial; settlement→credit note UNVERIFIED |
| Primary/secondary/tertiary sales reporting | C | |
| Partner scoring/tiers | D | |
| **Partner self-service portals (login, order, ledger, rewards)** | **D** | no partner identity model; UI is internal-staff only |
| Rewards/points | D | |
| Franchise POS / accounting-lite / inventory | D | |
| Field sales: assigned territory, beat, check-in GPS, visit, order-on-behalf, collection | C | `field-sales-service.ts` calls `SalesOrderService.createOrder` (`:1096`) — real link |
| Field PWA, offline sync, photo, new-retailer KYC, TA claims | D | |

## 5.11–5.13 Communications
| Feature | St | Evidence |
|---|---|---|
| WhatsApp Cloud API/BSP, templates, automations, bot | D→B | only provider card `migrate-integrations.ts:217` |
| Omnichannel inbox / Chatwoot | D | (search) |
| Email via SES/SendGrid/etc, templates, drips | D→B | SMTP card `:658`; no sending code (search `nodemailer`: none) |
| Notification center (in-app) | C | `notification-service`, 4 tables; no websocket/push |

## 5.14–5.18
| Feature | St | Evidence / notes |
|---|---|---|
| AI copilot / insights / recommendations / approvals | C | `ai-*.ts`; invented fallback numbers; unauth endpoints |
| Customer chatbot (RAG), OCR, forecasting, anomaly | D | (search) |
| Meta/Google Ads connectors + ROAS dashboards | B/C | `meta-service.ts`, `google-ads-*`; sandbox simulation when token placeholder (`meta-client.ts:55`); lead→revenue attribution via accounting D |
| Shopify | C | orders → `sales_orders` (`shopify-service.ts:495`) is a real link; real API calls UNVERIFIED |
| Amazon / Flipkart / Myntra | B | `marketplace_orders` only (not `sales_orders`); simulated tokens (`amazon-client.ts:71,101`, `flipkart-client.ts:60`); settlements stored (`marketplace_settlements`) but **no accounting posting** |
| Shipping aggregators, COD remittance, payment-gateway recon | D | Shiprocket/Razorpay = settings cards |
| Dashboards per domain | C | most modules have one; **report builder, scheduled reports, saved views, role-based dashboards D** |
| Platform: custom fields, workflow engine, import/export validator, number series, API keys/webhooks, global search backend, file storage, i18n, background jobs | D (search) | `GlobalSearchModal` UI exists; no job queue |

## Features present in code but NOT in the PRD
| Extra | What it is |
|---|---|
| Command Center | executive landing dashboard |
| Integration engine + provider catalog | generic connector registry with encrypted credential vault (AES-256-GCM) |
| Myntra connector | PPMP marketplace (PRD lists as optional) |
| AI "controlled actions" | human-in-the-loop action approvals (`ai_actions`) |
| Batch genealogy / recall UI | deeper than PRD asks |
| Formulation scaling workbench | BOM scale-up tool |
| Distributor transfers & distributor inventory | secondary stock moves |
| Retailer assortments / follow-ups | beyond PRD |
| Audit-log viewer, design-system showcase page, notification-publish modal | internal tools |
| Stale AI-Studio prompts | `public/assets/aistudio/*` (not code) |
