# Jyotsvan Enterprise Platform — Prioritized Development Roadmap

**Audit Date**: October 30, 2026  
**Auditor**: Senior Software Architect & Technical Lead  
**Roadmap Objective**: Clear, actionable, prioritized roadmap transitioning the platform from AI Studio to a fully self-hosted, production-grade enterprise system.  

---

## Roadmap Overview by Implementation Phase

| Phase | Focus Area | Primary Deliverables | Target Scope |
| :--- | :--- | :--- | :--- |
| **Phase A** | **Existing Functionality Hardening** | Refactor client API services, remove hardcoded user headers, enforce real password hashing in auth. | Frontend + Backend |
| **Phase B** | **Backend & Database Hardening** | Enable Row Level Security (RLS) on all 131 tables, protect query proxy, add connection pool health monitoring. | Database + Backend |
| **Phase C** | **New Functional Modules** | GSTN E-Invoicing / E-Way Bill auto-generation, warehouse barcode/RFID scanner support, export documentation. | Full Stack |
| **Phase D** | **Production External Integrations** | Real production credentials for Amazon SP-API, Flipkart, Myntra PPMP, Shopify, WhatsApp Business Cloud, Razorpay. | Integrations |
| **Phase E** | **UI/UX Optimization & Mobile Experience** | Responsive horizontal scrolling on 20+ column data tables, printable invoice templates, dark/light theme toggles. | Frontend |
| **Phase F** | **Enterprise Security & Reliability** | Automated test suite (Jest/Playwright), API rate-limiting, encrypted audit trail exports, daily automated pg_dumps. | Security + DevOps |
| **Phase G** | **VPS Self-Hosted Deployment** | Dockerization, self-hosted InsForge backend container, Nginx reverse proxy, Let's Encrypt SSL, PM2 monitoring. | DevOps |

---

## Detailed Task Matrix

### Phase A — Existing Functionality Completion

| Task ID | Task Title | Description | Priority | Dependencies | Complexity | Affected Modules | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A-1** | **Dynamic Auth Headers in Client APIs** | Replace static `'x-organization-id': 'org-jyotsvan-corp'` and `'x-user-id': 'usr-super-admin'` in `salesOrderApi.ts`, `financeApi.ts`, `fieldSalesApi.ts` with dynamic headers from `AuthContext`. | **P0 (Blocker)** | None | **Low** | All Client API Services | Frontend |
| **A-2** | **Secure Password Validation in Auth** | Implement bcrypt password hashing on user records and compare passwords during database login fallback in `src/services/auth.ts`. | **P0 (Blocker)** | None | **Medium** | Authentication (`auth.ts`) | Backend |
| **A-3** | **Close Generic Query Proxy Vulnerability** | Add authentication middleware to `POST /api/db/query` restricting execution to verified super-admin JWT tokens. | **P0 (Blocker)** | None | **Low** | Server (`server.ts`) | Backend |
| **A-4** | **HRMS Attendance & Leave Persistence** | Replace mock attendance punch registers and leave balances in `PeoplePage.tsx` with live database calls to `attendance_punches` and `leave_requests`. | **P1 (High)** | A-1 | **Medium** | HRMS (`/people`) | Full Stack |

---

### Phase B — Backend & Database Hardening

| Task ID | Task Title | Description | Priority | Dependencies | Complexity | Affected Modules | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **B-1** | **Enable RLS on All 131 Public Tables** | Execute `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` on all 131 tables and define organization isolation policies. | **P0 (Blocker)** | A-2 | **High** | Database (`public.*`) | Database |
| **B-2** | **PostgreSQL Connection Resiliency** | Configure automated reconnection retry logic with exponential backoff in `src/server/db.ts` to eliminate transient dropped connection errors. | **P1 (High)** | None | **Medium** | Database Driver (`db.ts`)| Backend |
| **B-3** | **Automated Database Index Optimization** | Add composite indexes on high-frequency query pairs (`(organization_id, status)`, `(organization_id, created_at)`). | **P2 (Medium)** | B-1 | **Low** | Database Performance | Database |

---

### Phase C — New Business Modules & Add-Ons

| Task ID | Task Title | Description | Priority | Dependencies | Complexity | Affected Modules | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **C-1** | **NIC/GSTN E-Invoicing & E-Way Bill** | Integrate with Indian GSTN Sandbox/Production APIs to generate 64-character IRN and QR code on tax invoices; auto-generate E-Way bills for inter-state shipments >₹50,000. | **P1 (High)** | Phase A | **High** | Finance (`/finance`) | Backend + Integrations |
| **C-2** | **Hardware Barcode Scanner Support** | Implement WebUSB / WebHID barcode scanner event listeners for warehouse dispatch packing benches to auto-verify line items. | **P2 (Medium)** | None | **Medium** | Warehouses (`/warehouses`)| Frontend |
| **C-3** | **AYUSH Export Document Generator** | Formats for Certificate of Free Sale (CoFS), US FDA foreign supplier compliance, and Certificate of Analysis (CoA) automated PDF generation. | **P2 (Medium)** | None | **Medium** | Quality (`/operations/quality`) | Full Stack |
| **C-4** | **Multi-Language Field Sales Voice Agent** | Server-side Gemini Live/Audio agent supporting spoken Hindi, Marathi, and Tamil for rural field sales representatives booking orders. | **P3 (Low)** | Phase A | **High** | Field Sales (`/distribution`)| Full Stack + AI |

---

### Phase D — External Production Integrations

| Task ID | Task Title | Description | Priority | Dependencies | Complexity | Affected Modules | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **D-1** | **Production Myntra PPMP API Activation** | Transition `MyntraApiClient` from sandbox mock mode to live production PPMP endpoints using production developer credentials. | **P1 (High)** | A-1 | **Medium** | Commerce (`/commerce/myntra`)| Integrations |
| **D-2** | **Production Flipkart Seller API Activation** | Input production Flipkart App ID and Secret; test RTD scheduling and F-Assured tracking against live orders. | **P1 (High)** | A-1 | **Medium** | Commerce (`/commerce/flipkart`)| Integrations |
| **D-3** | **Production Amazon SP-API Activation** | Configure AWS IAM Role ARN, LWA client credentials, and subscribe to SQS notification queues for live order feeds. | **P1 (High)** | A-1 | **High** | Commerce (`/commerce/amazon`)| Integrations |
| **D-4** | **Production Shopify D2C Activation** | Mount live Shopify Storefront Access Token and register HMAC-verified webhook URL with Shopify Admin. | **P1 (High)** | A-1 | **Low** | Commerce (`/commerce/shopify`)| Integrations |
| **D-5** | **Razorpay / Cashfree Payment Gateway** | Automated payment link generation for distributor collections and UPI QR code rendering on invoices. | **P2 (Medium)** | C-1 | **Medium** | Finance (`/finance`) | Integrations |
| **D-6** | **WhatsApp Business Cloud API** | Order confirmation, dispatch tracking, and payment reminder notifications sent directly to distributor and customer mobile numbers. | **P2 (Medium)** | None | **Medium** | Notifications (`/notifications`)| Integrations |

---

### Phase E — UI/UX Optimization

| Task ID | Task Title | Description | Priority | Dependencies | Complexity | Affected Modules | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E-1** | **Responsive Table Horizontal Scrolling** | Add sticky column headers and pinned action columns on tables with >8 columns (Distributor Assortments, SkuDirectory, Invoices). | **P1 (High)** | None | **Low** | Generic `DataTable` | Frontend |
| **E-2** | **Print-Optimized Invoice & GRN Layouts** | Add `@media print` CSS stylesheet formatting invoices and Goods Receipt Notes for standard A4 thermal and laser printers. | **P1 (High)** | None | **Low** | Finance & Procurement | Frontend |
| **E-3** | **Global Dark / Light Theme Toggle** | Provide clean toggle between current enterprise slate theme and a high-contrast clean light theme. | **P3 (Low)** | None | **Medium** | Design System (`/design-system`)| Frontend |

---

### Phase F — Enterprise Security & Reliability

| Task ID | Task Title | Description | Priority | Dependencies | Complexity | Affected Modules | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-1** | **Automated Integration & E2E Testing Suite**| Set up Vitest unit tests for financial calculations and Playwright E2E tests for core workflows (PR -> PO -> GRN -> Invoice). | **P1 (High)** | Phase A | **Medium** | Entire Platform | Testing |
| **F-2** | **API Rate-Limiting Middleware** | Add `express-rate-limit` middleware preventing brute-force attacks on login endpoints and query abuse. | **P1 (High)** | None | **Low** | Server (`server.ts`) | Backend |
| **F-3** | **Daily Automated Backup Cron** | Configure automated scheduled script performing `pg_dump` with encrypted upload to secondary cloud storage. | **P1 (High)** | None | **Low** | DevOps Infrastructure | DevOps |

---

### Phase G — Self-Hosted VPS Deployment

| Task ID | Task Title | Description | Priority | Dependencies | Complexity | Affected Modules | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **G-1** | **Containerize Application (`Dockerfile`)** | Create production multi-stage `Dockerfile` and `docker-compose.yml` orchestrating App, PostgreSQL 17, and Redis cache. | **P1 (High)** | Phase A, B | **Medium** | DevOps Infrastructure | DevOps |
| **G-2** | **Deploy Self-Hosted InsForge Backend** | Install self-hosted InsForge BaaS container on VPS and point frontend `VITE_INSFORGE_API_URL` to local InsForge instance. | **P1 (High)** | G-1 | **High** | DevOps Infrastructure | DevOps |
| **G-3** | **Configure Nginx Reverse Proxy & SSL** | Set up Nginx virtual host with HTTP/2, WebSocket proxying, and automated Let's Encrypt SSL certificate renewals. | **P1 (High)** | G-1 | **Low** | DevOps Infrastructure | DevOps |
| **G-4** | **Establish PM2 / Systemd Monitoring** | Configure PM2 process management with log rotation, CPU/RAM alerts, and automated crash recovery. | **P1 (High)** | G-1 | **Low** | DevOps Infrastructure | DevOps |
