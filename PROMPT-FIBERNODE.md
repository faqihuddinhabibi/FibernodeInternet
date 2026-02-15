# PROMPT: FiberNode Internet - Sistem Manajemen Tagihan Langganan WiFi

## Ringkasan Proyek

Bangun website (PWA) + aplikasi Android/iOS bernama **"FiberNode Internet"** untuk manajemen tagihan langganan WiFi. Tampilan minimal, mendukung mode dark dan light. Sistem multi-tenant dimana Superadmin mengelola beberapa Mitra, dan setiap Mitra mengelola pelanggan WiFi-nya masing-masing. Superadmin juga bisa memiliki pelanggan sendiri.

**Fitur Utama:**
- Manajemen pelanggan & tagihan bulanan
- Bot WhatsApp otomatis (pengingat tagihan H-1, notifikasi pembayaran, nota elektronik) + kirim pesan manual
- Laporan keuangan lengkap (per mitra, per bulan/tahun, ekspor data)
- Import data pelanggan via CSV
- Isolir pelanggan (stop tagihan otomatis)
- Splash screen 3 detik (logo editable oleh superadmin) + auto-update versi baru
- PWA agar bisa diinstall di Android/iOS tanpa publish ke store

---

## Tech Stack (Referensi: Desa Digital)

### Backend
- **Runtime:** Node.js 22
- **Framework:** Express.js 5
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Functional:** Effect-TS
- **Auth:** JWT dengan refresh token
- **Logging:** Pino
- **Validation:** Zod
- **Testing:** Vitest + Supertest
- **Dokumentasi API:** Swagger/OpenAPI
- **WhatsApp Bot:** Baileys (@whiskeysockets/baileys) — multi-session, scan QR per mitra
- **Job Scheduler:** node-cron (untuk kirim tagihan otomatis H-1)
- **CSV Parser:** papaparse (untuk import data pelanggan)
- **Catatan:** Tidak menggunakan Sentry

### Frontend
- **Framework:** React 19 + TanStack Router + TanStack Query
- **Styling:** TailwindCSS 4
- **Icons:** Lucide React
- **Components:** shadcn/ui
- **Theme:** Dark/Light mode toggle
- **State:** TanStack Query untuk server state
- **QR Code:** qrcode.react (untuk tampilkan QR WhatsApp)
- **Charts:** Recharts (untuk grafik keuangan)
- **CSV Export:** file-saver + xlsx (untuk ekspor laporan)
- **Testing:** Vitest
- **PWA:** vite-plugin-pwa (service worker, manifest, offline support)

### DevOps
- **Container:** Docker + Docker Compose (multi-stage build dengan caching)
- **CI/CD:** GitHub Actions (lint, test, build, push image, auto-versioning)
- **Registry:** GitHub Container Registry (ghcr.io)
- **Deploy:** Portainer GUI (webhook auto-deploy saat image baru di-push)
- **Versioning:** Semantic Versioning (auto-bump via CI/CD)
- **Auto-Update:** Frontend cek versi baru secara berkala, tampilkan banner update
- **Domain:** Custom domain (opsional, bisa pakai IP dulu)

---

## Struktur Role dan Permission

### 1. Superadmin
- CRUD Mitra (buat akun mitra, edit, hapus, lihat semua)
- CRUD Pelanggan milik sendiri (tambah, edit semua field, hapus)
- Edit & isolir pelanggan milik mitra manapun (full access)
- CRUD Paket Internet (global, berlaku untuk semua mitra)
- Import pelanggan via CSV (assign ke mitra tertentu saat import)
- Melihat keuangan keseluruhan (semua mitra + milik sendiri)
- Melihat keuangan per mitra (filter)
- Setting website (logo, meta tag, SSL, custom domain)
- Scan QR WhatsApp sendiri (untuk pelanggan milik superadmin)
- Kirim pesan WA manual ke pelanggan (individual atau bulk)
- Konfigurasi nota elektronik (toggle field apa saja yang ditampilkan)
- Download rekapan keuangan (pilih rentang tanggal)
- Ekspor data pelanggan & tagihan

### 2. Mitra (Admin)
- Menambahkan pelanggan baru (milik sendiri)
- Mengedit pelanggan milik sendiri — **HANYA nomor telepon dan diskon** (field lain read-only)
- Menambahkan diskon ke pelanggan
- Menandai pembayaran (sudah bayar / belum bayar)
- Melihat keuangan milik sendiri (per bulan, per tahun, per tanggal)
- Melihat daftar pelanggan yang sudah bayar & belum bayar
- Melihat total nominal yang belum terkumpul
- Download rekapan keuangan (pilih rentang tanggal)
- Scan QR WhatsApp sendiri (untuk pelanggan milik mitra)
- Kirim pesan WA manual ke pelanggan miliknya (individual atau bulk)
- Mengatur nomor rekening untuk pembayaran transfer
- **TIDAK BISA:** mengisolir pelanggan (hanya Superadmin)
- **TIDAK BISA:** import pelanggan via CSV (hanya Superadmin)
- **TIDAK BISA:** ekspor data pelanggan
- **TIDAK BISA:** membuat/edit/hapus paket internet
- **TIDAK BISA:** melihat data mitra lain
- **TIDAK BISA:** mengakses setting website

### Pelanggan
- **TIDAK memiliki akun login**
- Hanya sebagai data yang dikelola oleh Superadmin/Mitra
- Menerima notifikasi WhatsApp otomatis (tagihan, pembayaran, isolir)

---

## Struktur Hierarki Data

```
Superadmin
├── Paket Internet (global)
│   ├── Paket 10 Mbps - Rp 100.000
│   ├── Paket 20 Mbps - Rp 150.000
│   └── Paket 50 Mbps - Rp 250.000
├── Pelanggan Superadmin (area = FiberNode Pusat)
│   ├── Pelanggan A (Paket 10 Mbps)
│   └── Pelanggan B (Paket 20 Mbps)
├── Mitra 1 - "WiFi Sukamaju" (area = WiFi Sukamaju)
│   ├── Pelanggan C (Paket 10 Mbps)
│   ├── Pelanggan D (Paket 50 Mbps, diskon Rp 10.000)
│   └── Pelanggan E (Paket 20 Mbps, ISOLIR)
└── Mitra 2 - "Net Mekarjaya" (area = Net Mekarjaya)
    ├── Pelanggan F (Paket 20 Mbps)
    └── Pelanggan G (Paket 10 Mbps)
```

> **Catatan Area:** "Area" pada pelanggan = `businessName` dari owner yang memiliki pelanggan tersebut. Bukan lokasi geografis. Superadmin **juga wajib mengisi `businessName`** (contoh: "FiberNode Pusat") karena superadmin juga punya pelanggan sendiri. Di CSV import, kolom `area` digunakan untuk mencocokkan pelanggan ke owner berdasarkan `businessName` — bisa ke mitra maupun ke superadmin sendiri.

---

## Database Schema (Drizzle ORM)

### Enums
```typescript
export const userRoleEnum = pgEnum('user_role', ['superadmin', 'mitra']);
export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'paid', 'partial']);
export const customerStatusEnum = pgEnum('customer_status', ['active', 'isolated', 'inactive']);
export const waSessionStatusEnum = pgEnum('wa_session_status', ['disconnected', 'connecting', 'connected']);
```

### Tables

#### 1. users (Superadmin & Mitra)
```typescript
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  phone: varchar('phone', { length: 20 }),           // Nomor HP mitra
  businessName: varchar('business_name', { length: 255 }).notNull().unique(), // Nama usaha (WAJIB, UNIK untuk semua role — digunakan sebagai "area" pelanggan & key CSV import)
  bankName: varchar('bank_name', { length: 100 }),    // Nama bank untuk transfer
  bankAccount: varchar('bank_account', { length: 50 }), // Nomor rekening
  bankHolder: varchar('bank_holder', { length: 255 }), // Nama pemilik rekening
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### 2. packages (Paket Internet — global, dibuat Superadmin)
```typescript
export const packages = pgTable('packages', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),     // "Paket 10 Mbps"
  speed: varchar('speed', { length: 50 }).notNull(),     // "10 Mbps"
  price: integer('price').notNull(),                      // Harga dalam Rupiah (100000 = Rp 100.000)
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

> **Catatan Soft Delete Paket:** Paket dengan `isActive = false` tidak ditampilkan di dropdown saat tambah/edit pelanggan. Namun pelanggan yang sudah menggunakan paket tersebut **tetap bisa berjalan** (tidak otomatis diubah). Paket tidak bisa di-delete jika masih dipakai oleh pelanggan (`onDelete: 'restrict'`).

#### 3. customers (Pelanggan — milik Superadmin atau Mitra)
```typescript
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'restrict' }), // Superadmin atau Mitra yang memiliki (restrict: tidak bisa hapus mitra jika masih punya pelanggan)
  packageId: uuid('package_id').notNull().references(() => packages.id, { onDelete: 'restrict' }), // restrict: tidak bisa hapus paket jika masih dipakai pelanggan
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),     // Nomor WA pelanggan
  nik: varchar('nik', { length: 20 }),                    // NIK (opsional)
  address: text('address'),
  billingDate: integer('billing_date').notNull(),          // Tanggal tagihan (1-28), tagihan untuk BULAN DEPAN (pra-bayar)
  discount: integer('discount').default(0).notNull(),      // Diskon dalam Rupiah (bisa diubah oleh Mitra)
  totalBill: integer('total_bill').notNull(),              // Total bayar setelah diskon (harga paket - diskon). Auto-recalculate saat discount atau packageId berubah.
  status: customerStatusEnum('status').default('active').notNull(),
  registerDate: date('register_date').defaultNow().notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ([
  index('idx_customers_owner').on(table.ownerId),
  index('idx_customers_phone').on(table.phone),
  index('idx_customers_billing_date').on(table.billingDate),
  index('idx_customers_status').on(table.status),
]));
```

> **Catatan Area:** Field `area` tidak disimpan di tabel `customers`. Area pelanggan = `businessName` dari owner. Superadmin juga wajib punya `businessName` (contoh: "FiberNode Pusat") karena superadmin juga memiliki pelanggan sendiri.

> **Catatan Edit oleh Mitra:** Mitra hanya bisa mengubah field `phone` dan `discount` pada pelanggan miliknya. Field lain (nama, paket, tanggal tagihan, NIK, dll) hanya bisa diubah oleh Superadmin.

> **Catatan Perubahan Diskon:** Saat `discount` diubah (oleh Mitra atau Superadmin), `totalBill` otomatis di-recalculate (`package.price - discount`). Perubahan diskon **TIDAK** mempengaruhi invoice yang sudah di-generate (invoice menyimpan snapshot diskon saat generate). Hanya invoice **berikutnya** yang menggunakan diskon baru.

> **Catatan Validasi Nomor Telepon:** Format wajib: hanya digit, dimulai dengan `62`, panjang 10-15 digit. Contoh valid: `6281234567890`. Validasi dilakukan saat tambah pelanggan, edit nomor, dan import CSV. Pengecekan `onWhatsApp()` (apakah nomor terdaftar di WA) bersifat opsional — hanya dilakukan jika session WA terkoneksi.

#### 4. invoices (Tagihan Bulanan — PRA-BAYAR untuk bulan depan)
```typescript
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'restrict' }),  // Denormalisasi untuk query cepat. Restrict: tidak bisa hapus user jika masih punya invoice
  period: varchar('period', { length: 7 }).notNull(),     // Format: "2026-03" — bulan YANG AKAN DATANG (pra-bayar)
  amount: integer('amount').notNull(),                      // Nominal tagihan (harga paket)
  discount: integer('discount').default(0).notNull(),       // Diskon saat itu (snapshot dari customer.discount)
  totalAmount: integer('total_amount').notNull(),           // amount - discount
  status: paymentStatusEnum('status').default('unpaid').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  paidBy: uuid('paid_by').references(() => users.id),      // Siapa yang menandai bayar
  paymentMethod: varchar('payment_method', { length: 50 }), // 'cash', 'transfer', dll
  paymentNote: text('payment_note'),
  dueDate: date('due_date').notNull(),                      // Tanggal jatuh tempo (= billingDate bulan ini)
  receiptUrl: varchar('receipt_url', { length: 500 }),      // URL halaman nota web (public, unique per invoice)
  receiptToken: varchar('receipt_token', { length: 100 }).unique(), // Token unik untuk akses nota tanpa login
  reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }), // Kapan reminder WA dikirim
  receiptSentAt: timestamp('receipt_sent_at', { withTimezone: true }),   // Kapan nota dikirim via WA
  isolirSentAt: timestamp('isolir_sent_at', { withTimezone: true }),     // Kapan notifikasi isolir dikirim via WA
  version: integer('version').default(1).notNull(),                      // Optimistic locking: cegah race condition saat concurrent pay/unpay
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ([
  index('idx_invoices_customer').on(table.customerId),
  index('idx_invoices_owner').on(table.ownerId),
  index('idx_invoices_period').on(table.period),
  index('idx_invoices_status').on(table.status),
  index('idx_invoices_due_date').on(table.dueDate),
  // Unique constraint: 1 invoice per customer per period
  uniqueIndex('idx_invoices_customer_period').on(table.customerId, table.period),
]));
```

> **Sistem Pra-Bayar:** Tagihan di-generate untuk **bulan depan**. Contoh: pada tanggal 5 Februari, pelanggan dengan `billingDate=5` akan menerima tagihan untuk periode Maret 2026. Pelanggan membayar di muka sebelum bulan layanan dimulai.

> **Optimistic Locking:** Field `version` digunakan untuk mencegah race condition saat 2 admin menandai pembayaran bersamaan. Saat `PATCH /invoices/:id/pay`, backend harus cek `WHERE id = :id AND version = :currentVersion`. Jika version tidak cocok (sudah diubah oleh admin lain), return error 409 Conflict. Frontend menampilkan pesan "Data sudah diubah oleh user lain, silakan refresh."

#### 5. wa_sessions (Sesi WhatsApp per Mitra/Superadmin)
```typescript
export const waSessions = pgTable('wa_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  status: waSessionStatusEnum('status').default('disconnected').notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }),   // Nomor WA yang terkoneksi
  lastConnectedAt: timestamp('last_connected_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```
> **Catatan:** Auth state Baileys disimpan di filesystem (`/app/wa-sessions/{userId}/`) bukan di database, karena ukurannya besar dan sering berubah. Tabel ini hanya menyimpan metadata status.

#### 6. wa_message_logs (Log Pesan WA yang Terkirim)
```typescript
export const waMessageLogs = pgTable('wa_message_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => waSessions.id, { onDelete: 'set null' }), // Nullable: pesan bisa gagal saat session belum ada
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  messageType: varchar('message_type', { length: 50 }).notNull(), // 'reminder', 'receipt', 'isolation', 'custom', 'manual'
  phone: varchar('phone', { length: 20 }).notNull(),
  content: text('content').notNull(),                              // Isi pesan yang dikirim
  status: varchar('status', { length: 20 }).notNull(),             // 'sent', 'delivered', 'failed'
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ([
  index('idx_wa_logs_session').on(table.sessionId),
  index('idx_wa_logs_customer').on(table.customerId),
  index('idx_wa_logs_type').on(table.messageType),
]));
```

#### 7. settings (Pengaturan Website & Nota)
```typescript
export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Keys yang digunakan:
// - app_name: "FiberNode Internet"
// - logo_url: URL logo perusahaan
// - favicon_url: URL favicon
// - meta_description: Meta description website
// - domain: Custom domain
// - ssl_method: 'none' | 'letsencrypt' | 'cloudflare'
// - receipt_logo_enabled: 'true' | 'false'
// - receipt_show_company_name: 'true' | 'false'
// - receipt_show_customer_phone: 'true' | 'false'
// - receipt_show_nik: 'true' | 'false'
// - receipt_show_area: 'true' | 'false'
// - receipt_show_package: 'true' | 'false'
// - receipt_show_discount: 'true' | 'false'
// - receipt_show_payment_method: 'true' | 'false'
// - receipt_show_paid_by: 'true' | 'false'
// - receipt_footer_text: Teks footer nota
// - splash_logo_url: URL logo splash screen (fallback ke logo_url jika kosong)
// - splash_bg_color: Warna background splash screen (default: primary color)
// - app_version: Versi aplikasi saat ini (auto-update dari CI/CD, read-only di UI)
```

#### 8. refresh_tokens
```typescript
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 500 }).notNull().unique(),
  userAgent: varchar('user_agent', { length: 500 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ([
  index('idx_refresh_tokens_user_id').on(table.userId),
  index('idx_refresh_tokens_expires').on(table.expiresAt),
]));
```

#### 9. activity_logs
```typescript
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### 10. wa_message_queue (Antrian Pesan WA — HANYA untuk pengingat tagihan)
```typescript
// Lihat detail lengkap di bagian "Strategi Anti-Banned WhatsApp"
// Tabel ini HANYA digunakan untuk pesan pengingat tagihan (reminder H-1)
// Nota pembayaran dan notifikasi isolir dikirim LANGSUNG (tidak masuk queue)
export const waMessageQueue = pgTable('wa_message_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => waSessions.id),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  messageType: varchar('message_type', { length: 50 }).notNull().default('reminder'),
  phone: varchar('phone', { length: 20 }).notNull(),
  content: text('content').notNull(),
  priority: integer('priority').default(0).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ([
  index('idx_wa_queue_status_scheduled').on(table.status, table.scheduledAt),
  index('idx_wa_queue_session').on(table.sessionId),
]));
```

#### 11. login_attempts
```typescript
export const loginAttempts = pgTable('login_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 100 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  success: boolean('success').notNull(),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ([
  index('idx_login_attempts_username_created').on(table.username, table.createdAt),
  index('idx_login_attempts_ip_created').on(table.ipAddress, table.createdAt),
]));
```

---

## API Endpoints

### Auth
```
POST   /api/auth/login           - Login dengan username/password
POST   /api/auth/refresh         - Refresh access token
POST   /api/auth/logout          - Logout (invalidate refresh token)
GET    /api/auth/me              - Get current user profile
PATCH  /api/auth/me              - Update profil sendiri (nama, password)
```

### Users / Mitra (Superadmin only)
```
GET    /api/users                - List semua mitra
POST   /api/users                - Buat mitra baru
GET    /api/users/:id            - Get mitra by ID
PATCH  /api/users/:id            - Update mitra
DELETE /api/users/:id            - Soft delete mitra (set isActive = false). GAGAL jika mitra masih punya pelanggan — harus pindahkan/hapus pelanggan dulu.
```

### Packages / Paket (Superadmin only)
```
GET    /api/packages             - List semua paket (semua role bisa akses)
POST   /api/packages             - Buat paket baru
GET    /api/packages/:id         - Get paket by ID
PATCH  /api/packages/:id         - Update paket
DELETE /api/packages/:id         - Soft delete paket
```

### Customers / Pelanggan
```
GET    /api/customers            - List pelanggan (filtered by ownership)
POST   /api/customers            - Tambah pelanggan baru (Superadmin + Mitra)
POST   /api/customers/import     - Import pelanggan dari CSV (Superadmin only, assign ke mitra via kolom area)
GET    /api/customers/:id        - Get pelanggan by ID
PATCH  /api/customers/:id        - Update pelanggan (Mitra: hanya phone & discount. Superadmin: semua field)
DELETE /api/customers/:id        - Hapus pelanggan (Superadmin only)
PATCH  /api/customers/:id/isolate   - Isolir pelanggan toggle (Superadmin only)
GET    /api/customers/export     - Ekspor data pelanggan CSV/Excel (Superadmin only)
```

### Invoices / Tagihan (Pra-Bayar — tagihan untuk bulan depan)
```
GET    /api/invoices             - List tagihan (filtered by ownership, period, status)
GET    /api/invoices/:id         - Get tagihan by ID
PATCH  /api/invoices/:id/pay     - Tandai sudah bayar (catat siapa yang menandai)
PATCH  /api/invoices/:id/unpay   - Batalkan pembayaran (kembalikan ke unpaid)
POST   /api/invoices/generate    - Generate tagihan pra-bayar bulan depan (Superadmin: manual trigger untuk semua/per mitra. Cron: otomatis H-1)
GET    /api/invoices/export      - Ekspor tagihan (CSV/Excel, dengan filter tanggal)
```

### Nota Pembayaran (Public — tanpa login)
```
GET    /api/receipt/:token       - Halaman nota pembayaran web (public, akses via token unik)
```

### Finance / Keuangan
```
GET    /api/finance/summary      - Ringkasan keuangan (Mitra: miliknya, Superadmin: semua)
GET    /api/finance/by-period    - Keuangan per bulan/tahun (filtered by ownership)
GET    /api/finance/by-date      - Keuangan per tanggal (siapa bayar, siapa belum)
GET    /api/finance/by-mitra     - Keuangan per mitra (Superadmin only)
GET    /api/finance/export       - Ekspor rekapan keuangan (Superadmin: semua/per mitra, Mitra: miliknya saja)
```

### WhatsApp Bot
```
GET    /api/wa/status            - Status sesi WA user saat ini
POST   /api/wa/connect           - Mulai koneksi WA (generate QR)
POST   /api/wa/disconnect        - Putuskan koneksi WA
GET    /api/wa/qr                - Get QR code terbaru (polling atau WebSocket)
POST   /api/wa/send-test         - Kirim pesan test ke nomor tertentu
POST   /api/wa/send-manual       - Kirim pesan manual ke 1 pelanggan (custom text atau template)
POST   /api/wa/send-bulk         - Kirim pesan manual ke banyak pelanggan sekaligus (masuk queue)
POST   /api/wa/check-number      - Cek apakah nomor terdaftar di WhatsApp (via onWhatsApp API)
GET    /api/wa/logs              - Riwayat pesan WA yang terkirim (filter: type, date, status)
GET    /api/wa/queue             - Status antrian pesan (pending, sending, sent, failed)
POST   /api/wa/queue/:id/retry   - Retry pesan gagal secara manual
DELETE /api/wa/queue/:id         - Batalkan pesan yang masih pending di queue
```

### Settings (Superadmin only)
```
GET    /api/settings             - Get semua settings
PATCH  /api/settings             - Update settings (batch)
GET    /api/settings/branding    - Get branding info (public, tanpa auth — termasuk app_name, logo_url, splash_logo_url, app_version)
POST   /api/settings/upload-logo - Upload logo perusahaan (untuk header, nota, dan splash screen)
```

### Dashboard
```
GET    /api/dashboard/stats      - Statistik (jumlah pelanggan, tagihan bulan ini, pendapatan, dll)
```

---

## Halaman Frontend

### 1. Public (Tanpa Login)
- **Splash Screen** — Ditampilkan 3 detik saat pertama buka aplikasi (logo + nama app + versi). Setelah 3 detik, redirect ke `/login` (jika belum login) atau `/` (jika sudah login). **Tidak ada company profile / landing page.**
- `/login` — Halaman login (halaman pertama setelah splash screen)
- `/receipt/:token` — Halaman nota pembayaran web (public, akses via link unik)
- **Tidak ada halaman register** — semua akun dibuat oleh Superadmin
- **Tidak ada company profile / landing page** — langsung splash → login

### 2. Protected (Semua Role)
- `/` — Dashboard (statistik, grafik keuangan, tagihan jatuh tempo)
- `/customers` — Daftar pelanggan (Mitra: tambah + edit phone/diskon saja. Superadmin: full CRUD + import CSV + isolir + ekspor)
- `/customers/:id` — Detail pelanggan (riwayat tagihan, status WA)
- `/invoices` — Daftar tagihan pra-bayar (filter: bulan, status, tanggal)
- `/finance` — Laporan keuangan (grafik, tabel)
- `/finance/report` — Rekapan keuangan (pilih rentang tanggal, download)
- `/whatsapp` — Pengaturan WhatsApp (scan QR, status koneksi, kirim pesan manual, antrian, log pesan)
- `/profile` — Edit profil sendiri (nama, password, nomor rekening untuk mitra)

### 3. Superadmin Only
- `/admin/mitra` — CRUD Mitra
- `/admin/packages` — CRUD Paket Internet
- `/admin/settings` — Setting website (logo, meta tag, SSL, domain, konfigurasi nota)
- `/admin/finance` — Keuangan keseluruhan + per mitra + ekspor data

---

## Fitur WhatsApp Bot (Baileys)

### Arsitektur Multi-Session
```
Superadmin ──scan QR──▶ Session A (nomor WA superadmin)
                         └── Kirim ke pelanggan milik superadmin

Mitra 1 ────scan QR──▶ Session B (nomor WA mitra 1)
                         └── Kirim ke pelanggan milik mitra 1

Mitra 2 ────scan QR──▶ Session C (nomor WA mitra 2)
                         └── Kirim ke pelanggan milik mitra 2
```

### Penyimpanan Session
```
/app/wa-sessions/
├── {superadmin-uuid}/
│   ├── creds.json
│   ├── app-state-sync-key-*.json
│   └── ...
├── {mitra1-uuid}/
│   └── ...
└── {mitra2-uuid}/
    └── ...
```

### Koneksi & QR Code
```typescript
// Backend: Baileys multi-session manager
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';

const logger = pino({ level: 'silent' });

async function createSession(userId: string) {
  const authDir = `/app/wa-sessions/${userId}`;
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    logger,
    browser: Browsers.ubuntu('FiberNode'),  // Nama device yang tampil di WA
    printQRInTerminal: false                 // QR dikirim ke frontend via Socket.IO
  });

  // Gunakan ev.process() untuk batched event handling (production-ready)
  sock.ev.process(async (events) => {
    if (events['connection.update']) {
      const { connection, lastDisconnect, qr } = events['connection.update'];
      if (qr) {
        // Kirim QR ke frontend via Socket.IO
        io.to(userId).emit('wa:qr', qr);
      }
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        await updateSessionStatus(userId, shouldReconnect ? 'connecting' : 'disconnected');
        if (shouldReconnect) createSession(userId);
      }
      if (connection === 'open') {
        await updateSessionStatus(userId, 'connected');
        io.to(userId).emit('wa:connected');
      }
    }
    if (events['creds.update']) await saveCreds();
  });

  return sock;
}
```

### Format Nomor WA (JID)
```typescript
// Baileys menggunakan JID format: [nomor]@s.whatsapp.net
// Nomor disimpan di DB tanpa suffix, ditambahkan saat kirim

function toJid(phone: string): string {
  // Hapus karakter non-digit, pastikan format internasional
  const cleaned = phone.replace(/\D/g, '');
  return `${cleaned}@s.whatsapp.net`;
}

// Contoh: '6281234567890' → '6281234567890@s.whatsapp.net'

// Cek apakah nomor terdaftar di WhatsApp sebelum kirim
async function isOnWhatsApp(sock: WASocket, phone: string): Promise<boolean> {
  const [result] = await sock.onWhatsApp(phone);
  return result?.exists ?? false;
}
```

> **Penting:** Saat menambah pelanggan atau import CSV, backend harus validasi format nomor telepon: hanya digit, dimulai dengan `62`, panjang 10-15 digit. Validasi `onWhatsApp()` bersifat **opsional** (hanya jika session WA terkoneksi) karena pelanggan bisa ditambah tanpa bot aktif.

### Kirim Pesan Manual (Tanpa Bot Otomatis)

> **Skenario:** Mitra/Superadmin belum mengaktifkan bot WA (belum scan QR), atau ingin mengirim pesan custom di luar template otomatis. Fitur ini memungkinkan pengiriman pesan WA secara manual dari dashboard.

#### Fitur Kirim Manual
1. **Kirim ke 1 pelanggan** — dari halaman detail pelanggan atau detail tagihan
   - Pilih template (pengingat tagihan / nota / isolir / custom)
   - Jika pilih template: isi otomatis dari data pelanggan, bisa diedit sebelum kirim
   - Jika pilih custom: tulis pesan bebas
   - Tombol "Kirim via WhatsApp" → langsung kirim (bukan queue)

2. **Kirim bulk ke banyak pelanggan** — dari halaman daftar pelanggan/tagihan
   - Pilih pelanggan (checkbox) atau filter (semua belum bayar, semua jatuh tempo hari ini, dll)
   - Pilih template pesan
   - Preview pesan → konfirmasi → masuk queue (dikirim bertahap seperti reminder)
   - Dicatat di `wa_message_logs` dengan `messageType = 'custom'`

3. **Kirim ulang nota/reminder** — dari halaman detail tagihan
   - Tombol "Kirim Ulang Nota" atau "Kirim Ulang Pengingat"
   - Langsung kirim (bukan queue) karena hanya 1 pesan

#### Syarat Kirim Manual
- Session WA **harus terkoneksi** (sudah scan QR)
- Jika session tidak terkoneksi → tampilkan pesan error "Hubungkan WhatsApp terlebih dahulu"
- Semua pesan manual dicatat di `wa_message_logs`

#### UI di Frontend
- **Halaman `/customers/:id`** — tombol "Kirim Pesan WA" di detail pelanggan
- **Halaman `/invoices`** — tombol "Kirim Pengingat" per tagihan + bulk action
- **Halaman `/whatsapp`** — tab "Kirim Pesan" untuk compose pesan custom

```typescript
// API: POST /api/wa/send-manual
// Body:
{
  customerId: 'uuid',           // Pelanggan tujuan
  invoiceId?: 'uuid',           // Opsional, jika terkait tagihan tertentu
  template: 'reminder' | 'receipt' | 'isolation' | 'custom',
  customMessage?: string,       // Wajib jika template = 'custom'
}

// API: POST /api/wa/send-bulk
// Body:
{
  customerIds: ['uuid', ...],   // List pelanggan tujuan
  template: 'reminder' | 'custom',
  customMessage?: string,       // Wajib jika template = 'custom'
  // Pesan bulk masuk ke queue dengan jadwal bertahap (anti-ban)
}
```

### Jenis Pesan Otomatis

#### 1. Pengingat Tagihan Pra-Bayar (H-1 sebelum jatuh tempo)
```
🔔 *Pengingat Tagihan WiFi*

Halo *{nama_pelanggan}*,

Tagihan WiFi Anda untuk *{bulan_depan} {tahun}* (pra-bayar) akan jatuh tempo besok:

📋 *Detail Tagihan:*
• Paket: {nama_paket} ({speed})
• Periode: {bulan_depan} {tahun} (pra-bayar)
• Nominal: Rp {total_bayar}
• Jatuh Tempo: {tanggal_tagihan}

💳 *Pembayaran via Transfer:*
Bank: {nama_bank}
No. Rek: {nomor_rekening}
A/N: {nama_pemilik_rekening}
Nominal: Rp {total_bayar}

Terima kasih 🙏
_{nama_usaha}_
```

#### 2. Notifikasi Isolir (LANGSUNG KIRIM — tidak masuk queue)
> **Catatan:** Isolir hanya bisa dilakukan oleh Superadmin. Pesan isolir dikirim **langsung** (tanpa queue) dari **session WA milik owner pelanggan** (bukan session superadmin), agar pelanggan menerima pesan dari nomor yang dikenal. Jika session owner tidak terkoneksi, pesan tetap dicoba kirim dan dicatat di `wa_message_logs` sebagai `failed`.

```
⚠️ *Pemberitahuan Isolir*

Halo *{nama_pelanggan}*,

Layanan WiFi Anda telah di-*isolir* karena tunggakan pembayaran.

Silakan segera lakukan pembayaran untuk mengaktifkan kembali layanan Anda.

💳 *Pembayaran via Transfer:*
Bank: {nama_bank}
No. Rek: {nomor_rekening}
A/N: {nama_pemilik_rekening}

Hubungi kami jika ada pertanyaan.
_{nama_usaha}_
```

#### 3. Nota Pembayaran (setelah status berubah ke "bayar")

Nota pembayaran memiliki **2 bentuk:**

**A. Halaman Web (public, tanpa login)**
- URL: `https://domain.com/receipt/{token_unik}`
- Halaman web responsif yang menampilkan nota pembayaran lengkap
- Bisa dibuka di browser manapun tanpa login
- Menampilkan logo perusahaan (gambar, bukan text)
- Desain profesional, bisa di-screenshot atau print
- Field yang ditampilkan sesuai konfigurasi toggle Superadmin

**B. Pesan WhatsApp (LANGSUNG KIRIM — tidak masuk queue, dikirim saat status berubah ke "bayar")**
- Dikirim **langsung** saat admin/mitra menandai pembayaran (realtime, bukan antrian)
- Berisi ringkasan data pembayaran dalam format text
- Menyertakan link ke halaman nota web
- Mencantumkan siapa yang menandai pembayaran
- Jika session WA tidak terkoneksi, dicatat di `wa_message_logs` sebagai `failed`

**Pesan WA yang dikirim:**
```
✅ *Nota Pembayaran WiFi*

Halo *{nama_pelanggan}*,

Pembayaran Anda telah dikonfirmasi oleh *{nama_pencatat}*.

📋 *Detail Pembayaran:*
• Nama: {nama_pelanggan}
• NIK: {nik}                    ← toggle
• Area: {nama_mitra}            ← toggle
• Paket: {nama_paket}           ← toggle
• Periode: {bulan} {tahun} (pra-bayar)
• Diskon: Rp {diskon}           ← toggle
• Total Bayar: *Rp {total_bayar}*
• Metode: {metode_pembayaran}   ← toggle
• Tanggal Bayar: {tanggal_bayar}

🧾 Lihat nota lengkap: {url_nota_web}

Terima kasih 🙏
_{nama_usaha}_
```

> **Toggle:** Superadmin bisa mengaktifkan/menonaktifkan field tertentu di nota (baik halaman web maupun pesan WA) via halaman Settings dengan toggle button.
> **Halaman Nota Web:** Menampilkan data yang sama dengan pesan WA, tapi dengan layout yang lebih rapi, logo perusahaan (gambar), dan bisa di-print/screenshot. Token unik di-generate saat invoice dibuat, disimpan di field `receiptToken`.

### Scheduler (node-cron)
```typescript
// Jalankan setiap hari jam 06:00 WIB (pagi)
// Cek pelanggan yang tanggal tagihannya = besok (H-1)
// Tagihan bersifat PRA-BAYAR: tagihan untuk bulan DEPAN
// Contoh: H-1 tanggal 5 Feb → kirim tagihan untuk periode Maret 2026
// MASUKKAN KE QUEUE (bukan langsung kirim) — queue worker yang mengirim bertahap
// Skip pelanggan yang status = 'isolated'

cron.schedule('0 6 * * *', async () => {
  const tomorrow = addDays(new Date(), 1).getDate();
  const customers = await getCustomersByBillingDate(tomorrow);
  
  // Filter pelanggan yang tidak di-isolir
  const activeCustomers = customers.filter(c => c.status !== 'isolated');
  
  // Generate invoice untuk bulan depan (pra-bayar) jika belum ada
  for (const customer of activeCustomers) {
    const nextMonth = getNextMonthPeriod(); // "2026-03"
    await ensureInvoiceExists(customer, nextMonth);
  }
  
  // Masukkan semua pesan ke queue dengan jadwal bertahap
  // Queue worker akan mengirim mulai jam 06:00 pagi secara bertahap
  await scheduleReminders(activeCustomers);
  
  logger.info(`Scheduled ${activeCustomers.length} reminder messages to queue`);
}, { timezone: 'Asia/Jakarta' });
```

### Pengiriman Langsung (Tanpa Queue)
Pesan berikut dikirim **langsung** saat event terjadi, **TIDAK** masuk queue:

1. **Nota pembayaran** — dikirim langsung saat admin/mitra menandai "sudah bayar"
2. **Notifikasi isolir** — dikirim langsung saat superadmin mengisolir pelanggan

Kedua jenis pesan ini bersifat **realtime** karena:
- Jumlahnya sedikit (1 pesan per aksi, bukan batch)
- User mengharapkan respons langsung setelah aksi
- Tidak ada risiko spam karena dipicu manual oleh admin

```typescript
// Contoh: saat admin menandai pembayaran
async function markAsPaid(invoiceId: string, paidBy: string) {
  const invoice = await updateInvoiceStatus(invoiceId, 'paid', paidBy);
  const customer = await getCustomer(invoice.customerId);
  const session = await getWaSession(invoice.ownerId);
  
  // Kirim nota langsung (bukan queue)
  if (session?.status === 'connected') {
    await sendReceiptDirect(session, customer, invoice);
    await logMessage(session.id, customer.id, invoice.id, 'receipt', 'sent');
  } else {
    await logMessage(session?.id, customer.id, invoice.id, 'receipt', 'failed', 'Session WA tidak terkoneksi');
  }
}
```

---

## Import CSV Pelanggan (Superadmin Only)

> **Hanya Superadmin** yang bisa import pelanggan via CSV. Mitra tidak memiliki akses fitur ini.

### Format CSV
```csv
nama,telepon,diskon,tanggal,area,paket_nama,paket_tarif,total_bayar,nik,tanggal_register
Ahmad Fauzi,6281234567890,0,5,WiFi Sukamaju,Paket 10 Mbps,100000,100000,3201234567890001,2025-01-15
Siti Nurhaliza,6289876543210,10000,10,WiFi Sukamaju,Paket 20 Mbps,150000,140000,3201234567890002,2025-02-01
Budi Santoso,6281122334455,0,15,Net Mekarjaya,Paket 50 Mbps,250000,250000,,2025-03-10
Dewi Lestari,6287766554433,20000,20,Net Mekarjaya,Paket 10 Mbps,100000,80000,3201234567890004,2025-04-05
```

### Aturan Import
1. **telepon** — format internasional tanpa `+` (contoh: `6281234567890`)
2. **diskon** — dalam Rupiah (0 jika tidak ada diskon)
3. **tanggal** — tanggal tagihan bulanan (1-28), tagihan pra-bayar untuk bulan depan
4. **area** — `businessName` dari owner (mitra atau superadmin). Digunakan untuk mencocokkan pelanggan ke owner. Contoh: `WiFi Sukamaju` (mitra) atau `FiberNode Pusat` (superadmin). Jika tidak cocok dengan owner manapun, baris akan error.
5. **paket_nama** — harus cocok dengan nama paket yang sudah ada di sistem
6. **paket_tarif** — harga paket (untuk validasi)
7. **total_bayar** — paket_tarif - diskon
8. **nik** — opsional, boleh kosong
9. **tanggal_register** — format YYYY-MM-DD

### Proses Import
1. Superadmin upload file CSV
2. Backend parse & validasi setiap baris (termasuk cocokkan `area` ke owner berdasarkan `businessName`)
3. Tampilkan preview: baris valid (hijau) & baris error (merah + alasan)
4. Superadmin konfirmasi import
5. Insert batch ke database (pelanggan otomatis ter-assign ke mitra berdasarkan `area`)
6. Tampilkan hasil: berapa berhasil, berapa gagal

---

## Fitur Keuangan (Detail)

### Dashboard Keuangan
- **Total Pelanggan Aktif** — jumlah pelanggan status active
- **Total Tagihan Bulan Ini** — total nominal tagihan bulan berjalan
- **Sudah Terbayar** — total nominal yang sudah dibayar bulan ini
- **Belum Terbayar** — total nominal yang belum dibayar bulan ini
- **Persentase Terkumpul** — (terbayar / total) × 100%
- **Grafik Pendapatan** — line chart per bulan (12 bulan terakhir)
- **Grafik Pelanggan** — bar chart pertumbuhan pelanggan

### Filter Keuangan
- **Per Bulan:** Pilih bulan & tahun → lihat detail tagihan
- **Per Tahun:** Pilih tahun → lihat ringkasan per bulan
- **Per Tanggal:** Pilih tanggal → lihat siapa yang jatuh tempo hari itu
- **Per Mitra:** (Superadmin) Pilih mitra → lihat keuangan mitra tersebut

### Tabel Detail Tagihan
| Kolom | Keterangan |
|-------|------------|
| Nama Pelanggan | Nama lengkap |
| Paket | Nama paket + speed |
| Nominal | Total tagihan |
| Status | Bayar / Belum Bayar / Sebagian |
| Tanggal Bayar | Kapan dibayar (jika sudah) |
| Dicatat Oleh | Siapa yang menandai bayar |

### Ekspor Rekapan
- Pilih **tanggal mulai** dan **tanggal akhir**
- Format: **CSV** atau **Excel (.xlsx)**
- Isi: semua tagihan dalam rentang tersebut dengan detail lengkap
- Termasuk ringkasan di baris terakhir (total, terbayar, belum)

---

## Fitur UI/UX

### Branding — FiberNode Internet

#### Color Palette
```css
/* Brand Colors */
--fibernode-primary: hsl(217 91% 60%);     /* #3B82F6 - Biru */
--fibernode-accent: hsl(142 76% 36%);      /* Hijau untuk status aktif */

/* Light Mode */
--background: hsl(0 0% 98%);
--foreground: hsl(222 47% 11%);
--primary: hsl(217 91% 60%);
--primary-foreground: hsl(0 0% 100%);
--muted: hsl(210 40% 96%);
--muted-foreground: hsl(215 16% 47%);
--accent: hsl(142 76% 36%);
--destructive: hsl(0 84% 60%);
--warning: hsl(38 92% 50%);
--border: hsl(214 32% 91%);
--card: hsl(0 0% 100%);

/* Dark Mode */
--background: hsl(222 47% 8%);
--foreground: hsl(210 40% 98%);
--primary: hsl(217 91% 65%);
--muted: hsl(217 33% 15%);
--muted-foreground: hsl(215 20% 65%);
--border: hsl(217 33% 20%);
--card: hsl(222 47% 11%);
```

### Layout

#### Desktop (>1024px)
- **Sidebar:** Fixed 260px, collapsible ke 64px (icon only)
- **Header:** Sticky, height 64px, dengan search + notifikasi + profil
- **Main:** Fluid dengan max-width 1440px

#### Mobile (<768px) — Tampilan Native-like
- **Tanpa sidebar** — gunakan bottom navigation bar
- **Bottom Nav:** 5 item (Dashboard, Pelanggan, Tagihan, WhatsApp, Profil)
- **Header:** Compact, 56px, dengan logo + notifikasi
- **Pull-to-refresh** pada halaman list
- **Swipe actions** pada item list (geser kiri = aksi cepat)
- **Floating Action Button (FAB)** untuk tambah data baru
- **Sheet/Bottom Sheet** untuk form & filter (bukan modal)
- **Gesture navigation** — swipe back untuk kembali
- **Haptic feedback** pada aksi penting (bayar, isolir)
- **Skeleton loading** yang smooth
- **Card-based layout** — setiap pelanggan/tagihan adalah card, bukan tabel

#### Perbedaan Tampilan Mobile vs Desktop

| Fitur | Desktop | Mobile |
|-------|---------|--------|
| Navigasi | Sidebar kiri | Bottom navigation bar |
| Data list | Tabel dengan kolom lengkap | Card list (swipeable) |
| Form input | Modal dialog | Bottom sheet (slide up) |
| Filter | Inline di atas tabel | Bottom sheet dengan chips |
| Aksi item | Button di kolom tabel | Swipe action / long press menu |
| Tambah data | Button di header | Floating Action Button (FAB) |
| Detail | Side panel / modal | Full screen page |
| Grafik | Lebar penuh | Scrollable horizontal |

### Splash Screen (3 detik)
- Ditampilkan **setiap kali** user membuka aplikasi (sebelum login atau dashboard)
- Durasi: **3 detik**, lalu otomatis redirect ke halaman login (jika belum login) atau dashboard (jika sudah login)
- Tampilan: logo perusahaan di tengah layar + nama aplikasi di bawah logo
- Background: warna `--primary` dengan gradient halus
- Animasi: logo fade-in + scale-up, lalu fade-out ke halaman berikutnya
- **Logo bisa diedit oleh Superadmin** via halaman Settings (upload logo baru)
- Logo diambil dari setting `splash_logo_url` (fallback ke `logo_url` jika tidak diset)
- Nama aplikasi diambil dari setting `app_name`
- Versi aplikasi ditampilkan kecil di bawah: `v{APP_VERSION}`
- Implementasi: komponen `SplashScreen.tsx` di `__root.tsx`, menggunakan `useBranding()` hook

### Login Page
- **Ini adalah halaman pertama setelah splash screen** — tidak ada company profile / landing page
- Centered card, max-width 400px
- Background: Subtle gradient
- Logo FiberNode di atas form (sama dengan logo di splash screen, dari settings)
- Form: Username + Password + Remember me
- Button: Primary blue
- Error: Shake animation + red border
- Loading: Button dengan spinner
- Versi aplikasi ditampilkan kecil di footer: `v{APP_VERSION}`

### PWA (Progressive Web App)
- **Service Worker:** Cache static assets + API responses
- **Manifest:** App name, icons, theme color, display: standalone
- **Install Prompt:** Banner "Install FiberNode" di mobile
- **Offline:** Tampilkan data terakhir yang di-cache + banner "Anda offline"
- **Push Notification:** (opsional, fase 2)

---

## Docker Compose — Services

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: fibernode-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-fibernode}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: fibernode-api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@postgres:5432/${POSTGRES_DB:-fibernode}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost}
      ADMIN_USERNAME: ${ADMIN_USERNAME:-superadmin}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:-Admin123!}
      ADMIN_NAME: ${ADMIN_NAME:-Super Admin}
      ADMIN_BUSINESS_NAME: ${ADMIN_BUSINESS_NAME:-FiberNode Pusat}
      TZ: Asia/Jakarta
    volumes:
      - wa_sessions:/app/wa-sessions
      - uploads_data:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: fibernode-web
    restart: unless-stopped
    depends_on:
      - backend

  nginx-proxy:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    container_name: fibernode-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - certs_data:/etc/nginx/certs
      - certbot_data:/var/www/certbot
    depends_on:
      - frontend
      - backend

  certbot:
    image: certbot/certbot
    container_name: fibernode-certbot
    restart: unless-stopped
    volumes:
      - certbot_data:/var/www/certbot
      - certs_data:/etc/letsencrypt
    entrypoint: /bin/sh
    command: -c "trap exit TERM; while :; do certbot renew --webroot -w /var/www/certbot --quiet; sleep 12h & wait $${!}; done"
    profiles:
      - ssl

  db-backup:
    build:
      context: ./scripts
      dockerfile: Dockerfile.backup
    container_name: fibernode-backup
    restart: unless-stopped
    environment:
      PGHOST: postgres
      PGUSER: ${POSTGRES_USER:-postgres}
      PGPASSWORD: ${POSTGRES_PASSWORD:-postgres}
      PGDATABASE: ${POSTGRES_DB:-fibernode}
    volumes:
      - backups_data:/backups
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
  wa_sessions:
  uploads_data:
  certs_data:
  certbot_data:
  backups_data:
```

---

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fibernode

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your-64-character-hex-encryption-key

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug

# Admin seed
ADMIN_USERNAME=superadmin
ADMIN_PASSWORD=Admin123!
ADMIN_NAME=Super Admin
ADMIN_BUSINESS_NAME=FiberNode Pusat

# Timezone
TZ=Asia/Jakarta

# Security
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
```

### Frontend (.env)
```env
VITE_APP_NAME=FiberNode Internet
VITE_APP_VERSION=0.0.0
VITE_API_URL=http://localhost:4000/api
VITE_WS_URL=http://localhost:4000
```

---

## Struktur Folder

```
fibernode/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   ├── migrate.ts
│   │   │   ├── seed.ts
│   │   │   └── schema.ts
│   │   ├── lib/
│   │   │   ├── socket.ts              # Socket.IO (untuk QR code realtime)
│   │   │   └── wa-manager.ts          # Baileys multi-session manager
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── roleGuard.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.schema.ts
│   │   │   ├── users/
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── users.schema.ts
│   │   │   ├── packages/
│   │   │   │   ├── packages.controller.ts
│   │   │   │   ├── packages.service.ts
│   │   │   │   └── packages.schema.ts
│   │   │   ├── customers/
│   │   │   │   ├── customers.controller.ts
│   │   │   │   ├── customers.service.ts
│   │   │   │   ├── customers.schema.ts
│   │   │   │   └── csv-import.ts       # CSV parser & validator
│   │   │   ├── invoices/
│   │   │   │   ├── invoices.controller.ts
│   │   │   │   ├── invoices.service.ts
│   │   │   │   ├── invoices.schema.ts
│   │   │   │   └── invoice-generator.ts # Auto-generate tagihan bulanan
│   │   │   ├── finance/
│   │   │   │   ├── finance.controller.ts
│   │   │   │   └── finance.service.ts
│   │   │   ├── whatsapp/
│   │   │   │   ├── wa.controller.ts
│   │   │   │   ├── wa.service.ts
│   │   │   │   ├── wa.scheduler.ts     # Cron job kirim tagihan H-1
│   │   │   │   ├── wa.queue.ts         # Queue worker & rate limiter anti-ban
│   │   │   │   └── wa.templates.ts     # Template pesan WA (variasi konten)
│   │   │   ├── settings/
│   │   │   │   ├── settings.controller.ts
│   │   │   │   ├── settings.service.ts
│   │   │   │   └── settings.schema.ts
│   │   │   ├── uploads/
│   │   │   │   └── uploads.controller.ts
│   │   │   └── dashboard/
│   │   │       ├── dashboard.controller.ts
│   │   │       └── dashboard.service.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts
│   │   │   ├── logger.ts
│   │   │   └── csv-parser.ts
│   │   └── index.ts
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   ├── .dockerignore
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   │   ├── logo.svg
│   │   ├── favicon.ico
│   │   └── manifest.json             # PWA manifest
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx        # Desktop sidebar
│   │   │   │   ├── BottomNav.tsx      # Mobile bottom navigation
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── customer/
│   │   │   │   ├── CustomerCard.tsx   # Mobile card view
│   │   │   │   ├── CustomerTable.tsx  # Desktop table view
│   │   │   │   ├── CustomerForm.tsx
│   │   │   │   └── CsvImport.tsx
│   │   │   ├── invoice/
│   │   │   │   ├── InvoiceCard.tsx
│   │   │   │   ├── InvoiceTable.tsx
│   │   │   │   └── PaymentDialog.tsx
│   │   │   ├── finance/
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   ├── SummaryCards.tsx
│   │   │   │   └── ExportDialog.tsx
│   │   │   ├── whatsapp/
│   │   │   │   ├── QrScanner.tsx
│   │   │   │   ├── WaStatus.tsx
│   │   │   │   ├── QueueStatus.tsx     # Status antrian pesan
│   │   │   │   ├── ManualSend.tsx      # Kirim pesan manual ke 1 pelanggan
│   │   │   │   ├── BulkSend.tsx        # Kirim pesan bulk ke banyak pelanggan
│   │   │   │   └── MessageLog.tsx
│   │   │   ├── receipt/
│   │   │   │   └── ReceiptPage.tsx     # Halaman nota web (public)
│   │   │   ├── common/
│   │   │   │   ├── SplashScreen.tsx   # Splash screen 3 detik dengan logo
│   │   │   │   └── UpdateBanner.tsx   # Banner auto-update versi baru
│   │   │   └── theme/
│   │   │       └── ThemeToggle.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx
│   │   │   ├── useSocket.tsx
│   │   │   ├── useTheme.tsx
│   │   │   ├── useBranding.tsx
│   │   │   ├── useAutoUpdate.tsx     # Cek versi baru + tampilkan banner update
│   │   │   └── useMediaQuery.tsx      # Detect mobile/desktop
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   ├── routes/
│   │   │   ├── __root.tsx             # Splash screen + auto-update logic
│   │   │   ├── _auth.tsx              # Protected layout
│   │   │   ├── _auth.index.tsx        # Dashboard
│   │   │   ├── _auth.customers.tsx
│   │   │   ├── _auth.customers.$id.tsx
│   │   │   ├── _auth.invoices.tsx
│   │   │   ├── _auth.finance.tsx
│   │   │   ├── _auth.finance.report.tsx
│   │   │   ├── _auth.whatsapp.tsx
│   │   │   ├── _auth.profile.tsx
│   │   │   ├── _auth.admin.mitra.tsx
│   │   │   ├── _auth.admin.packages.tsx
│   │   │   ├── _auth.admin.settings.tsx
│   │   │   ├── _auth.admin.finance.tsx
│   │   │   ├── login.tsx
│   │   │   └── receipt.$token.tsx    # Halaman nota web (public, tanpa auth)
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .dockerignore
│   ├── package.json
│   └── vite.config.ts
├── nginx/
│   ├── Dockerfile
│   └── conf.d/
│       └── default.conf
├── scripts/
│   ├── Dockerfile.backup
│   └── backup.sh
├── examples/
│   └── import-pelanggan.csv           # Contoh file CSV
├── docker-compose.yml                 # Development
├── docker-compose.prod.yml            # Production
├── .gitignore
├── package.json
└── README.md
```

---

## Seed Data (Development)

```typescript
// Superadmin (businessName WAJIB — digunakan sebagai "area" pelanggan milik superadmin)
const superadmin = {
  username: 'superadmin',
  password: 'Admin123!',
  name: 'Super Admin',
  role: 'superadmin',
  businessName: 'FiberNode Pusat',
};

// Paket Internet
const packages = [
  { name: 'Paket 10 Mbps', speed: '10 Mbps', price: 100000 },
  { name: 'Paket 20 Mbps', speed: '20 Mbps', price: 150000 },
  { name: 'Paket 30 Mbps', speed: '30 Mbps', price: 200000 },
  { name: 'Paket 50 Mbps', speed: '50 Mbps', price: 250000 },
  { name: 'Paket 100 Mbps', speed: '100 Mbps', price: 350000 },
];

// Mitra contoh (development only)
const mitras = [
  { username: 'mitra1', password: 'Mitra123!', name: 'Budi Santoso', businessName: 'WiFi Sukamaju' },
  { username: 'mitra2', password: 'Mitra123!', name: 'Siti Rahayu', businessName: 'Net Mekarjaya' },
];

// Pelanggan contoh (owner = mitra atau superadmin, area otomatis dari owner.businessName)
const customers = [
  { name: 'Ahmad Fauzi', phone: '6281234567890', ownerUsername: 'mitra1', billingDate: 5, packageName: 'Paket 10 Mbps' },
  { name: 'Dewi Lestari', phone: '6289876543210', ownerUsername: 'mitra1', billingDate: 10, packageName: 'Paket 20 Mbps', discount: 10000 },
  { name: 'Rudi Hartono', phone: '6281333444555', ownerUsername: 'superadmin', billingDate: 15, packageName: 'Paket 50 Mbps' },
];
```

---

## Prioritas Pengembangan

### Phase 1: Foundation
1. Setup project structure (monorepo, Docker, CI/CD)
2. Backend: Express + Drizzle + Auth (JWT) + Socket.IO
3. Frontend: TanStack Router + Layout + Theme toggle + PWA setup
4. Database schema + migrations + seed

### Phase 2: Core CRUD
5. CRUD Paket Internet (Superadmin)
6. CRUD Mitra (Superadmin)
7. CRUD Pelanggan (Superadmin + Mitra)
8. Import CSV pelanggan
9. Login page + Protected routes + Role guard

### Phase 3: Tagihan & Keuangan
10. Generate tagihan bulanan (auto + manual)
11. Tandai pembayaran (bayar/belum bayar)
12. Isolir pelanggan
13. Dashboard keuangan + grafik
14. Laporan keuangan (filter, ekspor)

### Phase 4: WhatsApp Bot
15. Integrasi Baileys multi-session
16. Scan QR via frontend (Socket.IO + qrcode.react)
17. Pengingat tagihan otomatis H-1 (cron)
18. Notifikasi pembayaran (nota elektronik)
19. Notifikasi isolir
20. Konfigurasi nota (toggle fields)

### Phase 5: Polish & Deploy
21. Responsive mobile (bottom nav, cards, FAB, bottom sheet)
22. PWA (service worker, manifest, install prompt)
23. Splash screen (3 detik, logo dari settings, versi app)
24. Auto-update mechanism (cek versi, banner update, clear cache)
25. Setting website (logo, splash logo, meta tag, SSL, domain)
26. CI/CD pipeline (semantic-release, Docker multi-stage, auto-deploy)
27. Production deployment via Portainer (webhook auto-deploy)
28. Testing & QA

---

## Catatan Penting

### Keamanan
- Password di-hash dengan **Argon2id**
- JWT access token: 15 menit, refresh token: 7 hari
- Account lockout: 5x gagal = lock 15 menit
- CORS strict, Helmet.js, rate limiting
- Semua input di-validate dengan Zod
- Mitra hanya bisa edit **nomor telepon** dan **diskon** pelanggan miliknya (field lain read-only)
- Isolir pelanggan hanya bisa dilakukan oleh **Superadmin**
- Import CSV dan ekspor data hanya bisa dilakukan oleh **Superadmin**

### WhatsApp Bot
- Gunakan **Baileys** (@whiskeysockets/baileys) — gratis, open-source
- Setiap Mitra/Superadmin punya session WA sendiri (scan QR masing-masing)
- Session disimpan di filesystem (volume Docker `wa_sessions`)
- Jika session terputus, tampilkan notifikasi di dashboard + minta scan ulang
- **Risiko:** Baileys adalah library unofficial, ada risiko banned oleh WhatsApp
- Jika ingin upgrade ke API resmi, struktur sudah siap tinggal ganti adapter

### Strategi Anti-Banned WhatsApp (CRITICAL)

> **Masalah:** Jika ada 5 mitra × 500 pelanggan = 2.500 pesan pengingat yang harus dikirim pada waktu yang berdekatan (pagi hari). WhatsApp akan mendeteksi ini sebagai spam dan **banned per nomor** (bukan semua nomor sekaligus). Tapi jika 1 nomor kena banned, pelanggan mitra tersebut tidak akan menerima notifikasi.

> **Queue HANYA untuk pengingat tagihan (reminder H-1).** Nota pembayaran dan notifikasi isolir dikirim **langsung** tanpa queue karena dipicu manual (1 pesan per aksi, tidak ada risiko spam).

#### Prinsip Anti-Ban
1. **Banned = per nomor WA**, bukan per server. Jadi jika mitra A kena banned, mitra B tetap aman.
2. **Penyebab banned:** kirim terlalu cepat, kirim ke banyak nomor baru, konten identik berulang, dilaporkan oleh penerima.
3. **Solusi:** Queue system dengan delay acak, variasi konten, dan batasan per session.

> Schema tabel `wa_message_queue` ada di bagian Database Schema (tabel #10).

#### Mekanisme Queue & Rate Limiting (Khusus Pengingat Tagihan)
```typescript
// === KONFIGURASI PER SESSION (per nomor WA) ===
const WA_RATE_CONFIG = {
  MIN_DELAY_MS: 8_000,       // Minimum 8 detik antar pesan
  MAX_DELAY_MS: 15_000,      // Maximum 15 detik antar pesan
  JITTER_MS: 5_000,          // Random tambahan 0-5 detik
  MAX_PER_HOUR: 50,          // Max 50 pesan per jam per session
  MAX_PER_DAY: 300,          // Max 300 pesan per hari per session
  BATCH_SIZE: 20,            // Kirim 20 pesan, lalu istirahat
  BATCH_COOLDOWN_MS: 300_000, // Istirahat 5 menit setiap 20 pesan
  RETRY_DELAY_MS: 600_000,   // Retry pesan gagal setelah 10 menit
};

// === ALUR PENGIRIMAN ===
// 1. Cron H-1 (06:00 WIB) → masukkan semua pesan ke queue dengan scheduledAt BERTAHAP
// 2. Queue worker jalan terus → ambil pesan pending yang scheduledAt <= now
// 3. Kirim 1 pesan → tunggu delay acak → kirim berikutnya
// 4. Setiap 20 pesan → istirahat 5 menit
// 5. Jika gagal → retry max 3x dengan delay 10 menit

// === PENJADWALAN BERTAHAP ===
// Pesan TIDAK dikirim sekaligus jam 06:00
// Contoh: 500 pelanggan mitra A
// - Pesan 1-20:   scheduledAt = 06:00 - 06:05 (delay acak 8-20 detik)
// - Pesan 21-40:  scheduledAt = 06:10 - 06:15 (setelah cooldown 5 menit)
// - Pesan 41-60:  scheduledAt = 06:20 - 06:25
// - ... dst
// - Pesan 500:    scheduledAt = ~12:00 (selesai dalam ~6 jam)
//
// Setiap session (mitra) berjalan PARALEL tapi independen
// Mitra A kirim ke pelanggan A, Mitra B kirim ke pelanggan B (bersamaan)
// Karena nomor WA berbeda, tidak saling mempengaruhi

async function scheduleReminders(customers: Customer[]) {
  // Group pelanggan by owner (session)
  const byOwner = groupBy(customers, 'ownerId');
  
  for (const [ownerId, ownerCustomers] of Object.entries(byOwner)) {
    let scheduledTime = new Date(); // mulai dari sekarang
    let batchCount = 0;
    
    for (const customer of ownerCustomers) {
      // Tambah delay acak antar pesan
      const delay = randomBetween(MIN_DELAY_MS, MAX_DELAY_MS) + randomBetween(0, JITTER_MS);
      scheduledTime = addMilliseconds(scheduledTime, delay);
      batchCount++;
      
      // Setiap 20 pesan, tambah cooldown 5 menit
      if (batchCount >= BATCH_SIZE) {
        scheduledTime = addMilliseconds(scheduledTime, BATCH_COOLDOWN_MS);
        batchCount = 0;
      }
      
      await insertToQueue({
        sessionId: getSessionId(ownerId),
        customerId: customer.id,
        phone: customer.phone,
        content: buildReminderMessage(customer),
        scheduledAt: scheduledTime,
      });
    }
  }
}
```

#### Variasi Konten (Anti-Spam Detection)
```typescript
// WhatsApp mendeteksi pesan identik sebagai spam
// Solusi: variasikan greeting dan closing secara acak

const GREETINGS = [
  'Halo', 'Hai', 'Assalamualaikum', 'Selamat pagi', 'Selamat siang',
];
const CLOSINGS = [
  'Terima kasih 🙏', 'Terima kasih banyak', 'Salam hangat',
  'Terima kasih atas kerjasamanya', 'Hormat kami',
];

// Setiap pesan akan sedikit berbeda meskipun template sama
function buildReminderMessage(customer: Customer): string {
  const greeting = randomPick(GREETINGS);
  const closing = randomPick(CLOSINGS);
  return `🔔 *Pengingat Tagihan WiFi*\n\n${greeting} *${customer.name}*,\n...\n${closing}\n_${businessName}_`;
}
```

#### Monitoring & Dashboard
- **Status queue** ditampilkan di halaman `/whatsapp`: berapa pending, sending, sent, failed
- **Alert** jika banyak pesan gagal (kemungkinan session terputus atau banned)
- **Retry manual** untuk pesan yang gagal
- **Log lengkap** setiap pesan yang terkirim/gagal di `wa_message_logs`

### Performa
- Pagination default: 20 items per page
- TanStack Query cache: 30 detik
- Lazy loading untuk halaman admin
- Image optimization untuk logo (WebP)
- Bundle target: < 200KB gzipped initial load

### Portainer Deploy
- Semua config di-COPY ke dalam Docker image (tidak pakai bind mount ke file repo)
- Nginx proxy pakai Dockerfile sendiri dengan `nginx -t` verification
- Backup script di-embed ke dalam image
- Volume Docker untuk data persistent (DB, WA sessions, uploads, backups)

---

## CI/CD Pipeline (GitHub Actions — Detail)

### Alur CI/CD Lengkap
```
Developer push/merge ke main
  │
  ▼
GitHub Actions CI
  ├── 1. Lint (ESLint + Prettier check)
  ├── 2. Type check (tsc --noEmit)
  ├── 3. Unit test (Vitest)
  ├── 4. Build backend + frontend
  └── 5. Auto-version bump (semantic-release)
  │
  ▼
GitHub Actions CD
  ├── 6. Build Docker images (multi-stage, dengan cache)
  ├── 7. Push ke GitHub Container Registry (ghcr.io)
  ├── 8. Update app_version di database via API call
  └── 9. Trigger Portainer webhook → auto-deploy
  │
  ▼
Portainer (Production Server)
  ├── 10. Pull image baru dari ghcr.io
  ├── 11. Rolling update containers (zero downtime)
  └── 12. Health check → rollback jika gagal
```

### Auto-Versioning (Semantic Release)
```yaml
# .github/workflows/ci.yml (bagian versioning)
# Menggunakan conventional commits untuk auto-bump versi
# - fix: → patch (1.0.0 → 1.0.1)
# - feat: → minor (1.0.0 → 1.1.0)
# - BREAKING CHANGE: → major (1.0.0 → 2.0.0)

# Versi disimpan di:
# 1. package.json (root, backend, frontend)
# 2. Git tag (v1.2.3)
# 3. Docker image tag (ghcr.io/user/fibernode-api:1.2.3)
# 4. Database setting 'app_version' (di-update via API setelah deploy)
# 5. Frontend build-time env VITE_APP_VERSION (di-inject saat build)

steps:
  - name: Semantic Release
    uses: cycjimmy/semantic-release-action@v4
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    with:
      extra_plugins: |
        @semantic-release/changelog
        @semantic-release/git
```

### Commit Convention
```
feat: tambah fitur kirim pesan manual WA
fix: perbaiki race condition pada pembayaran
perf: optimasi query dashboard keuangan
docs: update README deployment guide
chore: update dependencies
refactor: pisahkan wa.service menjadi modul terpisah

# Contoh BREAKING CHANGE:
feat!: ubah format API response menjadi envelope pattern

BREAKING CHANGE: semua API response sekarang dibungkus dalam { data, meta, error }
```

### Docker Multi-Stage Build (dengan Caching)
```dockerfile
# === Backend Dockerfile ===
# Stage 1: Dependencies (di-cache jika package.json tidak berubah)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG APP_VERSION=0.0.0
ENV APP_VERSION=${APP_VERSION}
RUN npm run build

# Stage 3: Production (image kecil, hanya runtime)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fibernode
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
USER fibernode
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
```

```dockerfile
# === Frontend Dockerfile ===
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_APP_VERSION=0.0.0
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
RUN npm run build

# Stage 3: Serve via Nginx (image sangat kecil)
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### GitHub Actions — CI/CD Workflow
```yaml
# .github/workflows/cd.yml
name: Build & Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  BACKEND_IMAGE: ghcr.io/${{ github.repository }}/fibernode-api
  FRONTEND_IMAGE: ghcr.io/${{ github.repository }}/fibernode-web

jobs:
  version:
    runs-on: ubuntu-latest
    outputs:
      new_version: ${{ steps.version.outputs.new_release_version }}
    steps:
      - uses: actions/checkout@v4
      - id: version
        uses: cycjimmy/semantic-release-action@v4
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build-and-push:
    needs: version
    if: needs.version.outputs.new_version != ''
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # Backend — dengan layer caching
      - name: Build & Push Backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ${{ env.BACKEND_IMAGE }}:${{ needs.version.outputs.new_version }}
            ${{ env.BACKEND_IMAGE }}:latest
          build-args: |
            APP_VERSION=${{ needs.version.outputs.new_version }}
          cache-from: type=gha,scope=backend
          cache-to: type=gha,mode=max,scope=backend

      # Frontend — dengan layer caching
      - name: Build & Push Frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ${{ env.FRONTEND_IMAGE }}:${{ needs.version.outputs.new_version }}
            ${{ env.FRONTEND_IMAGE }}:latest
          build-args: |
            VITE_APP_VERSION=${{ needs.version.outputs.new_version }}
            VITE_API_URL=${{ secrets.PROD_API_URL }}
            VITE_WS_URL=${{ secrets.PROD_WS_URL }}
          cache-from: type=gha,scope=frontend
          cache-to: type=gha,mode=max,scope=frontend

  deploy:
    needs: [version, build-and-push]
    runs-on: ubuntu-latest
    steps:
      # Trigger Portainer webhook untuk auto-deploy
      - name: Deploy via Portainer Webhook
        run: |
          curl -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}"

      # Update app_version di database
      - name: Update App Version
        run: |
          curl -X PATCH "${{ secrets.PROD_API_URL }}/settings" \
            -H "Authorization: Bearer ${{ secrets.DEPLOY_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"app_version": "${{ needs.version.outputs.new_version }}"}'
```

### Docker Layer Caching Strategy
```
Layer 1: Base image (node:22-alpine)          → cached (jarang berubah)
Layer 2: COPY package.json + npm ci           → cached (berubah hanya saat dependencies berubah)
Layer 3: COPY source code + build             → rebuild (berubah setiap push)
Layer 4: Production runner                    → cached (jarang berubah)

# Hasil: build 2-5 menit (bukan 10-15 menit) karena Layer 1-2 di-cache
# GitHub Actions cache: type=gha (disimpan di GitHub, shared antar workflow)
```

---

## Auto-Update di Frontend (User Experience)

### Mekanisme Auto-Update
```typescript
// Frontend: cek versi baru setiap 5 menit
// Bandingkan VITE_APP_VERSION (build-time) dengan app_version dari API (runtime)

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 menit

function useAutoUpdate() {
  const currentVersion = import.meta.env.VITE_APP_VERSION;
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('/api/settings/branding');
        const data = await res.json();
        const serverVersion = data.app_version;

        if (serverVersion && serverVersion !== currentVersion) {
          setLatestVersion(serverVersion);
          setShowUpdateBanner(true);
        }
      } catch {
        // Ignore — offline atau server error
      }
    };

    checkVersion(); // Cek saat pertama load
    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [currentVersion]);

  const doUpdate = () => {
    // Force reload untuk mendapatkan bundle baru
    // Service worker akan mengambil versi terbaru
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
      });
    }
    // Clear cache dan reload
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
    window.location.reload();
  };

  return { showUpdateBanner, latestVersion, currentVersion, doUpdate };
}
```

### UI Update Banner
```
┌─────────────────────────────────────────────────────┐
│ 🔄 Versi baru tersedia (v1.3.0)                    │
│ Anda menggunakan v1.2.0. Klik untuk memperbarui.   │
│                              [Nanti] [Update Sekarang] │
└─────────────────────────────────────────────────────┘
```

- Banner muncul di **atas halaman** (sticky, tidak mengganggu konten)
- Tombol **"Update Sekarang"** → clear cache + reload
- Tombol **"Nanti"** → dismiss, cek lagi di interval berikutnya
- Banner **tidak muncul** jika user sedang di tengah form input (cegah data loss)
- Setelah update, splash screen tampil 3 detik dengan versi baru

### PWA Service Worker Update
```typescript
// vite-plugin-pwa config
// Service worker menggunakan strategi "stale-while-revalidate" untuk API
// dan "cache-first" untuk static assets

// Saat versi baru terdeteksi:
// 1. Service worker baru di-install di background
// 2. Banner "Update tersedia" muncul
// 3. User klik "Update" → skipWaiting() + reload
// 4. Splash screen tampil 3 detik → halaman baru dengan versi terbaru
```

---

## Race Condition Prevention (Lengkap)

### 1. Invoice Pay/Unpay — Optimistic Locking
```typescript
// Sudah ada field `version` di invoices table
// Saat PATCH /invoices/:id/pay:
const result = await db.update(invoices)
  .set({ 
    status: 'paid', 
    paidAt: new Date(), 
    paidBy: userId,
    version: sql`${invoices.version} + 1`,
    updatedAt: new Date()
  })
  .where(
    and(
      eq(invoices.id, invoiceId),
      eq(invoices.version, currentVersion) // ← Optimistic lock
    )
  )
  .returning();

if (result.length === 0) {
  throw new ConflictError('Data sudah diubah oleh user lain. Silakan refresh.');
  // HTTP 409 Conflict
}
```

### 2. Invoice Generate — Unique Constraint
```typescript
// Unique index: idx_invoices_customer_period (customerId + period)
// Jika cron dan manual trigger berjalan bersamaan untuk pelanggan yang sama:
// → INSERT akan gagal karena unique constraint
// → Gunakan ON CONFLICT DO NOTHING untuk skip yang sudah ada

await db.insert(invoices)
  .values({ customerId, period, amount, discount, totalAmount, dueDate, ownerId, receiptToken })
  .onConflictDoNothing({ target: [invoices.customerId, invoices.period] });
```

### 3. WA Queue — Atomic Status Update
```typescript
// Queue worker mengambil pesan dengan atomic UPDATE + RETURNING
// Mencegah 2 worker mengambil pesan yang sama

const [message] = await db.update(waMessageQueue)
  .set({ status: 'sending', updatedAt: new Date() })
  .where(
    and(
      eq(waMessageQueue.status, 'pending'),
      lte(waMessageQueue.scheduledAt, new Date()),
      eq(waMessageQueue.sessionId, sessionId)
    )
  )
  .orderBy(waMessageQueue.scheduledAt)
  .limit(1)
  .returning();

// Jika message === undefined → tidak ada pesan pending, skip
```

### 4. Customer Discount Update — Snapshot Isolation
```typescript
// Saat mitra ubah discount:
// 1. Update customer.discount + customer.totalBill
// 2. JANGAN ubah invoice yang sudah di-generate (snapshot model)
// 3. Invoice berikutnya akan pakai discount baru

await db.transaction(async (tx) => {
  const pkg = await tx.select().from(packages).where(eq(packages.id, customer.packageId));
  const newTotalBill = pkg.price - newDiscount;
  
  await tx.update(customers)
    .set({ discount: newDiscount, totalBill: newTotalBill, updatedAt: new Date() })
    .where(eq(customers.id, customerId));
});
```

### 5. WA Session — Single Connection Guard
```typescript
// Hanya 1 koneksi per user. Jika user klik "Connect" 2x bersamaan:
// → Gunakan mutex/lock per userId

const sessionLocks = new Map<string, boolean>();

async function connectSession(userId: string) {
  if (sessionLocks.get(userId)) {
    throw new ConflictError('Koneksi WA sedang dalam proses. Tunggu sebentar.');
  }
  
  sessionLocks.set(userId, true);
  try {
    await createSession(userId);
  } finally {
    sessionLocks.delete(userId);
  }
}
```

### 6. CSV Import — Transaction + Idempotency
```typescript
// Import CSV dalam 1 transaction besar
// Jika 1 baris gagal di tengah → rollback semua? TIDAK.
// Strategi: validasi semua dulu, baru insert yang valid

async function importCsv(rows: CsvRow[]) {
  const validRows: ValidRow[] = [];
  const errorRows: ErrorRow[] = [];

  // Phase 1: Validasi semua baris (tanpa insert)
  for (const row of rows) {
    const result = await validateRow(row);
    if (result.valid) validRows.push(result.data);
    else errorRows.push({ row, error: result.error });
  }

  // Phase 2: Insert valid rows dalam transaction
  if (validRows.length > 0) {
    await db.transaction(async (tx) => {
      for (const row of validRows) {
        await tx.insert(customers).values(row)
          .onConflictDoNothing(); // Skip jika phone sudah ada
      }
    });
  }

  return { imported: validRows.length, failed: errorRows.length, errors: errorRows };
}
```

### 7. Settings Update — Last-Write-Wins dengan Audit
```typescript
// Settings tidak pakai optimistic locking (hanya superadmin yang bisa edit)
// Tapi setiap perubahan dicatat di activity_logs untuk audit trail

await db.transaction(async (tx) => {
  for (const { key, value } of settingsToUpdate) {
    await tx.update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key));
  }
  
  await tx.insert(activityLogs).values({
    userId: superadminId,
    action: 'settings.update',
    resource: 'settings',
    metadata: { changes: settingsToUpdate },
    ipAddress,
  });
});
```

---

*Dokumen ini dibuat sebagai panduan lengkap untuk development "FiberNode Internet" — Sistem Manajemen Tagihan Langganan WiFi. Referensi arsitektur dari proyek Desa Digital.*
