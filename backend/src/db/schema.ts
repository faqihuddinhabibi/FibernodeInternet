import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// === Enums ===
export const userRoleEnum = pgEnum('user_role', ['superadmin', 'mitra']);
export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'paid', 'partial']);
export const customerStatusEnum = pgEnum('customer_status', ['active', 'isolated', 'inactive']);
export const waSessionStatusEnum = pgEnum('wa_session_status', ['disconnected', 'connecting', 'connected']);

// === 1. users ===
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  phone: varchar('phone', { length: 20 }),
  businessName: varchar('business_name', { length: 255 }).notNull().unique(),
  bankName: varchar('bank_name', { length: 100 }),
  bankAccount: varchar('bank_account', { length: 50 }),
  bankHolder: varchar('bank_holder', { length: 255 }),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// === 2. packages ===
export const packages = pgTable('packages', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  speed: varchar('speed', { length: 50 }).notNull(),
  price: integer('price').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// === 3. customers ===
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  packageId: uuid('package_id').notNull().references(() => packages.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  nik: varchar('nik', { length: 20 }),
  address: text('address'),
  billingDate: integer('billing_date').notNull(),
  discount: integer('discount').default(0).notNull(),
  totalBill: integer('total_bill').notNull(),
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

// === 4. invoices ===
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  period: varchar('period', { length: 7 }).notNull(),
  amount: integer('amount').notNull(),
  discount: integer('discount').default(0).notNull(),
  totalAmount: integer('total_amount').notNull(),
  status: paymentStatusEnum('status').default('unpaid').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  paidBy: uuid('paid_by').references(() => users.id),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paymentNote: text('payment_note'),
  dueDate: date('due_date').notNull(),
  receiptUrl: varchar('receipt_url', { length: 500 }),
  receiptToken: varchar('receipt_token', { length: 100 }).unique(),
  reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
  receiptSentAt: timestamp('receipt_sent_at', { withTimezone: true }),
  isolirSentAt: timestamp('isolir_sent_at', { withTimezone: true }),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ([
  index('idx_invoices_customer').on(table.customerId),
  index('idx_invoices_owner').on(table.ownerId),
  index('idx_invoices_period').on(table.period),
  index('idx_invoices_status').on(table.status),
  index('idx_invoices_due_date').on(table.dueDate),
  uniqueIndex('idx_invoices_customer_period').on(table.customerId, table.period),
]));

// === 5. wa_sessions ===
export const waSessions = pgTable('wa_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  status: waSessionStatusEnum('status').default('disconnected').notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  lastConnectedAt: timestamp('last_connected_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// === 6. wa_message_logs ===
export const waMessageLogs = pgTable('wa_message_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => waSessions.id, { onDelete: 'set null' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  messageType: varchar('message_type', { length: 50 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  content: text('content').notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ([
  index('idx_wa_logs_session').on(table.sessionId),
  index('idx_wa_logs_customer').on(table.customerId),
  index('idx_wa_logs_type').on(table.messageType),
]));

// === 7. settings ===
export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// === 8. refresh_tokens ===
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

// === 9. activity_logs ===
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

// === 10. wa_message_queue ===
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

// === 11. login_attempts ===
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
