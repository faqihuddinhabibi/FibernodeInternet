# FiberNode Internet

Sistem Manajemen Tagihan Langganan WiFi - Full-stack application for managing WiFi subscription billing with WhatsApp bot integration.

## Tech Stack

### Backend
- **Runtime**: Node.js 22
- **Framework**: Express.js 5
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Auth**: JWT (access + refresh tokens), Argon2id password hashing
- **WhatsApp**: Baileys (multi-session)
- **Scheduler**: node-cron
- **Validation**: Zod
- **Logger**: Pino
- **Security**: Helmet, CORS, rate limiting, account lockout

### Frontend
- **Framework**: React 19
- **Router**: TanStack Router (file-based)
- **State**: TanStack Query
- **Styling**: TailwindCSS 4
- **Charts**: Recharts
- **Icons**: Lucide React
- **PWA**: vite-plugin-pwa
- **Real-time**: Socket.IO client

### Infrastructure
- **Container**: Docker + Docker Compose
- **Proxy**: Nginx
- **CI/CD**: GitHub Actions
- **Backup**: Automated PostgreSQL backups

## Features

- **Multi-tenant**: Superadmin + Mitra roles with data isolation
- **Customer Management**: CRUD, CSV import/export, status tracking
- **Billing**: Auto-generated invoices, payment tracking, public receipts
- **Finance**: Revenue reports, charts, period/mitra breakdown, CSV export
- **WhatsApp Bot**: Multi-session, auto reminders, payment receipts, isolation notices
- **Anti-banned**: Rate limiting, random delays, batch cooldowns, jitter
- **Dashboard**: Real-time stats, revenue charts, payment progress
- **PWA**: Installable, offline-capable, mobile-first dark UI
- **Security**: JWT refresh rotation, optimistic locking, Zod validation

## Quick Start

### Prerequisites
- Node.js 22+
- PostgreSQL 16+
- npm 10+

### Development

```bash
# Clone
git clone <repo-url>
cd FibernodeInternet

# Backend
cd backend
cp .env.example .env  # Edit with your values
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Docker Compose (Production)

```bash
cp .env.example .env  # Edit with production values
docker compose up -d
```

Access at `http://localhost` (Nginx proxy).

## Project Structure

```
FibernodeInternet/
├── backend/
│   ├── src/
│   │   ├── config/env.ts          # Zod-validated env
│   │   ├── db/                    # Schema, migrations, seed
│   │   ├── lib/                   # Socket.IO, WA manager
│   │   ├── middleware/            # Auth, error, rate limit
│   │   ├── modules/
│   │   │   ├── auth/              # Login, refresh, profile
│   │   │   ├── users/             # Mitra CRUD
│   │   │   ├── packages/          # Package CRUD
│   │   │   ├── customers/         # Customer CRUD + CSV
│   │   │   ├── invoices/          # Billing + receipts
│   │   │   ├── finance/           # Reports + export
│   │   │   ├── dashboard/         # Stats
│   │   │   ├── settings/          # App config
│   │   │   ├── whatsapp/          # Bot, queue, scheduler
│   │   │   └── uploads/           # File uploads
│   │   ├── utils/                 # JWT, password, CSV, logger
│   │   └── index.ts               # Server entry
│   ├── drizzle.config.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── lib/                   # API client, auth, socket, utils
│   │   ├── routes/                # TanStack Router file-based routes
│   │   │   ├── __root.tsx
│   │   │   ├── login.tsx
│   │   │   ├── _authenticated.tsx # Layout with sidebar + bottom nav
│   │   │   └── _authenticated/
│   │   │       ├── index.tsx      # Dashboard
│   │   │       ├── customers.tsx
│   │   │       ├── invoices.tsx
│   │   │       ├── finance.tsx
│   │   │       ├── whatsapp.tsx
│   │   │       ├── profile.tsx
│   │   │       └── admin/
│   │   ├── styles/globals.css
│   │   └── main.tsx
│   ├── vite.config.ts
│   ├── Dockerfile
│   └── package.json
├── nginx/                         # Reverse proxy config
├── scripts/                       # Backup scripts
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Superadmin | superadmin | Admin123! |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Get profile |
| PATCH | /api/auth/me | Update profile |
| GET/POST | /api/users | List/Create mitras |
| GET/PATCH/DELETE | /api/users/:id | Get/Update/Delete mitra |
| GET/POST | /api/packages | List/Create packages |
| GET/PATCH/DELETE | /api/packages/:id | Get/Update/Delete package |
| GET/POST | /api/customers | List/Create customers |
| POST | /api/customers/import | CSV import |
| GET | /api/customers/export | CSV export |
| GET/PATCH/DELETE | /api/customers/:id | Get/Update/Delete customer |
| PATCH | /api/customers/:id/isolate | Toggle isolation |
| GET | /api/invoices | List invoices |
| POST | /api/invoices/generate | Generate invoices |
| PATCH | /api/invoices/:id/pay | Mark as paid |
| PATCH | /api/invoices/:id/unpay | Mark as unpaid |
| GET | /api/receipt/:token | Public receipt |
| GET | /api/finance/summary | Financial summary |
| GET | /api/finance/by-period | By period |
| GET | /api/dashboard/stats | Dashboard stats |
| GET/PATCH | /api/settings | App settings |
| GET/POST | /api/wa/* | WhatsApp bot |
| GET | /api/health | Health check |

## License

Private - All rights reserved.
