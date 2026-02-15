import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useState } from 'react';
import {
  Users, Plus, Loader2, CheckCircle, XCircle, X, Eye, EyeOff,
  Pencil, Trash2, Phone, Building2, CreditCard,
} from 'lucide-react';

export const Route = createFileRoute('/_authenticated/admin/users')({
  component: AdminUsersPage,
});

interface MitraForm {
  username: string;
  password: string;
  name: string;
  phone: string;
  businessName: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
}

const emptyForm: MitraForm = {
  username: '', password: '', name: '', phone: '',
  businessName: '', bankName: '', bankAccount: '', bankHolder: '',
};

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<any>(null);
  const [form, setForm] = useState<MitraForm>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<any>('/users'),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/users', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      closeModal();
    },
    onError: (err: any) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/users/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      closeModal();
    },
    onError: (err: any) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDetailUser(null);
    },
    onError: (err: any) => setError(err.message),
  });

  const users = data?.data || [];

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (u: any) => {
    setEditId(u.id);
    setForm({
      username: u.username,
      password: '',
      name: u.name,
      phone: u.phone || '',
      businessName: u.businessName,
      bankName: u.bankName || '',
      bankAccount: u.bankAccount || '',
      bankHolder: u.bankHolder || '',
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
    if (editId) {
      const body: any = {
        name: form.name,
        phone: form.phone || undefined,
        businessName: form.businessName,
        bankName: form.bankName || undefined,
        bankAccount: form.bankAccount || undefined,
        bankHolder: form.bankHolder || undefined,
      };
      if (form.password) body.password = form.password;
      updateMutation.mutate({ id: editId, body });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Kelola Mitra</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Mitra
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada mitra</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u: any) => (
            <div
              key={u.id}
              className="bg-surface border border-border rounded-2xl p-4 hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => setDetailUser(u)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-text">{u.name}</p>
                    {u.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">Aktif</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-danger/10 text-danger">Nonaktif</span>
                    )}
                  </div>
                  <p className="text-sm text-text-muted">@{u.username}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{u.businessName}</span>
                    {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{u.phone}</span>}
                  </div>
                  {u.lastLoginAt && (
                    <p className="text-xs text-text-muted mt-1">Login terakhir: {formatDateTime(u.lastLoginAt)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(u); }}
                    className="p-2 hover:bg-surface-light rounded-lg transition-all text-text-muted hover:text-primary"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-bold text-text">{editId ? 'Edit Mitra' : 'Tambah Mitra'}</h2>
              <button onClick={closeModal} className="text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3">{error}</div>}

              {!editId && (
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Username</label>
                  <input type="text" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  {editId ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required={!editId} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 karakter"
                    className="w-full px-4 py-2.5 pr-12 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Nama Lengkap</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Nama Usaha</label>
                <input type="text" required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Telepon (62xxx)</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="6281234567890"
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-text-muted mb-2">Info Bank (opsional)</p>
                <div className="space-y-3">
                  <input type="text" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Nama Bank"
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input type="text" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} placeholder="No. Rekening"
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <input type="text" value={form.bankHolder} onChange={(e) => setForm({ ...form, bankHolder: e.target.value })} placeholder="Atas Nama"
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <button type="submit" disabled={isPending}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {editId ? 'Simpan Perubahan' : 'Tambah Mitra'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetailUser(null)}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-bold text-text">Detail Mitra</h2>
              <button onClick={() => setDetailUser(null)} className="text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-text text-lg">{detailUser.name}</p>
                  <p className="text-sm text-text-muted">@{detailUser.username}</p>
                  {detailUser.isActive ? (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">Aktif</span>
                  ) : (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-danger/10 text-danger">Nonaktif</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-text-muted">Nama Usaha</span><span className="text-text font-medium">{detailUser.businessName}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Telepon</span><span className="text-text font-medium">{detailUser.phone || '-'}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Bank</span><span className="text-text font-medium">{detailUser.bankName || '-'}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">No. Rekening</span><span className="text-text font-medium">{detailUser.bankAccount || '-'}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Atas Nama</span><span className="text-text font-medium">{detailUser.bankHolder || '-'}</span></div>
                {detailUser.lastLoginAt && (
                  <div className="flex justify-between"><span className="text-text-muted">Login Terakhir</span><span className="text-text font-medium">{formatDateTime(detailUser.lastLoginAt)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-text-muted">Terdaftar</span><span className="text-text font-medium">{formatDateTime(detailUser.createdAt)}</span></div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => { setDetailUser(null); openEdit(detailUser); }}
                  className="flex-1 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => { if (confirm(`Nonaktifkan mitra ${detailUser.name}?`)) deleteMutation.mutate(detailUser.id); }}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2.5 bg-danger/10 hover:bg-danger/20 text-danger text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Nonaktifkan
                </button>
              </div>
              {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3">{error}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
