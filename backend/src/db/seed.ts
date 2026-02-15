import { db } from './index.js';
import { users, packages, customers, settings } from './schema.js';
import { hashPassword } from '../utils/password.js';
import { logger } from '../utils/logger.js';
import { eq } from 'drizzle-orm';

const DEFAULT_SETTINGS = [
  { key: 'app_name', value: 'FiberNode Internet' },
  { key: 'logo_url', value: '/logo.svg' },
  { key: 'favicon_url', value: '/favicon.ico' },
  { key: 'meta_description', value: 'Sistem Manajemen Tagihan Langganan WiFi' },
  { key: 'domain', value: '' },
  { key: 'ssl_method', value: 'none' },
  { key: 'receipt_logo_enabled', value: 'true' },
  { key: 'receipt_show_company_name', value: 'true' },
  { key: 'receipt_show_customer_phone', value: 'true' },
  { key: 'receipt_show_nik', value: 'false' },
  { key: 'receipt_show_area', value: 'true' },
  { key: 'receipt_show_package', value: 'true' },
  { key: 'receipt_show_discount', value: 'true' },
  { key: 'receipt_show_payment_method', value: 'true' },
  { key: 'receipt_show_paid_by', value: 'true' },
  { key: 'receipt_footer_text', value: 'Terima kasih atas pembayaran Anda' },
  { key: 'splash_logo_url', value: '' },
  { key: 'splash_bg_color', value: '' },
  { key: 'app_version', value: '0.0.0' },
];

async function seed() {
  logger.info('Seeding database...');

  try {
    // Seed settings
    for (const s of DEFAULT_SETTINGS) {
      const existing = await db.select().from(settings).where(eq(settings.key, s.key)).limit(1);
      if (existing.length === 0) {
        await db.insert(settings).values(s);
      }
    }
    logger.info('Settings seeded');

    // Seed superadmin
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'superadmin')).limit(1);
    let superadminId: string;

    if (existingAdmin.length === 0) {
      const passwordHash = await hashPassword('Admin123!');
      const [admin] = await db.insert(users).values({
        username: 'superadmin',
        passwordHash,
        name: 'Super Admin',
        role: 'superadmin',
        businessName: 'FiberNode Pusat',
      }).returning();
      superadminId = admin.id;
      logger.info('Superadmin created');
    } else {
      superadminId = existingAdmin[0].id;
      logger.info('Superadmin already exists');
    }

    // Seed packages
    const packageData = [
      { name: 'Paket 10 Mbps', speed: '10 Mbps', price: 100000 },
      { name: 'Paket 20 Mbps', speed: '20 Mbps', price: 150000 },
      { name: 'Paket 30 Mbps', speed: '30 Mbps', price: 200000 },
      { name: 'Paket 50 Mbps', speed: '50 Mbps', price: 250000 },
      { name: 'Paket 100 Mbps', speed: '100 Mbps', price: 350000 },
    ];

    for (const pkg of packageData) {
      const existing = await db.select().from(packages).where(eq(packages.name, pkg.name)).limit(1);
      if (existing.length === 0) {
        await db.insert(packages).values(pkg);
      }
    }
    logger.info('Packages seeded');

    // Seed mitra (development only)
    if (process.env.NODE_ENV !== 'production') {
      const mitraData = [
        { username: 'mitra1', password: 'Mitra123!', name: 'Budi Santoso', businessName: 'WiFi Sukamaju' },
        { username: 'mitra2', password: 'Mitra123!', name: 'Siti Rahayu', businessName: 'Net Mekarjaya' },
      ];

      const mitraIds: Record<string, string> = {};

      for (const m of mitraData) {
        const existing = await db.select().from(users).where(eq(users.username, m.username)).limit(1);
        if (existing.length === 0) {
          const passwordHash = await hashPassword(m.password);
          const [mitra] = await db.insert(users).values({
            username: m.username,
            passwordHash,
            name: m.name,
            role: 'mitra',
            businessName: m.businessName,
          }).returning();
          mitraIds[m.username] = mitra.id;
        } else {
          mitraIds[m.username] = existing[0].id;
        }
      }
      logger.info('Mitra seeded');

      // Seed customers
      const allPackages = await db.select().from(packages);
      const pkgMap = new Map(allPackages.map(p => [p.name, p]));

      const customerData = [
        { name: 'Ahmad Fauzi', phone: '6281234567890', ownerUsername: 'mitra1', billingDate: 5, packageName: 'Paket 10 Mbps', discount: 0 },
        { name: 'Dewi Lestari', phone: '6289876543210', ownerUsername: 'mitra1', billingDate: 10, packageName: 'Paket 20 Mbps', discount: 10000 },
        { name: 'Rudi Hartono', phone: '6281333444555', ownerUsername: 'superadmin', billingDate: 15, packageName: 'Paket 50 Mbps', discount: 0 },
      ];

      for (const c of customerData) {
        const existingCustomer = await db.select().from(customers).where(eq(customers.phone, c.phone)).limit(1);
        if (existingCustomer.length === 0) {
          const ownerId = c.ownerUsername === 'superadmin' ? superadminId : mitraIds[c.ownerUsername];
          const pkg = pkgMap.get(c.packageName);
          if (ownerId && pkg) {
            const totalBill = pkg.price - c.discount;
            await db.insert(customers).values({
              ownerId,
              packageId: pkg.id,
              name: c.name,
              phone: c.phone,
              billingDate: c.billingDate,
              discount: c.discount,
              totalBill,
            });
          }
        }
      }
      logger.info('Customers seeded');
    }

    logger.info('Database seeding completed');
  } catch (error) {
    logger.error({ error }, 'Seeding failed');
    process.exit(1);
  }

  process.exit(0);
}

seed();
