import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useState } from 'react';
import { User, Save, Loader2, Eye, EyeOff } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bankName, setBankName] = useState(user?.bankName || '');
  const [bankAccount, setBankAccount] = useState(user?.bankAccount || '');
  const [bankHolder, setBankHolder] = useState(user?.bankHolder || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const body: Record<string, string> = { name, phone, bankName, bankAccount, bankHolder };
      if (newPassword) {
        body.password = newPassword;
        body.currentPassword = currentPassword;
      }

      await api.patch('/auth/me', body);
      await refreshUser();
      setMessage('Profil berhasil diperbarui');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui profil');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-text">Profil</h1>

      <div className="bg-surface rounded-2xl p-4 border border-border">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-bold text-text text-lg">{user?.name}</p>
            <p className="text-sm text-text-muted">@{user?.username}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
              {user?.role === 'superadmin' ? 'Super Admin' : 'Mitra'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <div className="bg-success/10 border border-success/20 text-success text-sm rounded-lg p-3">{message}</div>
          )}
          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Nama</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Telepon</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="62xxx"
              className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Nama Bank</label>
              <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">No. Rekening</label>
              <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Atas Nama</label>
              <input type="text" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm font-medium text-text-muted mb-3">Ubah Password (opsional)</p>
            <div className="space-y-3">
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Password lama"
                className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password baru (min 8 karakter)"
                  className="w-full px-4 py-2.5 pr-12 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Simpan
          </button>
        </form>
      </div>
    </div>
  );
}
