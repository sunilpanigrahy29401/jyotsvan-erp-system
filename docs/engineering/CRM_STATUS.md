# CRM module — status against PRD §5.3

Verified 2026-11-05 on a Postgres built from the migrations (`0001`–`0007` + legacy set): `npx tsc --noEmit` clean, `npm run build` OK,
`npx vitest run` 71/71 (20 are CRM, in `tests/integration/crm.test.ts`), and a browser walkthrough (create lead → duplicate prompt →
log call → assign → convert → Customer 360) against the running server. **The live InsForge database has not been touched:
migrations `0006` and `0007` must be applied by a human (`npm run db:migrate`, see OPERATIONS_RUNBOOK §2b).**

Legend: ✅ done and tested · 🟡 partly done (what is missing is stated) · ❌ not done (why)

## Backend connection
- Router `crmRouter` is mounted at `/api/crm` in `src/server/app.ts`, behind authentication → tenant forcing → `crm.*` permission checks
  (`src/server/core/permission-map.ts`). Every handler takes tenant and actor from `req.auth` (`crm-http.ts: ctx`), never from headers/body.
- The old `crm-service.ts` (header-trusted, `COUNT+1` numbering, hard-coded `emp-007`) is deleted; the logic now lives in `crm-*.ts`.
- Frontend (`src/services/crmApi.ts`) sends no identity; the session wrapper (`src/lib/session.ts`) adds the bearer token.
- Two endpoints are public by design, each with its own verification: `POST /api/crm/webhooks/inbound` (`x-ingest-key`, constant-time) and
  `GET|POST /api/crm/public/unsubscribe` (HMAC-signed, expiring token; GET never changes state).

## PRD §5.3 line by line
| PRD item | Status | Notes |
|---|---|---|
| Leads, contacts, accounts, deals | ✅ | Full create/read/update/archive(+restore); soft delete; GSTIN/PAN validation; duplicate checks on phone/e-mail/GSTIN |
| Custom fields | ✅ | Per entity (lead/contact/account/deal), typed + required + select options, validated server-side |
| Custom pipelines / stages | ✅ | Create/rename/deactivate/delete pipelines; add/edit/reorder/delete stages; won/lost stage flags; probability |
| Lead capture: web form | ✅ | Public keyed endpoint; consent tick recorded |
| Lead capture: IndiaMART | 🟡 | CRM-push payload ✅ and CSV import ✅. **Not done:** polling the Lead Manager API, e-mail parsing |
| Lead capture: Meta Lead Ads, Google Ads | 🟡 | Payload shapes (`field_data`, `user_column_data`) are parsed and de-duplicated by external id. **Not done:** fetching the lead from the Graph API after Meta's id-only webhook, OAuth, signature verification of Meta/Google callbacks (needs their app secrets) — use a relay or the shared ingest key today |
| Lead capture: TradeIndia / JustDial / WhatsApp | ❌ | Optional per PRD; WhatsApp needs a provider account |
| Lead capture: manual, CSV | ✅ | CSV with forgiving headers, duplicate/error report, import history. **Excel (.xlsx) not done** |
| De-duplication | ✅ | Normalised phone (last 10 digits) / e-mail; blocks create with a clear 409; merge UI for leads |
| Scoring | ✅ | Per-tenant rules (field/operator/points), built-in fallback, re-score action |
| Auto-assignment | ✅ | Round-robin, load-based, fixed; conditions on source/state/territory/priority |
| SLA timers, reassignment | ✅ | Lead first-response SLA with breach list; ticket SLA; reassign/bulk-assign |
| Activities: tasks, calls, meetings, notes | ✅ | Typed activities, follow-up scheduling, reminders list, timeline per lead/account/deal |
| Click-to-call | 🟡 | `tel:` link only; no telephony provider |
| Calendar sync (Google/Outlook) | 🟡 | `.ics` export of open activities. **Two-way OAuth sync not done** |
| E-mail 2-way sync, open/click tracking | ❌ | Needs a mail provider/mailbox integration |
| E-mail templates, sequences / drip | 🟡 | Templates ✅, sequences ✅ (each due step becomes a task for the lead owner). **No automatic sending** — no delivery provider |
| WhatsApp / SMS / e-mail campaigns, segmentation | 🟡 | Audiences ✅, consent + unsubscribe enforced ✅, recipients frozen and **queued** (never reported as sent) + CSV download. **Actual delivery not done** (no provider) |
| Quotation builder tied to products / price lists | 🟡 | Product master lookup, GST, discounts, server-side totals, send/accept/reject, clone, print. **No separate price-list table exists** (uses `products.selling_price`); **e-signature and PDF generation not done** |
| Customer 360 | ✅ | Contacts, deals, quotes, tickets, notes/activities, KYC, visits, consent; orders & invoices once the account is linked to a retailer/distributor/C&F (link UI included) |
| Pipeline kanban | ✅ | Board endpoint + existing board UI (stage selector per card, not drag-and-drop) |
| Forecasting, win/loss, funnel | ✅ | `/reports/*`: weighted forecast by month/owner, win rate + reasons + competitors, funnel from status history, source and rep scoreboards |
| Workflow automation | 🟡 | "If event [+ field = value] then action" for 8 events × 5 actions (task, priority, tag, assign, enrol), with a run log. **Outgoing webhooks and arbitrary actions not done** |
| Assignment rules | ✅ | see above |
| Helpdesk: SLA, categories, escalation, CSAT, KB | ✅ | SLA by priority, automatic escalation levels (raises priority), staff-recorded CSAT, internal KB with feedback. **Customer-facing survey link / public KB portal not done** |
| Partner (B2B) CRM: onboarding, KYC, documents | ✅ | Document records (type/number/link/expiry), verify/reject, KYC completes only with verified GST + PAN. **File upload storage not done** (link only) |
| Field visits: check-in/out with GPS, photo, report | 🟡 | GPS check-in/out and report ✅; photo is a URL field; **route adherence not done** |
| Loyalty / rewards | ❌ | Belongs to Phase 5 (partner portal & rewards engine) |
| Duplicate merge | 🟡 | Leads ✅ (with a recoverable snapshot in `crm_merge_log`). **Contact/account merge not done** |
| Import / export | 🟡 | Leads import + export ✅. **Export for accounts/contacts/deals not done** |
| GDPR / DPDP consent, unsubscribe | ✅ | Append-only consent ledger per channel, carried from lead to contact on conversion, suppression list, signed unsubscribe links |
| Chatwoot inbox integration (Phase 6, D4) | ❌ | Separate integration work |

## Data model
Migrations: `0006_crm_core` (counters, normalised keys, archive/merge, scoring/assignment/SLA, import log) and `0007_crm_full`
(activities/notes columns, KYC documents, visits, custom fields, quotes, helpdesk, KB, consent, suppressions, templates, audiences,
campaigns, sequences). Both additive and idempotent; no demo data. Per-tenant defaults (sources, starter pipeline, SLA policies,
ticket categories, integration catalogue) are created lazily on first CRM use by `crm-defaults.ts`.

## Bugs found and fixed while verifying
- Lead/ticket/quote numbers could collide with records created before the counter existed → counter is lifted to the highest existing
  number on first use (regression test).
- Postgres "inconsistent types deduced for parameter" in several statements that reused one `$n` in different contexts (tests caught it).
- Integrations page claimed "Ready/Connected" for providers with no credentials → status is now computed from real state.
- The old deal/lead flows swallowed API errors into `console.error`; the UI now shows the server's message.
