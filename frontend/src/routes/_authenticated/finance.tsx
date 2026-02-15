import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatRupiah } from '@/lib/utils';
import { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const Route = createFileRoute('/_authenticated/finance')({
  component: FinancePage,
});

function FinancePage() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => api.get<any>('/finance/summary'),
  });

  const { data: periodData, isLoading: periodLoading } = useQuery({
    queryKey: ['finance-period', year],
    queryFn: () => api.get<any>(`/finance/by-period?year=${year}`),
  });

  const isLoading = summaryLoading || periodLoading;
  const stats = summary?.data;
  const chartData = periodData?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Keuangan</h1>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <p className="text-lg font-bold text-text">{formatRupiah(stats.totalAmount)}</p>
            <p className="text-xs text-text-muted">Total Tagihan</p>
          </div>
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <p className="text-lg font-bold text-success">{formatRupiah(stats.totalPaid)}</p>
            <p className="text-xs text-text-muted">Terbayar ({stats.paidCount})</p>
          </div>
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center mb-2">
              <TrendingDown className="w-5 h-5 text-danger" />
            </div>
            <p className="text-lg font-bold text-danger">{formatRupiah(stats.totalUnpaid)}</p>
            <p className="text-xs text-text-muted">Belum Bayar ({stats.unpaidCount})</p>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <h2 className="font-semibold text-text mb-4">Grafik Keuangan {year}</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="period"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}jt`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 12, color: '#F8FAFC' }}
                  formatter={(value: number, name: string) => [
                    formatRupiah(value),
                    name === 'totalPaid' ? 'Terbayar' : 'Belum Bayar',
                  ]}
                  labelFormatter={(label: string) => `Periode: ${label}`}
                />
                <Legend
                  formatter={(value: string) => value === 'totalPaid' ? 'Terbayar' : 'Belum Bayar'}
                />
                <Bar dataKey="totalPaid" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalUnpaid" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
