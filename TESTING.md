# FiberNode Internet — Panduan Testing

Panduan lengkap untuk menjalankan dan menguji aplikasi FiberNode Internet di MacBook, baik menggunakan Docker maupun secara lokal.

---

## Prasyarat

### Untuk Testing Lokal
- **Node.js 22+** — `brew install node@22`
- **PostgreSQL 16+** — `brew install postgresql@16`
- **npm 10+** — sudah termasuk dengan Node.js 22

### Untuk Testing Docker
- **Docker Desktop for Mac** — [Download](https://www.docker.com/products/docker-desktop/)
  - Pastikan Docker Desktop sudah running (ikon Docker di menu bar)
  - Minimal 4GB RAM dialokasikan untuk Docker

---

## Opsi 1: Testing dengan Docker (Rekomendasi)

### 1. Setup Environment

```bash
cd ~/Desktop/FibernodeInternet

# Copy dan edit environment variables
cp .env.example .env
```

Edit file `.env`:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=fibernode

JWT_SECRET=my-super-secret-jwt-key-min-32-chars-long
JWT_REFRESH_SECRET=my-super-secret-refresh-key-min-32-chars
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

CORS_ORIGIN=http://localhost

ADMIN_USERNAME=superadmin
ADMIN_PASSWORD=Admin123!
ADMIN_NAME=Super Admin
ADMIN_BUSINESS_NAME=FiberNode Pusat
```

### 2. Build dan Jalankan

```bash
# Build semua images
docker compose build

# Jalankan semua services
docker compose up -d

# Cek status containers
docker compose ps

# Lihat logs backend
docker compose logs -f backend

# Lihat logs semua services
docker compose logs -f
```

### 3. Verifikasi Services

```bash
# Health check backend
curl http://localhost/api/health
# Expected: {"status":"ok","timestamp":"..."}

# Cek database
docker compose exec postgres psql -U postgres -d fibernode -c "SELECT count(*) FROM users;"

# Cek apakah seed data berhasil
docker compose exec postgres psql -U postgres -d fibernode -c "SELECT username, role, business_name FROM users;"
```

### 4. Test Login

```bash
# Login sebagai superadmin
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"Admin123!"}'
```

Simpan `accessToken` dari response untuk request berikutnya:

```bash
# Set token (ganti dengan token dari response login)
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Get profile
curl http://localhost/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Get dashboard stats
curl http://localhost/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"

# List packages
curl http://localhost/api/packages \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Test CRUD Operations

```bash
# Buat paket baru
curl -X POST http://localhost/api/packages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Paket 10 Mbps","speed":"10 Mbps","price":100000}'

# Buat mitra baru
curl -X POST http://localhost/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"username":"mitra1","password":"Mitra123!","name":"Mitra Satu","businessName":"WiFi Sukamaju"}'

# Buat pelanggan baru (ganti packageId dengan ID dari response sebelumnya)
curl -X POST http://localhost/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Ahmad Fauzi","phone":"6281234567890","packageId":"<PACKAGE_ID>","billingDate":5}'
```

### 6. Test Frontend

Buka browser dan akses:
- **http://localhost** — Halaman login
- Login dengan `superadmin` / `Admin123!`
- Navigasi ke Dashboard, Pelanggan, Tagihan, dll.

### 7. Stop dan Cleanup

```bash
# Stop semua services
docker compose down

# Stop dan hapus volumes (reset database)
docker compose down -v

# Hapus images
docker compose down --rmi all -v
```

---

## Opsi 2: Testing Lokal (Development)

### 1. Setup PostgreSQL

```bash
# Start PostgreSQL (jika install via Homebrew)
brew services start postgresql@16

# Buat database
createdb fibernode

# Verifikasi
psql -d fibernode -c "SELECT 1;"
```

### 2. Setup Backend

```bash
cd ~/Desktop/FibernodeInternet/backend

# Copy environment file
cp .env.example .env
```

Edit `backend/.env`:
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://$(whoami):@localhost:5432/fibernode

JWT_SECRET=dev-jwt-secret-key-minimum-32-characters
JWT_REFRESH_SECRET=dev-refresh-secret-minimum-32-characters
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

CORS_ORIGIN=http://localhost:3000

LOG_LEVEL=debug

ADMIN_USERNAME=superadmin
ADMIN_PASSWORD=Admin123!
ADMIN_NAME=Super Admin
ADMIN_BUSINESS_NAME=FiberNode Pusat

TZ=Asia/Jakarta
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
```

```bash
# Install dependencies (dari root)
cd ~/Desktop/FibernodeInternet
npm install

# Generate database migrations
npm run db:generate --workspace=backend

# Push schema ke database
npm run db:push --workspace=backend

# Seed data awal (superadmin)
npm run db:seed --workspace=backend

# Jalankan backend (development mode dengan hot reload)
npm run dev --workspace=backend
```

Backend akan berjalan di **http://localhost:4000**

### 3. Setup Frontend

Buka terminal baru:

```bash
cd ~/Desktop/FibernodeInternet

# Jalankan frontend (development mode dengan hot reload)
npm run dev --workspace=frontend
```

Frontend akan berjalan di **http://localhost:3000**

### 4. Verifikasi

```bash
# Health check
curl http://localhost:4000/api/health

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"Admin123!"}'
```

Buka **http://localhost:3000** di browser untuk akses frontend.

### 5. Test TypeScript Build

```bash
cd ~/Desktop/FibernodeInternet

# Backend type check
npx tsc --noEmit --project backend/tsconfig.json

# Frontend type check (setelah vite build generate routeTree)
npx tsc --noEmit --project frontend/tsconfig.json

# Frontend production build
npm run build --workspace=frontend
```

---

## Test Checklist

### Backend API
- [ ] `POST /api/auth/login` — Login berhasil
- [ ] `POST /api/auth/refresh` — Refresh token berhasil
- [ ] `POST /api/auth/logout` — Logout berhasil
- [ ] `GET /api/auth/me` — Get profile berhasil
- [ ] `PATCH /api/auth/me` — Update profile berhasil
- [ ] `GET /api/users` — List mitra (superadmin only)
- [ ] `POST /api/users` — Buat mitra baru
- [ ] `GET /api/packages` — List paket
- [ ] `POST /api/packages` — Buat paket baru
- [ ] `GET /api/customers` — List pelanggan
- [ ] `POST /api/customers` — Buat pelanggan baru
- [ ] `PATCH /api/customers/:id` — Update pelanggan
- [ ] `PATCH /api/customers/:id/isolate` — Isolir pelanggan
- [ ] `GET /api/invoices` — List tagihan
- [ ] `POST /api/invoices/generate` — Generate tagihan
- [ ] `PATCH /api/invoices/:id/pay` — Tandai bayar
- [ ] `PATCH /api/invoices/:id/unpay` — Batalkan bayar
- [ ] `GET /api/finance/summary` — Ringkasan keuangan
- [ ] `GET /api/dashboard/stats` — Dashboard stats
- [ ] `GET /api/settings` — Get settings
- [ ] `GET /api/wa/status` — Status WhatsApp
- [ ] `GET /api/health` — Health check

### Frontend Pages
- [ ] Login page — form login berfungsi
- [ ] Dashboard — stats dan chart tampil
- [ ] Pelanggan — list, search, filter
- [ ] Tagihan — list, filter, bayar
- [ ] Keuangan — chart dan summary
- [ ] WhatsApp — status koneksi
- [ ] Profil — edit profil
- [ ] Admin > Mitra — list mitra (superadmin)
- [ ] Admin > Paket — list paket (superadmin)
- [ ] Admin > Settings — pengaturan (superadmin)

### Security
- [ ] Rate limiting aktif (coba login salah 5x)
- [ ] JWT expired → auto refresh
- [ ] Mitra tidak bisa akses data mitra lain
- [ ] Mitra tidak bisa isolir pelanggan
- [ ] Mitra hanya bisa edit phone & discount pelanggan

---

## Troubleshooting

### Docker: Port sudah dipakai
```bash
# Cek port yang dipakai
lsof -i :80
lsof -i :4000
lsof -i :5432

# Kill process
kill -9 <PID>
```

### Docker: Container tidak start
```bash
# Lihat logs detail
docker compose logs backend
docker compose logs postgres

# Rebuild dari awal
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Lokal: PostgreSQL tidak bisa connect
```bash
# Cek status PostgreSQL
brew services list | grep postgresql

# Restart PostgreSQL
brew services restart postgresql@16

# Cek apakah database ada
psql -l | grep fibernode
```

### Lokal: argon2 build error (Apple Silicon)
```bash
# Install build tools
xcode-select --install

# Rebuild native modules
npm rebuild argon2
```

### Frontend: routeTree.gen.ts not found
```bash
# File ini auto-generated saat build/dev
cd frontend
npx vite build
# atau jalankan dev server: npx vite
```
