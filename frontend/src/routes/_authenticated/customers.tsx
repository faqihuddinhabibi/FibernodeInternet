import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatRupiah, formatPhone } from '@/lib/utils';
import { useState } from 'react';
import { Search, Plus, Phone, Wifi, ChevronRight, Loader2, Filter } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/customers')({
  component: CustomersPage,
});

function CustomersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, statusFilter, page],
    queryFn: () =>
      api.get<any>(
        `/customers?q=${search}&status=${statusFilter}&page=${page}&limit=20`
      ),
  });

  const customers = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Pelanggan</h1>
        {user?.role === 'superadmin' && (
          <Link
            to="/customers"
            className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Cari nama atau telepon..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
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
            <div
              key={c.id}
              className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-primary/30 transition-all"
            >
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
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {formatPhone(c.phone)}
                  </span>
                  <span>{c.packageName} ({c.packageSpeed})</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-text-muted">Tgl {c.billingDate}</span>
                  <span className="font-semibold text-primary">{formatRupiah(c.totalBill)}</span>
                  {c.ownerBusinessName && (
                    <span className="text-text-muted">{c.ownerBusinessName}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted shrink-0" />
            </div>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text disabled:opacity-30"
          >
            Prev
          </button>
          <span className="text-sm text-text-muted">
            {page} / {meta.totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
            disabled={page >= meta.totalPages}
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
