# Jyotsvan Enterprise Platform — Complete Security Audit Report

**Audit Date**: October 30, 2026  
**Auditor**: Senior Cybersecurity & Application Security Auditor  
**Audit Standard**: OWASP Top 10 Enterprise Web Application Security Standard  

---

## 1. Security Findings Summary Matrix

| Finding ID | Severity | Vulnerability Description | Affected Component | Remediation Required |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **CRITICAL** | **Row Level Security (RLS) is disabled across all 131 public tables.** Direct PostgREST or InsForge client access can query/mutate cross-tenant data. | InsForge Managed PostgreSQL (`public.*`) | Execute `ENABLE ROW LEVEL SECURITY` across all public tables with tenant isolation policies. |
| **SEC-02** | **CRITICAL** | **Passwordless Login Bypass in Database Fallback Auth.** Entering any email logs in or auto-provisions a user without password hash verification. | `src/services/auth.ts` (lines 112–195) | Enforce mandatory bcrypt/argon2 password hash validation or restrict authentication strictly to InsForge Auth SDK. |
| **SEC-03** | **HIGH** | **Generic Unauthenticated SQL Execution Proxy.** `POST /api/db/query` accepts raw SQL and params from any HTTP client without authentication checks. | `server.ts` (lines 272–289) | Protect endpoint with strict Admin JWT verification or remove in production deployment. |
| **SEC-04** | **HIGH** | **Hardcoded Organization & User Identity Headers in Client APIs.** Multiple frontend services send hardcoded headers (`x-organization-id: org-jyotsvan-corp`, `x-user-id: usr-super-admin`). | `salesOrderApi.ts`, `financeApi.ts`, `fieldSalesApi.ts` | Replace static headers with authenticated session JWT token extracted from `AuthContext`. |
| **SEC-05** | **MEDIUM** | **Unencrypted Sensitive Data in Browser LocalStorage.** Complete organization, branch, warehouse, and user directory cached in plaintext in `localStorage`. | `src/services/database.ts` | Store sensitive data in memory only or encrypt local storage cache using Web Crypto API. |
| **SEC-06** | **MEDIUM** | **Server-side PostgreSQL SSL Certificate Verification Disabled (`rejectUnauthorized: false`).** Susceptible to Man-in-the-Middle (MitM) attacks on insecure networks. | `src/server/db.ts` (line 16) | Bundle CA certificate and set `rejectUnauthorized: true` for VPS production database connections. |
| **SEC-07** | **LOW** | **Permissive Default CORS & Large Payload Body Parser (`10mb`).** `express.json({ limit: '10mb' })` without explicit origin allowlist. | `server.ts` (line 68) | Configure `cors()` middleware with explicit domain origins; restrict body parser limits per route. |
| **SEC-08** | **INFORMATIONAL**| **Third-Party API Secrets Encrypted with AES-256-GCM.** Marketplace tokens and API secrets stored in database use salted AES-256-GCM encryption in `crypto-vault.ts`. | `src/server/crypto-vault.ts` | Maintain secret encryption keys strictly outside of repository via environment variables. |

---

## 2. Detailed Technical Vulnerability Analysis

### 2.1 SEC-01: Row Level Security (RLS) Disabled (CRITICAL)
- **Technical Analysis**:
  A direct SQL audit of PostgreSQL catalog table `pg_class` revealed that all 131 enterprise tables have `relrowsecurity = false`.
- **Attack Vector**:
  If a developer or integration connects to InsForge using `@insforge/sdk` or standard PostgREST API with a client anon key, PostgreSQL will return rows from all organizations without tenant boundaries.
- **Current Mitigation**:
  The Node.js Express server (`server.ts`) acts as an intermediary and appends `WHERE organization_id = $1` to SQL queries. However, defense-in-depth is violated because the database itself does not enforce this constraint.
- **Remediation Plan**:
  ```sql
  -- Execute across all 131 public tables
  ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
  ALTER TABLE products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
  -- Add tenant isolation policy
  CREATE POLICY tenant_isolation_policy ON sales_orders
    USING (organization_id = current_setting('app.current_org_id', true));
  ```

---

### 2.2 SEC-02: Passwordless Login Bypass in Database Fallback (CRITICAL)
- **Technical Analysis**:
  In `src/services/auth.ts`:
  ```typescript
  // Lines 134-135:
  const allUsers = await databaseService.getUsers(tempActor);
  const matched = allUsers.find((u) => u.email.toLowerCase() === email);
  if (matched) {
    // Session is created and persisted without password comparison!
    foundUser = { ...matched, ... };
    this.persistSession(session, foundUser);
    return { user: foundUser, session };
  }
  ```
- **Attack Vector**:
  Anyone knowing an administrative email address (e.g. `admin@jyotsvan.enterprise`) can input that email into the login prompt with any arbitrary password, and the system grants full administrative access.
- **Remediation Plan**:
  1. Store salted password hashes in the `users` table (`password_hash VARCHAR(255)`).
  2. Implement bcrypt comparison: `const isValid = await bcrypt.compare(credentials.password, matched.password_hash);`.
  3. Require multi-factor authentication (MFA) for super admin accounts.

---

### 2.3 SEC-03: Generic Unauthenticated SQL Proxy (HIGH)
- **Technical Analysis**:
  In `server.ts` lines 272–289:
  ```typescript
  app.post('/api/db/query', async (req, res) => {
    const { sql, params } = req.body;
    const result = await query(sql, params);
    res.json({ rows: result.rows, ... });
  });
  ```
- **Attack Vector**:
  Any HTTP client capable of reaching port 3000 can send arbitrary SQL statements (e.g. `DROP TABLE users;` or `SELECT * FROM users;`) directly to the database.
- **Remediation Plan**:
  Add an authentication guard middleware that verifies an administrative bearer token before executing `query(sql, params)`, or disable this endpoint in production.

---

### 2.4 SEC-04: Hardcoded Authorization Headers in Client Services (HIGH)
- **Technical Analysis**:
  In `src/services/salesOrderApi.ts`, `src/services/financeApi.ts`, etc.:
  ```typescript
  const headers = {
    'Content-Type': 'application/json',
    'x-organization-id': 'org-jyotsvan-corp',
    'x-user-id': 'usr-super-admin',
    'x-user-email': 'admin@jyotsvan.enterprise',
  };
  ```
- **Impact**:
  Every user of the frontend currently impersonates `usr-super-admin` regardless of who is signed in. Real RBAC checks on the backend will always see the requester as `usr-super-admin`.
- **Remediation Plan**:
  Refactor client API services to extract the dynamic authenticated session headers from `AuthContext`:
  ```typescript
  const { session, user } = useAuth();
  headers['Authorization'] = `Bearer ${session.token}`;
  headers['x-organization-id'] = user.organization_id;
  headers['x-user-id'] = user.id;
  ```

---

### 2.5 SEC-08: Cryptographic Secret Storage (INFORMATIONAL / POSITIVE)
- **Technical Assessment**:
  The platform includes an enterprise cryptographic vault (`src/server/crypto-vault.ts`) utilizing **AES-256-GCM** with 96-bit initialization vectors (IV) and 128-bit authentication tags to protect third-party credentials (Amazon SP-API keys, Flipkart secrets, Myntra tokens):
  ```typescript
  export function encryptCredentials(data: Record<string, any>): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    // Combines IV + Ciphertext + AuthTag into base64 payload
  }
  ```
- **Verdict**: Implementation meets high enterprise cryptographic standards.
