import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatRupiah, formatDate } from '@/lib/utils';
import { useState } from 'react';
import { Receipt, Check, X, Loader2, Search, Filter } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/invoices')({
  component: InvoicesPage,
});

function InvoicesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', period, status, page],
    queryFn: () => api.get<any>(`/invoices?period=${period}&status=${status}&page=${page}&limit=20`),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      api.patch(`/invoices/${id}/pay`, { version, paymentMethod: 'cash' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const invoices = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Tagihan</h1>
      </div>

      <div className="flex gap-2">
        <input
          type="month"
          value={period}
          onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Semua</option>
          <option value="unpaid">Belum Bayar</option>
          <option value="paid">Lunas</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada tagihan</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv: any) => (
            <div
              key={inv.id}
              className="bg-surface border border-border rounded-2xl p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-text truncate">{inv.customerName}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      inv.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      {inv.status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {inv.packageName} &middot; Periode {inv.period} &middot; JT: {inv.dueDate}
                  </p>
                  {inv.ownerBusinessName && (
                    <p className="text-xs text-text-muted">{inv.ownerBusinessName}</p>
                  )}
                  <p className="text-sm font-bold text-primary mt-1">{formatRupiah(inv.totalAmount)}</p>
                  {inv.paidAt && (
                    <p className="text-xs text-success mt-0.5">Dibayar: {formatDate(inv.paidAt)}</p>
                  )}
                </div>

                {inv.status === 'unpaid' && (
                  <button
                    onClick={() => payMutation.mutate({ id: inv.id, version: inv.version })}
                    disabled={payMutation.isPending}
                    className="shrink-0 ml-3 px-3 py-2 bg-success/10 hover:bg-success/20 text-success text-xs font-medium rounded-xl transition-all flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Bayar
                  </button>
                )}
              </div>
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
          <span className="text-sm text-text-muted">{page} / {meta.totalPages}</span>
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
