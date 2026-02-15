import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { customers, packages, users } from '../../db/schema.js';
import { parseCsv } from '../../utils/csv-parser.js';
import { AppError } from '../../middleware/errorHandler.js';

interface CsvRow {
  nama: string;
  telepon: string;
  diskon: string;
  tanggal: string;
  area: string;
  paket_nama: string;
  paket_tarif: string;
  total_bayar: string;
  nik: string;
  tanggal_register: string;
}

interface ValidRow {
  ownerId: string;
  packageId: string;
  name: string;
  phone: string;
  billingDate: number;
  discount: number;
  totalBill: number;
  nik?: string;
  registerDate: string;
}

interface ErrorRow {
  row: number;
  data: CsvRow;
  error: string;
}

export async function csvImportHandler(req: Request, res: Response) {
  const csvContent = req.body?.csv as string;
  if (!csvContent) {
    throw new AppError(400, 'CSV content is required');
  }

  const { data: rows, errors: parseErrors } = parseCsv<CsvRow>(csvContent);

  if (parseErrors.length > 0) {
    throw new AppError(400, `CSV parse error: ${parseErrors[0].message}`);
  }

  if (rows.length === 0) {
    throw new AppError(400, 'CSV kosong');
  }

  // Load all packages and users for validation
  const allPackages = await db.select().from(packages);
  const allUsers = await db.select().from(users);

  const pkgMap = new Map(allPackages.map((p) => [p.name, p]));
  const userByBusiness = new Map(allUsers.map((u) => [u.businessName, u]));

  const validRows: ValidRow[] = [];
  const errorRows: ErrorRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header

    // Validate phone
    const phone = row.telepon?.replace(/\D/g, '');
    if (!phone || !/^62\d{8,13}$/.test(phone)) {
      errorRows.push({ row: rowNum, data: row, error: 'Format telepon tidak valid (harus 62xxxxxxxxxx)' });
      continue;
    }

    // Validate billing date
    const billingDate = parseInt(row.tanggal);
    if (isNaN(billingDate) || billingDate < 1 || billingDate > 28) {
      errorRows.push({ row: rowNum, data: row, error: 'Tanggal tagihan harus 1-28' });
      continue;
    }

    // Validate area -> owner
    const owner = userByBusiness.get(row.area);
    if (!owner) {
      errorRows.push({ row: rowNum, data: row, error: `Area "${row.area}" tidak cocok dengan owner manapun` });
      continue;
    }

    // Validate package
    const pkg = pkgMap.get(row.paket_nama);
    if (!pkg) {
      errorRows.push({ row: rowNum, data: row, error: `Paket "${row.paket_nama}" tidak ditemukan` });
      continue;
    }

    const discount = parseInt(row.diskon) || 0;
    const totalBill = pkg.price - discount;

    if (totalBill < 0) {
      errorRows.push({ row: rowNum, data: row, error: 'Diskon melebihi harga paket' });
      continue;
    }

    // Validate name
    if (!row.nama || row.nama.trim().length === 0) {
      errorRows.push({ row: rowNum, data: row, error: 'Nama pelanggan wajib diisi' });
      continue;
    }

    validRows.push({
      ownerId: owner.id,
      packageId: pkg.id,
      name: row.nama.trim(),
      phone,
      billingDate,
      discount,
      totalBill,
      nik: row.nik || undefined,
      registerDate: row.tanggal_register || new Date().toISOString().split('T')[0],
    });
  }

  // Insert valid rows in transaction
  let imported = 0;
  if (validRows.length > 0) {
    await db.transaction(async (tx) => {
      for (const row of validRows) {
        try {
          await tx.insert(customers).values(row).onConflictDoNothing();
          imported++;
        } catch {
          // Skip duplicates
        }
      }
    });
  }

  res.json({
    data: {
      imported,
      failed: errorRows.length,
      total: rows.length,
      errors: errorRows,
    },
  });
}
