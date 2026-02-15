import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatRupiah } from '@/lib/utils';
import { useState } from 'react';
import { Package, Plus, Loader2, Wifi, X, Pencil, Trash2 } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/admin/packages')({
  component: AdminPackagesPage,
});

interface PkgForm {
  name: string;
  speed: string;
  price: number;
  description: string;
}

const emptyForm: PkgForm = { name: '', speed: '', price: 0, description: '' };

function AdminPackagesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PkgForm>(emptyForm);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => api.get<any>('/packages'),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/packages', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-packages'] }); closeModal(); },
    onError: (err: any) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/packages/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-packages'] }); closeModal(); },
    onError: (err: any) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/packages/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-packages'] }),
    onError: (err: any) => alert(err.message),
  });

  const packages = data?.data || [];

  const openCreate = () => { setEditId(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit = (pkg: any) => {
    setEditId(pkg.id);
    setForm({ name: pkg.name, speed: pkg.speed, price: pkg.price, description: pkg.description || '' });
    setError(''); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditId(null); setForm(emptyForm); setError(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const body = { name: form.name, speed: form.speed, price: form.price, description: form.description || undefined };
    if (editId) updateMutation.mutate({ id: editId, body });
    else createMutation.mutate(body);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Kelola Paket</h1>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-all">
          <Plus className="w-4 h-4" />
          Tambah Paket
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada paket</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {packages.map((pkg: any) => (
            <div key={pkg.id} className="bg-surface border border-border rounded-2xl p-4 hover:border-primary/20 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Wifi className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text">{pkg.name}</p>
                    <p className="text-xs text-text-muted">{pkg.speed}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(pkg)} className="p-1.5 hover:bg-surface-light rounded-lg text-text-muted hover:text-primary transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm(`Nonaktifkan paket ${pkg.name}?`)) deleteMutation.mutate(pkg.id); }}
                    className="p-1.5 hover:bg-danger/10 rounded-lg text-text-muted hover:text-danger transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-lg font-bold text-primary">{formatRupiah(pkg.price)}<span className="text-xs font-normal text-text-muted">/bln</span></p>
              {pkg.description && <p className="text-xs text-text-muted mt-1">{pkg.description}</p>}
              <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${pkg.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {pkg.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-bold text-text">{editId ? 'Edit Paket' : 'Tambah Paket'}</h2>
              <button onClick={closeModal} className="text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Nama Paket</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Kecepatan</label>
                  <input type="text" required value={form.speed} onChange={(e) => setForm({ ...form, speed: e.target.value })} placeholder="10 Mbps"
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Harga (Rp)</label>
                  <input type="number" required min={1} value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Deskripsi (opsional)</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <button type="submit" disabled={isPending}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {editId ? 'Simpan Perubahan' : 'Tambah Paket'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
