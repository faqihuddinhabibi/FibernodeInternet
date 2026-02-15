import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatRupiah, formatPhone } from '@/lib/utils';
import { useState } from 'react';
import {
  Search, Plus, Phone, Wifi, ChevronRight, Loader2,
  X, Pencil, Upload, Download, CheckCircle, AlertTriangle,
} from 'lucide-react';

export const Route = createFileRoute('/_authenticated/customers')({
  component: CustomersPage,
});

interface CustomerForm {
  name: string;
  phone: string;
  packageId: string;
  billingDate: number;
  discount: number;
  nik: string;
  address: string;
  notes: string;
}

const emptyForm: CustomerForm = {
  name: '', phone: '', packageId: '', billingDate: 1,
  discount: 0, nik: '', address: '', notes: '',
};

function CustomersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [error, setError] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, statusFilter, page],
    queryFn: () => api.get<any>(`/customers?q=${search}&status=${statusFilter}&page=${page}&limit=20`),
  });

  const { data: packagesData } = useQuery({
    queryKey: ['packages-list'],
    queryFn: () => api.get<any>('/packages'),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/customers', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); closeModal(); },
    onError: (err: any) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/customers/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); closeModal(); },
    onError: (err: any) => setError(err.message),
  });

  const importMutation = useMutation({
    mutationFn: (csv: string) => api.post<any>('/customers/import', { csv }),
    onSuccess: (res) => {
      setImportResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => setError(err.message),
  });

  const customers = data?.data || [];
  const meta = data?.meta;
  const packages = packagesData?.data || [];

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      name: c.name, phone: c.phone, packageId: c.packageId,
      billingDate: c.billingDate, discount: c.discount || 0,
      nik: c.nik || '', address: c.address || '', notes: c.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(emptyForm);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body: any = {
      name: form.name,
      phone: form.phone,
      packageId: form.packageId,
      billingDate: form.billingDate,
      discount: form.discount,
      nik: form.nik || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvContent(ev.target?.result as string);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    window.open(`/api/customers/export?q=${search}&status=${statusFilter}`, '_blank');
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Pelanggan</h1>
        <div className="flex items-center gap-2">
          {user?.role === 'superadmin' && (
            <>
              <button onClick={() => { setShowImport(true); setImportResult(null); setCsvContent(''); setError(''); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border hover:bg-surface-light text-text text-sm font-medium rounded-xl transition-all">
                <Upload className="w-4 h-4" /> Import
              </button>
              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border hover:bg-surface-light text-text text-sm font-medium rounded-xl transition-all">
                <Download className="w-4 h-4" /> Export
              </button>
            </>
          )}
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type="text" placeholder="Cari nama atau telepon..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">Semua</option>
          <option value="active">Aktif</option>
          <option value="isolated">Isolir</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Wifi className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada pelanggan</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c: any) => (
            <div key={c.id}
              onClick={() => openEdit(c)}
              className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-primary/30 transition-all cursor-pointer">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-text truncate">{c.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    c.status === 'active' ? 'bg-success/10 text-success' :
                    c.status === 'isolated' ? 'bg-danger/10 text-danger' :
                    'bg-text-muted/10 text-text-muted'
                  }`}>
                    {c.status === 'active' ? 'Aktif' : c.status === 'isolated' ? 'Isolir' : 'Nonaktif'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{formatPhone(c.phone)}</span>
                  <span>{c.packageName} ({c.packageSpeed})</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-text-muted">Tgl {c.billingDate}</span>
                  <span className="font-semibold text-primary">{formatRupiah(c.totalBill)}</span>
                  {c.ownerBusinessName && <span className="text-text-muted">{c.ownerBusinessName}</span>}
                </div>
              </div>
              <Pencil className="w-4 h-4 text-text-muted shrink-0" />
            </div>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text disabled:opacity-30">Prev</button>
          <span className="text-sm text-text-muted">{page} / {meta.totalPages}</span>
          <button onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={page >= meta.totalPages}
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text disabled:opacity-30">Next</button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-bold text-text">{editId ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h2>
              <button onClick={closeModal} className="text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Nama</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Telepon (62xxx)</label>
                <input type="text" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="6281234567890"
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Paket</label>
                <select required value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Pilih paket...</option>
                  {packages.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} - {p.speed} ({formatRupiah(p.price)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Tanggal Tagihan (1-28)</label>
                  <input type="number" required min={1} max={28} value={form.billingDate}
                    onChange={(e) => setForm({ ...form, billingDate: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Diskon (Rp)</label>
                  <input type="number" min={0} value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">NIK (opsional)</label>
                <input type="text" value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Alamat (opsional)</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Catatan (opsional)</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>

              <button type="submit" disabled={isPending}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {editId ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-bold text-text">Import Pelanggan (CSV)</h2>
              <button onClick={() => setShowImport(false)} className="text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3">{error}</div>}

              <div className="bg-bg rounded-xl p-3 text-xs text-text-muted space-y-1">
                <p className="font-medium text-text text-sm">Format CSV:</p>
                <p>nama, telepon, diskon, tanggal, area, paket_nama, paket_tarif, total_bayar, nik, tanggal_register</p>
                <p className="mt-1">Telepon format: 62xxx | Tanggal: 1-28 | Area = nama usaha mitra</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Upload File CSV</label>
                <input type="file" accept=".csv" onChange={handleFileUpload}
                  className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
              </div>

              {csvContent && (
                <div>
                  <p className="text-sm text-text-muted mb-1">Preview ({csvContent.split('\n').length - 1} baris data)</p>
                  <pre className="bg-bg rounded-xl p-3 text-xs text-text-muted overflow-x-auto max-h-32">{csvContent.slice(0, 500)}{csvContent.length > 500 ? '...' : ''}</pre>
                </div>
              )}

              {importResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-success font-medium">{importResult.imported} berhasil diimport</span>
                  </div>
                  {importResult.failed > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-danger" />
                      <span className="text-danger font-medium">{importResult.failed} gagal</span>
                    </div>
                  )}
                  {importResult.errors?.length > 0 && (
                    <div className="bg-danger/5 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                      {importResult.errors.map((err: any, i: number) => (
                        <p key={i} className="text-xs text-danger">Baris {err.row}: {err.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => { setError(''); importMutation.mutate(csvContent); }}
                disabled={!csvContent || importMutation.isPending}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {importMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
