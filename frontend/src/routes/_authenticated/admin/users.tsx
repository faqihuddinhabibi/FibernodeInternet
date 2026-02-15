import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Users, Plus, Loader2, CheckCircle, XCircle } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/admin/users')({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<any>('/users'),
  });

  const users = data?.data || [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Kelola Mitra</h1>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-all">
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
            <div key={u.id} className="bg-surface border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-text">{u.name}</p>
                    {u.isActive ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-danger" />
                    )}
                  </div>
                  <p className="text-sm text-text-muted">@{u.username} &middot; {u.businessName}</p>
                  {u.lastLoginAt && (
                    <p className="text-xs text-text-muted mt-1">Login terakhir: {formatDateTime(u.lastLoginAt)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
