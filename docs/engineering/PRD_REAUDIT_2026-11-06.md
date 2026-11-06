# PRD re-audit — 2026-11-06

Scope: `docs/PRD_Jyotsvan_ERP.md` against `main` + `claude/zen-mayer-t9otaz` (80d9c05). Method: the earlier `PRD_GAP_ANALYSIS.md` (2026-11-05) **plus targeted code probes run today**
(`grep` over `src/`, migrations and routes). Probes show presence/absence of code, **not runtime behaviour**; "verified" below means covered by the 79 automated tests on a
real Postgres (CI is green) or by a browser walkthrough. Deferred by the client on 2026-11-05: WhatsApp (§5.11), Chatwoot (§5.12, placeholder only), and all external
credentials (Meta, Google Ads, Shopify, Amazon, Flipkart, IndiaMART, GSP/IRP, SMS/e-mail providers).

## Changed since the baseline audit
| Area | Then | Now | Evidence |
|---|---|---|---|
| Server auth, sessions, tenant forcing, RBAC (§2, §4) | GAP | **Verified** | `core/*`, `tests/integration/auth-and-isolation`, `admin-users-roles` |
| Audit trail from the verified session | CONFLICT | **Verified** (actor from session) | `core/audit` |
| Versioned migrations, CI, tests (§8) | MISS | **Present** | `migrator.ts`, `.github/workflows/ci.yml`, 79 tests |
| CRM (§5.3) | broken | **Working, verified** | `CRM_STATUS.md`, 20 integration tests |
| Gateway to external modules | none | **Present** | `/api/ext/*`, `ext-proxy.ts`, 7 tests |
| **Live InsForge database** | unverified | **Not upgraded**: migrations need the `postgres` role (KI-40) | runbook 2c |

## Still missing — probes run 2026-11-06 (0 / near-0 matches)
| PRD § | Item | Probe result | Plan |
|---|---|---|---|
| 5.1 | Chart of accounts, vouchers, double-entry ledger, posting engine, TB/P&L/BS | no GL/voucher/posting code (only expense "voucher" labels) | **Deferred to the GST-billing integration first** (client decision), then extend |
| 5.1 | E-invoice (IRN) / e-way bill via GSP | no IRP/GSP client | needs GSP choice + credentials (PRD §11 Q4) |
| 5.1 | GSTR-1/3B, 2A/2B, ITC, TDS/TCS | one helper in `finance-service.ts`, no returns | provided by GST-billing app for small-business scale |
| 5.1 | Bank reconciliation, UPI links | 1 file mention only | later |
| 5.4 | MRP / production planning | no MRP engine (earlier "mrp" hits were max-retail-price fields) | Phase 4 |
| 5.8–5.9 | Partner portals / portal users / loyalty & rewards | 0 matches | Phase 5 |
| 5.10 | Field-sales PWA / offline (service worker, manifest) | 0 matches | Phase 5 |
| 5.7 | HRMS statutory files, F&F, recruitment | HRMS exists in-app; statutory missing | integrate euron-open-hrms (separate DB) |
| 8 | Generic approval engine; POS/franchise; background job queue; i18n (Hindi); 2FA/OTP | 0–1 matches each | Phases 1/7/8 |
| 4 | Row-level security | present as opt-in tooling, **off by default** | enable after staging test |

## Present but not real yet (kept honest in the UI)
Marketplace and ad integrations (Shopify, Meta, Google, Amazon, Flipkart, Myntra) still have simulated/sandbox paths until credentials arrive; CRM campaigns queue but do not
send (no delivery provider); the AI copilot has deterministic fallbacks. See `KNOWN_ISSUES.md`.

## Recommended build order (small, verifiable steps)
1. Run the privileged live-DB step (runbook 2c), apply 0001–0007, create the admin, verify `/api/crm` on live.
2. Bring up GST-billing on the VPS behind the gateway; verify through `/api/ext/gst-billing`; decide screen embedding vs data sync.
3. Session bridge/SSO for embedded modules (KI-47).
4. HRMS service with its own database; employee sync from People.
5. Phase 5 partner portal + loyalty; Phase 4 MRP; accounting posting engine on top of the GST-billing data.
