import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/admin/settings')({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get<any>('/settings'),
  });

  useEffect(() => {
    if (data?.data) {
      const map: Record<string, string> = {};
      for (const s of data.data) {
        map[s.key] = s.value || '';
      }
      setFormData(map);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (settings: Array<{ key: string; value: string }>) =>
      api.patch('/settings', { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setMessage('Pengaturan berhasil disimpan');
      setTimeout(() => setMessage(''), 3000);
    },
  });

  const handleSave = () => {
    const settings = Object.entries(formData).map(([key, value]) => ({ key, value }));
    updateMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const settingGroups = [
    {
      title: 'Branding',
      keys: ['app_name', 'app_logo', 'app_description'],
    },
    {
      title: 'Nota Pembayaran',
      keys: ['receipt_show_nik', 'receipt_show_area', 'receipt_show_package', 'receipt_show_discount', 'receipt_show_payment_method', 'receipt_show_paid_by'],
    },
    {
      title: 'WhatsApp',
      keys: ['wa_reminder_enabled', 'wa_receipt_enabled', 'wa_isolation_enabled'],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Pengaturan</h1>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
        >
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan
        </button>
      </div>

      {message && (
        <div className="bg-success/10 border border-success/20 text-success text-sm rounded-lg p-3">{message}</div>
      )}

      {settingGroups.map((group) => (
        <div key={group.title} className="bg-surface rounded-2xl p-4 border border-border">
          <h2 className="font-semibold text-text mb-4">{group.title}</h2>
          <div className="space-y-3">
            {group.keys.map((key) => {
              const isBool = formData[key] === 'true' || formData[key] === 'false';
              return (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm text-text-muted capitalize">{key.replace(/_/g, ' ')}</label>
                  {isBool ? (
                    <button
                      onClick={() => setFormData({ ...formData, [key]: formData[key] === 'true' ? 'false' : 'true' })}
                      className={`w-12 h-6 rounded-full transition-all relative ${formData[key] === 'true' ? 'bg-primary' : 'bg-surface-light'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${formData[key] === 'true' ? 'left-6' : 'left-0.5'}`} />
                    </button>
                  ) : (
                    <input
                      type="text"
                      value={formData[key] || ''}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="w-64 px-3 py-1.5 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
