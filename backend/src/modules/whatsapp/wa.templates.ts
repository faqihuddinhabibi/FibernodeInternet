const GREETINGS = [
  'Halo', 'Hai', 'Assalamualaikum', 'Selamat pagi', 'Selamat siang',
];

const CLOSINGS = [
  'Terima kasih 🙏', 'Terima kasih banyak', 'Salam hangat',
  'Terima kasih atas kerjasamanya', 'Hormat kami',
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface ReminderData {
  customerName: string;
  nextMonth: string;
  year: number;
  packageName: string;
  speed: string;
  totalBill: number;
  billingDate: number;
  bankName?: string | null;
  bankAccount?: string | null;
  bankHolder?: string | null;
  businessName: string;
}

interface ReceiptData {
  customerName: string;
  nik?: string | null;
  area: string;
  packageName: string;
  period: string;
  discount: number;
  totalAmount: number;
  paymentMethod?: string | null;
  paidAt: string;
  paidByName: string;
  receiptUrl: string;
  businessName: string;
  showNik?: boolean;
  showArea?: boolean;
  showPackage?: boolean;
  showDiscount?: boolean;
  showPaymentMethod?: boolean;
  showPaidBy?: boolean;
}

interface IsolationData {
  customerName: string;
  bankName?: string | null;
  bankAccount?: string | null;
  bankHolder?: string | null;
  businessName: string;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

export function buildReminderMessage(data: ReminderData): string {
  const greeting = randomPick(GREETINGS);
  const closing = randomPick(CLOSINGS);

  let msg = `🔔 *Pengingat Tagihan WiFi*\n\n`;
  msg += `${greeting} *${data.customerName}*,\n\n`;
  msg += `Tagihan WiFi Anda untuk *${data.nextMonth} ${data.year}* (pra-bayar) akan jatuh tempo besok:\n\n`;
  msg += `📋 *Detail Tagihan:*\n`;
  msg += `• Paket: ${data.packageName} (${data.speed})\n`;
  msg += `• Periode: ${data.nextMonth} ${data.year} (pra-bayar)\n`;
  msg += `• Nominal: Rp ${formatRupiah(data.totalBill)}\n`;
  msg += `• Jatuh Tempo: Tanggal ${data.billingDate}\n`;

  if (data.bankName && data.bankAccount) {
    msg += `\n💳 *Pembayaran via Transfer:*\n`;
    msg += `Bank: ${data.bankName}\n`;
    msg += `No. Rek: ${data.bankAccount}\n`;
    if (data.bankHolder) msg += `A/N: ${data.bankHolder}\n`;
    msg += `Nominal: Rp ${formatRupiah(data.totalBill)}\n`;
  }

  msg += `\n${closing}\n_${data.businessName}_`;
  return msg;
}

export function buildReceiptMessage(data: ReceiptData): string {
  let msg = `✅ *Nota Pembayaran WiFi*\n\n`;
  msg += `Halo *${data.customerName}*,\n\n`;
  msg += `Pembayaran Anda telah dikonfirmasi oleh *${data.paidByName}*.\n\n`;
  msg += `📋 *Detail Pembayaran:*\n`;
  msg += `• Nama: ${data.customerName}\n`;
  if (data.showNik && data.nik) msg += `• NIK: ${data.nik}\n`;
  if (data.showArea) msg += `• Area: ${data.area}\n`;
  if (data.showPackage) msg += `• Paket: ${data.packageName}\n`;
  msg += `• Periode: ${data.period} (pra-bayar)\n`;
  if (data.showDiscount && data.discount > 0) msg += `• Diskon: Rp ${formatRupiah(data.discount)}\n`;
  msg += `• Total Bayar: *Rp ${formatRupiah(data.totalAmount)}*\n`;
  if (data.showPaymentMethod && data.paymentMethod) msg += `• Metode: ${data.paymentMethod}\n`;
  msg += `• Tanggal Bayar: ${data.paidAt}\n`;

  msg += `\n🧾 Lihat nota lengkap: ${data.receiptUrl}\n`;
  msg += `\nTerima kasih 🙏\n_${data.businessName}_`;
  return msg;
}

export function buildIsolationMessage(data: IsolationData): string {
  let msg = `⚠️ *Pemberitahuan Isolir*\n\n`;
  msg += `Halo *${data.customerName}*,\n\n`;
  msg += `Layanan WiFi Anda telah di-*isolir* karena tunggakan pembayaran.\n\n`;
  msg += `Silakan segera lakukan pembayaran untuk mengaktifkan kembali layanan Anda.\n`;

  if (data.bankName && data.bankAccount) {
    msg += `\n💳 *Pembayaran via Transfer:*\n`;
    msg += `Bank: ${data.bankName}\n`;
    msg += `No. Rek: ${data.bankAccount}\n`;
    if (data.bankHolder) msg += `A/N: ${data.bankHolder}\n`;
  }

  msg += `\nHubungi kami jika ada pertanyaan.\n_${data.businessName}_`;
  return msg;
}
