# Jyotsvan Enterprise Platform — Architectural Specification

## 1. Architectural Philosophy

Jyotsvan is structured as a **Modular Monolith** running a modern full-stack architecture:
1. **Low Operational Overhead**: Single deployment artifact with Express + Vite SPA proxying, avoiding premature microservice complexity.
2. **Domain Encapsulation**: Strict modular boundaries where business logic and data access are isolated.
3. **Enterprise Portability**: Built on PostgreSQL standard dialect hosted on InsForge cloud infrastructure with zero proprietary lock-in.

---

## 2. Layered Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│    (App Shell, Modular Route Views, Design System Primitives)│
└──────────────────────────────┬──────────────────────────────┘
                               │ (Calls Services & Hooks)
┌──────────────────────────────▼──────────────────────────────┐
│                    Business Logic Layer                     │
│    (Domain Modules, Validation, Workflows, State Contexts)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Invokes Data Adapters)
┌──────────────────────────────▼──────────────────────────────┐
│                    Data Access Layer                        │
│    (Server-Side DB Pool, InsForge SDK Client, SQL Schema)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Configured via Env)
┌──────────────────────────────▼──────────────────────────────┐
│                 Configuration & Secrets                     │
│    (Environment Variables, Tenant Scope, Security Rules)    │
└─────────────────────────────────────────────────────────────┘
```

### Layer Rules
- **UI Components** never execute direct SQL. All requests are routed through `/src/services/` or server-side API endpoints (`/api/*`).
- **Client Components** interact through well-defined service functions and custom hooks.
- **Secrets and Keys** (`INSFORGE_DATABASE_URL`, `INSFORGE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) remain strictly server-side and are never exposed via browser-visible bundles.
- **Client Variables** (`VITE_INSFORGE_API_URL`, `VITE_INSFORGE_ANON_KEY`) provide public access tokens for safe browser authentication and asset serving.

---

## 3. Directory Layout Blueprint

```
/
├── docs/                        # Architecture, specs, database schema, checklists
├── public/                      # Static assets & brand media
├── src/
│   ├── app/                     # Route views & page controllers
│   ├── components/              # Reusable UI primitives & layout shell
│   │   ├── layout/              # Sidebar, Header, Breadcrumb, AppShell, Search
│   │   └── ui/                  # Button, Input, Select, Card, Dialog, Badge, etc.
│   ├── modules/                 # Future business domains (Inventory, Sales, etc.)
│   ├── lib/                     # Utilities, formatting, cn helper
│   ├── services/                # InsForge SDK wrapper & repository services
│   ├── database/                # Schema definitions, seed datasets, and DDL
│   ├── server/                  # Server-side DB connection pool, init & sync
│   ├── types/                   # Global TypeScript types and domain interfaces
│   ├── config/                  # Navigation items, route metadata, env config
│   ├── context/                 # AuthContext, ToastContext, ThemeContext
│   ├── App.tsx                  # Root application router & layout orchestrator
│   ├── main.tsx                 # React DOM mount point
│   └── index.css                # Global styles & design system tokens
├── server.ts                    # Express backend & API proxy
├── .env.example                 # Explicit documentation of required environment variables
├── metadata.json                # Application metadata & platform permissions
├── package.json                 # Dependencies and build scripts
└── tsconfig.json                # TypeScript compiler configuration
```

---

## 4. InsForge Integration Model

### 4.1. Managed PostgreSQL Cloud Database
- **Engine**: PostgreSQL 17.4 on InsForge Cloud.
- **Connection**: Server-side connection pool with SSL enforcement (`rejectUnauthorized: false` for managed certs).
- **Schemas**:
  - `public`: Core business and enterprise foundation tables.
  - `auth`: InsForge identity engine (`auth.users`, `auth.identities`).
  - `storage`: InsForge object storage (`storage.buckets`, `storage.objects`).
  - `system`: InsForge platform metadata.

### 4.2. Object Storage
Managed storage buckets configured in `storage.buckets`:
- `documents` (Private): Invoices, compliance certificates, contracts.
- `product-images` (Public): High-resolution SKU imagery & packaging.
- `attachments` (Private): Communication files, purchase order specs.
- `qc-documents` (Private): Quality assurance certificates of analysis.
- `employee-documents` (Private): Onboarding verification records.
- `reports` (Private): Exported financial & analytical PDF/Excel sheets.

### 4.3. Authentication & RBAC Bridge
- **Identity Provider**: InsForge Auth issues signed JWTs and session cookies.
- **Profile Synchronization**: Client authenticates with InsForge Auth; server resolves operator profile and assigned permissions from `public.users`, `user_roles`, `roles`, `role_permissions`, and `permissions`.

---

## 5. Security & Multi-Tenancy Architecture

1. **Organization Scoping**: Every business record has an `organization_id` column ensuring strict tenant isolation.
2. **Branch Scoping**: Multi-branch entities link to `branch_id` with inheritance from their parent organization.
3. **Role-Based Access Control (RBAC)**: 127 fine-grained permission codes organized by subsystem module, mapped to 11 enterprise roles.
4. **Enterprise Audit Engine (Phase 23)**: `audit_logs` records every critical administrative and transactional action with actor details, timestamps, before/after state diffs, recursive sensitive field redaction, and cryptographic SHA-256 hash chains. Append-only enforcement forbids deletion or mutation.
5. **No Secrets in Bundles**: Client-side `env.ts` contains only public URL/anon key. Database credentials and service role keys are strictly handled inside `server.ts` and `src/server/db.ts`.

---

## 6. Phase 23: Enterprise Audit Engine & Cryptographic Compliance Architecture

```
[Web UI / Mobile App / API Client]
                │
                ▼
      [Express API Router]
                │
     ┌──────────┴──────────┐
     │                     │
[Audit Middleware]   [Business Service]
     │                     │
     │               [AuditService.log()]
     │                     │
     │      ┌──────────────┴──────────────┐
     │      │ • Sensitive Field Redactor  │
     │      │ • Field Diff (Before/After) │
     │      │ • SHA-256 Hash Chaining     │
     │      └──────────────┬──────────────┘
     │                     ▼
     └──────────> [PostgreSQL DB: audit_logs]
                           │
                 [audit_retention_policies]
```

- **Sensitive Data Scrubbing**: Auto-redacts passwords, tokens, API keys, card numbers, and connection strings.
- **Hash-Chain Verification**: Sequentially computes `record_hash = SHA256(prev_hash | payload)` guaranteeing mathematical non-repudiation.
- **Strict Immutability**: Any `DELETE` or `PUT` request to `/api/audit-logs` returns `403 Forbidden` and records an unauthorized tampering attempt event.

---

## 6. Server Endpoints & API Surface

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check (DB connection, latency, current user, timestamp) |
| `/api/insforge/health` | `GET` | Deep diagnostic of InsForge DB, schemas, RLS, storage buckets, and auth state |
| `/api/db/status` | `GET` | Public table names and row count summary |
| `/api/auth/profile` | `GET` | Resolves operator profile with joined roles and permissions |
| `/api/db/query` | `POST` | Secure query proxy for data retrieval |
| `/api/db/init` | `POST` | Runs schema DDL verification and foundation data synchronization |
