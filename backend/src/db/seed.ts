import { db } from './index.js';
import { users, packages, customers, settings, invoices, waMessageLogs } from './schema.js';
import { hashPassword } from '../utils/password.js';
import { logger } from '../utils/logger.js';
import { eq, sql } from 'drizzle-orm';
import { format, subMonths } from 'date-fns';

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
  { key: 'splash_bg_color', value: '#0F172A' },
  { key: 'app_version', value: '1.0.0' },
];

const CUSTOMER_NAMES = [
  'Ahmad Fauzi', 'Dewi Lestari', 'Rudi Hartono', 'Siti Aminah', 'Budi Prasetyo',
  'Rina Wati', 'Eko Saputra', 'Nur Hidayah', 'Agus Setiawan', 'Lina Marlina',
  'Dedi Kurniawan', 'Yuni Astuti', 'Hendra Wijaya', 'Fitri Handayani', 'Joko Susilo',
  'Mega Putri', 'Andi Rahman', 'Wulan Sari', 'Tono Sugiarto', 'Ratna Dewi',
  'Bambang Hermanto', 'Sri Wahyuni', 'Dian Purnama', 'Rizky Aditya', 'Indah Permata',
  'Wahyu Nugroho', 'Sari Rahayu', 'Fajar Maulana', 'Nita Anggraini', 'Arif Budiman',
  'Putri Wulandari', 'Hasan Basri', 'Kartini Sari', 'Yoga Pratama', 'Anisa Fitria',
];

function randomPhone(): string {
  const prefix = ['6281', '6282', '6285', '6887', '6878'];
  return prefix[Math.floor(Math.random() * prefix.length)] + Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 8);
}

function randomNik(): string {
  return '32' + Math.floor(10000000000000 + Math.random() * 90000000000000).toString().slice(0, 14);
}

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
      const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD || 'Admin123!');
      const [admin] = await db.insert(users).values({
        username: process.env.ADMIN_USERNAME || 'superadmin',
        passwordHash,
        name: process.env.ADMIN_NAME || 'Super Admin',
        role: 'superadmin',
        businessName: process.env.ADMIN_BUSINESS_NAME || 'FiberNode Pusat',
        phone: '6281200000001',
        bankName: 'BCA',
        bankAccount: '1234567890',
        bankHolder: 'FiberNode Pusat',
      }).returning();
      superadminId = admin.id;
      logger.info('Superadmin created');
    } else {
      superadminId = existingAdmin[0].id;
      logger.info('Superadmin already exists');
    }

    // Seed packages
    const packageData = [
      { name: 'Paket 10 Mbps', speed: '10 Mbps', price: 100000, description: 'Cocok untuk browsing dan sosial media' },
      { name: 'Paket 20 Mbps', speed: '20 Mbps', price: 150000, description: 'Ideal untuk streaming video HD' },
      { name: 'Paket 30 Mbps', speed: '30 Mbps', price: 200000, description: 'Untuk keluarga dengan banyak perangkat' },
      { name: 'Paket 50 Mbps', speed: '50 Mbps', price: 250000, description: 'Untuk gaming dan streaming 4K' },
      { name: 'Paket 100 Mbps', speed: '100 Mbps', price: 350000, description: 'Kecepatan maksimal untuk bisnis' },
    ];

    for (const pkg of packageData) {
      const existing = await db.select().from(packages).where(eq(packages.name, pkg.name)).limit(1);
      if (existing.length === 0) {
        await db.insert(packages).values(pkg);
      }
    }
    logger.info('Packages seeded');

    // Check if demo data already exists
    const [custCount] = await db.select({ count: sql<number>`count(*)::int` }).from(customers);
    if (custCount.count > 5) {
      logger.info('Demo data already exists, skipping...');
      logger.info('Database seeding completed');
      process.exit(0);
    }

    // Seed mitra
    const mitraData = [
      { username: 'mitra1', password: 'Mitra123!', name: 'Budi Santoso', businessName: 'WiFi Sukamaju', phone: '6281300000001', bankName: 'BRI', bankAccount: '0987654321', bankHolder: 'Budi Santoso' },
      { username: 'mitra2', password: 'Mitra123!', name: 'Siti Rahayu', businessName: 'Net Mekarjaya', phone: '6281300000002', bankName: 'Mandiri', bankAccount: '1122334455', bankHolder: 'Siti Rahayu' },
    ];

    const ownerIds: Record<string, string> = { superadmin: superadminId };

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
          phone: m.phone,
          bankName: m.bankName,
          bankAccount: m.bankAccount,
          bankHolder: m.bankHolder,
        }).returning();
        ownerIds[m.username] = mitra.id;
      } else {
        ownerIds[m.username] = existing[0].id;
      }
    }
    logger.info('Mitra seeded');

    // Seed customers (35 total)
    const allPackages = await db.select().from(packages);
    const pkgList = allPackages.filter(p => p.isActive);
    const owners = ['mitra1', 'mitra2', 'superadmin'];
    const statuses: Array<'active' | 'isolated' | 'inactive'> = ['active', 'active', 'active', 'active', 'active', 'active', 'isolated', 'isolated', 'inactive'];

    const seededCustomers: Array<{ id: string; ownerId: string; totalBill: number; billingDate: number; name: string; phone: string }> = [];

    for (let i = 0; i < CUSTOMER_NAMES.length; i++) {
      const name = CUSTOMER_NAMES[i];
      const phone = randomPhone();
      const ownerKey = owners[i % owners.length];
      const ownerId = ownerIds[ownerKey];
      const pkg = pkgList[i % pkgList.length];
      const billingDate = (i % 28) + 1;
      const discount = i % 5 === 0 ? 10000 : i % 7 === 0 ? 20000 : 0;
      const totalBill = pkg.price - discount;
      const status = statuses[i % statuses.length];

      const existingCustomer = await db.select().from(customers).where(eq(customers.name, name)).limit(1);
      if (existingCustomer.length === 0) {
        const [cust] = await db.insert(customers).values({
          ownerId,
          packageId: pkg.id,
          name,
          phone,
          billingDate,
          discount,
          totalBill,
          status,
          nik: i % 3 === 0 ? randomNik() : null,
          address: i % 2 === 0 ? `Jl. Merdeka No. ${i + 1}, RT ${(i % 10) + 1}/RW ${(i % 5) + 1}` : null,
          notes: status === 'isolated' ? 'Belum bayar 2 bulan berturut-turut' : null,
        }).returning();
        seededCustomers.push({ id: cust.id, ownerId, totalBill, billingDate, name, phone });
      }
    }
    logger.info(`${seededCustomers.length} customers seeded`);

    // Seed invoices for last 6 months
    const now = new Date();
    const paymentMethods = ['cash', 'transfer', 'qris'];
    let invoiceCount = 0;

    // Also get existing customers if they were already seeded
    if (seededCustomers.length === 0) {
      const allCust = await db.select().from(customers);
      for (const c of allCust) {
        seededCustomers.push({ id: c.id, ownerId: c.ownerId, totalBill: c.totalBill, billingDate: c.billingDate, name: c.name, phone: c.phone });
      }
    }

    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      const periodDate = subMonths(now, monthOffset);
      const period = format(periodDate, 'yyyy-MM');

      for (const cust of seededCustomers) {
        const dueDate = `${period}-${String(cust.billingDate).padStart(2, '0')}`;

        // Check if invoice already exists
        const existingInv = await db.select().from(invoices)
          .where(sql`${invoices.customerId} = ${cust.id} AND ${invoices.period} = ${period}`)
          .limit(1);
        if (existingInv.length > 0) continue;

        // Older months: mostly paid. Current month: mix
        let isPaid: boolean;
        if (monthOffset === 0) {
          isPaid = Math.random() < 0.4; // 40% paid this month
        } else if (monthOffset === 1) {
          isPaid = Math.random() < 0.7; // 70% paid last month
        } else {
          isPaid = Math.random() < 0.9; // 90% paid older months
        }

        const paidAt = isPaid ? new Date(periodDate.getFullYear(), periodDate.getMonth(), cust.billingDate + Math.floor(Math.random() * 10)) : null;

        await db.insert(invoices).values({
          customerId: cust.id,
          ownerId: cust.ownerId,
          period,
          amount: cust.totalBill,
          discount: 0,
          totalAmount: cust.totalBill,
          status: isPaid ? 'paid' : 'unpaid',
          paidAt,
          paidBy: isPaid ? cust.ownerId : null,
          paymentMethod: isPaid ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)] : null,
          dueDate,
          version: 1,
        });
        invoiceCount++;
      }
    }
    logger.info(`${invoiceCount} invoices seeded`);

    // Seed WA message logs
    const logTypes = ['reminder', 'receipt', 'isolation', 'manual'];
    const logStatuses = ['sent', 'sent', 'sent', 'failed', 'sent'];
    let logCount = 0;

    for (let i = 0; i < 50; i++) {
      const cust = seededCustomers[i % seededCustomers.length];
      const msgType = logTypes[i % logTypes.length];
      const msgStatus = logStatuses[i % logStatuses.length];
      const sentAt = new Date(now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));

      let content = '';
      if (msgType === 'reminder') {
        content = `Yth. ${cust.name}, tagihan WiFi Anda bulan ini sebesar Rp ${cust.totalBill.toLocaleString('id-ID')} jatuh tempo tanggal ${cust.billingDate}. Mohon segera lakukan pembayaran. Terima kasih.`;
      } else if (msgType === 'receipt') {
        content = `Terima kasih ${cust.name}, pembayaran WiFi Anda sebesar Rp ${cust.totalBill.toLocaleString('id-ID')} telah kami terima. Terima kasih atas kepercayaan Anda.`;
      } else if (msgType === 'isolation') {
        content = `Yth. ${cust.name}, layanan WiFi Anda telah diisolir karena keterlambatan pembayaran. Silakan lakukan pembayaran untuk mengaktifkan kembali.`;
      } else {
        content = `Halo ${cust.name}, ini adalah pesan dari FiberNode Internet. Ada pertanyaan? Hubungi kami.`;
      }

      await db.insert(waMessageLogs).values({
        customerId: cust.id,
        messageType: msgType,
        phone: cust.phone,
        content,
        status: msgStatus,
        errorMessage: msgStatus === 'failed' ? 'Nomor tidak terdaftar di WhatsApp' : null,
        sentAt,
      });
      logCount++;
    }
    logger.info(`${logCount} WA message logs seeded`);

    logger.info('Database seeding completed');
  } catch (error) {
    logger.error({ error }, 'Seeding failed');
    process.exit(1);
  }

  process.exit(0);
}

seed();
