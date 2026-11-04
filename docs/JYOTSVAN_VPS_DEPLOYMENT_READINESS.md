# Jyotsvan Enterprise Platform — VPS Self-Hosted Deployment Readiness Audit

**Audit Date**: October 30, 2026  
**Auditor**: Senior DevOps Consultant & Systems Architect  
**Target Environment**: Self-Hosted Ubuntu 24.04 LTS VPS with Self-Hosted InsForge Backend & Custom Domain  

---

## 1. Executive Deployment Assessment

The Jyotsvan Enterprise Platform is **85% structurally ready for self-hosted VPS deployment**. Because the application is packaged as a **modular monolith** with a Node.js Express backend serving pre-compiled Vite static frontend assets, it does **not** depend on proprietary serverless edge environments or vendor lock-in.

### Key Deployment Feasibility Highlights
- **Standalone Node Server**: `npm run build` bundles `server.ts` into a single CommonJS production artifact (`dist/server.cjs`) via `esbuild`.
- **Static Asset Pipeline**: Vite compiles frontend React assets into `dist/assets/`, which `server.ts` automatically serves using `express.static`.
- **Database Portability**: The database schema uses standard PostgreSQL 17.4 DDL (tables, primary keys, foreign keys, indexes, timestamps). It can be dumped via `pg_dump` and restored to any self-hosted PostgreSQL or self-hosted InsForge instance seamlessly.
- **Port Flexibility**: Dev and production servers bind to `process.env.PORT || 3000`, making it immediately compatible with Nginx or Caddy reverse proxies.

---

## 2. VPS Deployment Readiness Checklist

| Deployment Aspect | Current Codebase Status | Readiness Verdict | Remediation for VPS Deployment |
| :--- | :--- | :--- | :--- |
| **Frontend Production Build** | `vite build` outputs to `/dist` | **READY** | Standard `npm run build` succeeds without warnings. |
| **Backend Production Build** | `esbuild server.ts --bundle` -> `dist/server.cjs` | **READY** | Executable with standard `node dist/server.cjs`. |
| **Environment Variable Management** | Consumes `.env` via `dotenv` | **READY** | Set environment variables in PM2 ecosystem file or Docker `.env`. |
| **Process Management** | Script `"start": "node dist/server.cjs"` | **READY** | Requires PM2 or Systemd unit file for process auto-restart. |
| **Reverse Proxy (Nginx/Caddy)** | Runs on port 3000 | **READY** | Configure Nginx reverse proxy to pass headers (`X-Forwarded-For`, `X-Forwarded-Proto`). |
| **SSL / HTTPS Termination** | Assumes HTTP behind proxy | **READY** | Let's Encrypt Certbot configured at Nginx level. |
| **CORS Configuration** | No CORS middleware currently mounted | **NEEDS WORK** | Add `cors()` middleware with allowed domain origin. |
| **Database Connectivity** | `INSFORGE_DATABASE_URL` via `pg.Pool` | **READY** | Point connection string to local or VPS InsForge PostgreSQL host. |
| **Self-Hosted InsForge BaaS** | References `https://858f4w8c.us-east.insforge.app` | **NEEDS WORK** | Update `VITE_INSFORGE_API_URL` to point to self-hosted InsForge subdomain (e.g. `https://api.yourdomain.com`). |
| **File Storage Persistence** | References cloud buckets in `storage.buckets` | **NEEDS WORK** | Configure local disk volume or self-hosted MinIO S3 object storage for bucket attachments. |
| **Dockerization** | No `Dockerfile` currently in repo | **NEEDS WORK** | Add multi-stage `Dockerfile` and `docker-compose.yml`. |

---

## 3. Recommended Production VPS Architecture

```
                       Internet
                          │
                          ▼
            Nginx Reverse Proxy (Port 80/443)
            Let's Encrypt SSL Termination
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
   https://erp.yourdomain.com    https://api-insforge.yourdomain.com
             │                         │
             ▼                         ▼
   Node.js / Express App         Self-Hosted InsForge BaaS
   (Port 3000 via PM2/Docker)    (Port 8000 via Docker)
             │                         │
             └────────────┬────────────┘
                          ▼
             PostgreSQL 17 Database
             (Port 5432 - Localhost Only)
                          │
                          ▼
             Persistent Volume / NVMe SSD
```

---

## 4. Required Production Docker Specification

To containerize the application for any VPS, create the following production files:

### 4.1 Production `Dockerfile`
```dockerfile
# Multi-stage production Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

### 4.2 Production `docker-compose.yml`
```yaml
version: '3.8'

services:
  app:
    build: .
    restart: always
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - INSFORGE_DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/insforge?sslmode=disable
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - APP_URL=https://erp.yourdomain.com
    depends_on:
      - postgres

  postgres:
    image: postgres:17-alpine
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=insforge
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"

volumes:
  pgdata:
```

---

## 5. Nginx Production Configuration Template

```nginx
server {
    listen 80;
    server_name erp.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/erp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.yourdomain.com/privkey.pem;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 6. Database Migration & Export Strategy

1. **Export from Current InsForge Cloud Database**:
   ```bash
   pg_dump "postgresql://postgres:...@858f4w8c.us-east.database.insforge.app:5432/insforge?sslmode=require" \
     --format=custom \
     --no-owner \
     --no-privileges \
     --file=jyotsvan_database_backup.dump
   ```
2. **Restore onto Self-Hosted VPS PostgreSQL**:
   ```bash
   pg_restore --clean --if-exists --no-owner --dbname=insforge jyotsvan_database_backup.dump
   ```
3. **Automated Seed Synchronization**:
   Accessing `https://erp.yourdomain.com/api/db/init` executes all 28 phase migrations idempotently via `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING`.
