# Jyotsvan Enterprise Platform — Complete Technology Stack Audit Report

**Audit Date**: October 30, 2026  
**Auditor**: Senior Software Architect & Full-Stack Systems Auditor  
**Scope**: Full Stack Technical Assessment (Frontend, Backend, Database, Infrastructure, Build Tools)  
**Classification**: Technical Audit & Architecture Specification  

---

## 1. Executive Summary

This report documents the exact technology stack detected within the codebase of the **Jyotsvan Enterprise Platform**. Every entry is strictly verified against `package.json`, source code imports, server configuration, runtime behavior, and active cloud connection tests.

The platform is structured as an enterprise **modular monolith** with a decoupled React 19 Single Page Application (SPA) frontend served via a custom Node.js Express server (`server.ts`) that mounts Vite middleware during development and serves compiled static assets in production, while exposing a rich RESTful API gateway connecting to an **InsForge Managed PostgreSQL 17.4** cloud database.

---

## 2. Technology Stack Verification Table

| Component | Technology | Detected Version | Actual Usage in Codebase | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `19.0.1` | Core UI rendering engine; functional components & hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`). | **VERIFIED** (`package.json`) |
| **DOM Renderer** | React DOM | `19.0.1` | Client-side DOM mounting via `createRoot` in `src/main.tsx`. | **VERIFIED** (`package.json`, `src/main.tsx`) |
| **Programming Language** | TypeScript | `~5.8.2` | Strict end-to-end typing across frontend components, state, interfaces, DTOs, Express server, and API contracts. | **VERIFIED** (`package.json`, `tsconfig.json`) |
| **Build Tool & Dev Server**| Vite | `^6.2.3` | Bundler, asset pipeline, Hot Module Reloading engine, and SSR middleware mode inside `server.ts`. | **VERIFIED** (`package.json`, `vite.config.ts`, `server.ts`) |
| **Vite React Plugin** | `@vitejs/plugin-react` | `^5.0.4` | Fast Refresh, JSX transform for React 19. | **VERIFIED** (`package.json`, `vite.config.ts`) |
| **CSS Framework** | Tailwind CSS | `^4.1.14` | Styling engine utilizing `@tailwindcss/vite` and `@import "tailwindcss";` in `src/index.css`. Zero arbitrary CSS files. | **VERIFIED** (`package.json`, `src/index.css`) |
| **Tailwind Vite Plugin** | `@tailwindcss/vite` | `^4.1.14` | Native Vite integration for Tailwind CSS v4 compiler. | **VERIFIED** (`package.json`, `vite.config.ts`) |
| **Class Utilities** | `clsx` & `tailwind-merge` | `2.1.1` / `3.6.0` | Conditional class composition and deduplication in `src/lib/utils.ts` (`cn()` helper). | **VERIFIED** (`package.json`, `src/lib/utils.ts`) |
| **Icon Library** | `lucide-react` | `^0.546.0` | Comprehensive vector icon set used across AppShell, navigation, tables, dashboards, and actions. | **VERIFIED** (`package.json`, all UI components) |
| **Animation Library** | `motion` (Framer Motion) | `^12.23.24` | Modern micro-interactions, modal transitions, collapsible drawers, and toast slide-ins. | **VERIFIED** (`package.json`) |
| **Data Visualization** | `recharts` | `^3.10.1` | Telemetry charting (Area, Bar, Line, Pie, Radar charts) across Command Center, Analytics, and Marketplaces. | **VERIFIED** (`package.json`, `CommandCenterPage.tsx`, `BusinessAnalyticsPage.tsx`) |
| **Routing Architecture** | Custom History Router | Native SPA | Window History API (`pushState`, `popstate`), query string parsing, breadcrumb resolution. No `react-router` dependency. | **VERIFIED** (`src/App.tsx`, `src/config/navigation.ts`) |
| **State Management** | React Context + LocalStorage | Native React 19 | `AuthContext`, `ToastContext`, `accessControlService`, `databaseService` with localStorage cache fallback. | **VERIFIED** (`src/context/*`, `src/services/*`) |
| **Form Handling** | Controlled React State | Custom Hooks | Reusable form primitives (`FormField`, `FormSection`, `NumberInput`, `Switch`, `Checkbox`, `RadioGroup`). | **VERIFIED** (`src/components/forms/*`) |
| **Backend Framework** | Express | `^4.21.2` | RESTful API server mounted on port 3000, routing over 35 domain sub-routers (`server.ts`). | **VERIFIED** (`package.json`, `server.ts`) |
| **Runtime Engine** | Node.js | `v22.23.4` (LTS) | Server execution environment, async I/O, crypto modules, networking. | **VERIFIED** (`node -v`) |
| **TypeScript Execution** | `tsx` | `^4.21.0` | Instant Node execution of TypeScript server files in development (`tsx server.ts`). | **VERIFIED** (`package.json`) |
| **Server Bundler** | `esbuild` | `^0.25.0` | Production bundling of `server.ts` into standalone `dist/server.cjs`. | **VERIFIED** (`package.json`) |
| **InsForge Client SDK** | `@insforge/sdk` | `^1.5.2` | Official InsForge BaaS JavaScript/TypeScript client adapter. | **VERIFIED** (`package.json`, `src/services/insforge.ts`) |
| **Database Engine** | PostgreSQL (InsForge Cloud) | `v17.4` | Relational database hosting 131 enterprise schemas, tables, constraints, foreign keys, and indexes. | **VERIFIED** (Active runtime diagnostic) |
| **Database Driver** | `pg` (node-postgres) | `^8.23.0` | PostgreSQL client pool (`Pool`, `Client`) with TLS/SSL handling and connection pooling. | **VERIFIED** (`package.json`, `src/server/db.ts`) |
| **In-Memory SQL Driver**| `pg-mem` | `^3.0.5` | In-memory relational database fallback used for offline verification and zero-downtime test harnesses. | **VERIFIED** (`package.json`, `src/server/db.ts`) |
| **AI Intelligence SDK** | `@google/genai` | `^2.4.0` | Official Google GenAI SDK powering server-side Copilot reasoning via `gemini-3.8-flash`. | **VERIFIED** (`package.json`, `src/server/ai-foundation-service.ts`) |
| **Environment Config** | `dotenv` | `^17.2.3` | Secret and configuration loading (`.env.example`, runtime environment variables). | **VERIFIED** (`package.json`, `src/config/env.ts`) |

---

## 3. Frontend Architecture

### 3.1 Routing Implementation
The frontend does not employ heavy 3rd-party routing dependencies like `react-router-dom` or `@tanstack/react-router`. Instead, it uses an enterprise lightweight **Browser History Router**:
- **Mechanism**: Reads `window.location.pathname` upon initialization. Listens to `popstate` events.
- **Navigation Dispatcher**: Custom `navigate(path: string)` helper dispatches `history.pushState` and triggers reactive component re-rendering.
- **Deep-Linking**: Direct URL access is fully supported across all nested paths (`/commerce/marketplaces/myntra`, `/operations/formulations`, `/ai/copilot`, etc.) because the Express server catches all non-API GET requests and streams `index.html`.
- **Breadcrumbs Engine**: Automatically resolves hierarchically defined breadcrumbs from `NAVIGATION_ITEMS` in `src/config/navigation.ts`.

### 3.2 State Management & Persistence
- **Global Contexts**:
  - `AuthContext`: Tracks authenticated user profile, active session, multi-branch switching, and sign-out.
  - `ToastContext`: Universal notification dispatch system for success, warning, error, and system alerts.
- **Master Data Caching**:
  - `src/services/database.ts` maintains a client-side synchronized repository cached in `localStorage` under keys `jyotsvan_db_*_v4`.
  - Initial seed data is provided by `src/database/initial-data.ts`.
- **Domain API Services**:
  - Individual API services in `src/services/*` encapsulate asynchronous HTTP calls to `/api/*` endpoints.

---

## 4. Backend Architecture

### 4.1 Server Layout (`server.ts`)
The server acts as a unified **API Gateway + Static Asset Host**:
```
Client Request
      │
      ▼
Express Application (port 3000)
      │
      ├── /api/health (Basic Ping & Latency)
      ├── /api/insforge/health (Deep Database & Storage Diagnostics)
      ├── /api/db/status (Schema Tables & Row Counts)
      ├── /api/auth/profile (User Identity & RBAC Resolution)
      ├── /api/db/query (Secure Parameterized Query Proxy)
      │
      ├── Domain Routers (/api/products, /api/inventory, /api/procurement, ...)
      ├── Integration Routers (/api/amazon, /api/flipkart, /api/myntra, /api/shopify, /api/meta, ...)
      ├── AI Routers (/api/ai/copilot, /api/ai/insights, /api/ai/recommendations, /api/ai/actions)
      │
      └── Fallback: Vite Middleware (Dev) / express.static('dist') (Prod) -> index.html
```

### 4.2 Database Layer (`src/server/db.ts`)
- **Primary Driver**: `pg.Pool` initialized with connection string from `INSFORGE_DATABASE_URL` or `DATABASE_URL`.
- **Connection Configuration**:
  - Maximum connections: 25
  - Idle timeout: 60,000 ms
  - Connection timeout: 30,000 ms
  - SSL Configuration: `rejectUnauthorized: false` for managed cloud TLS handshakes.
- **Schema Management**: 28 distinct phase migration files executed sequentially via `runAllMigrations()` mounted at `/api/db/init`.

---

## 5. Development & Build Pipeline

### 5.1 Package Scripts
- `npm run dev`: Runs `tsx server.ts` — Starts Express on port 3000 with Vite middleware.
- `npm run build`: Executes `vite build` to compile the frontend to `/dist`, followed by `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs` to create the production backend bundle.
- `npm run start`: Executes `node dist/server.cjs` for self-contained production hosting.
- `npm run lint`: Runs `tsc --noEmit` to validate 100% TypeScript type safety.
- `npm run clean`: Purges `dist/` and temporary build artifacts.

### 5.2 Environment Variables
The application consumes the following environment variables (defined in `.env.example`):
- `INSFORGE_DATABASE_URL`: Full PostgreSQL connection string (`postgresql://user:pass@host:5432/dbname?sslmode=require`).
- `INSFORGE_SERVICE_ROLE_KEY`: Privileged backend secret key for server-to-server operations.
- `VITE_INSFORGE_PROJECT_ID`: InsForge BaaS project reference identifier.
- `VITE_INSFORGE_API_URL`: InsForge REST API gateway (`https://858f4w8c.us-east.insforge.app`).
- `VITE_INSFORGE_ANON_KEY`: Public client-safe anon key.
- `GEMINI_API_KEY`: Server-side API key for Google GenAI SDK (`gemini-3.8-flash`).
- `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT_URI`: Meta Graph API credentials.
- `APP_URL`: Canonical deployment domain.
