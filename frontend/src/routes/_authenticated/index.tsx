import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatRupiah } from '@/lib/utils';
import { Users, Receipt, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<any>('/dashboard/stats'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = data?.data;

  const cards = [
    {
      label: 'Pelanggan Aktif',
      value: stats?.customers?.active || 0,
      icon: Users,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Total Tagihan',
      value: formatRupiah(stats?.invoices?.totalAmount || 0),
      icon: Receipt,
      color: 'text-warning bg-warning/10',
    },
    {
      label: 'Terbayar',
      value: formatRupiah(stats?.invoices?.paid || 0),
      icon: TrendingUp,
      color: 'text-success bg-success/10',
    },
    {
      label: 'Belum Bayar',
      value: formatRupiah(stats?.invoices?.unpaid || 0),
      icon: AlertTriangle,
      color: 'text-danger bg-danger/10',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-text">Dashboard</h1>
        <p className="text-sm text-text-muted">Selamat datang, {user?.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-surface rounded-2xl p-4 border border-border">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-lg lg:text-xl font-bold text-text">{card.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {stats?.invoices && (
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text">Pembayaran Bulan Ini</h2>
            <span className="text-sm font-bold text-primary">{stats.invoices.percentage}%</span>
          </div>
          <div className="w-full bg-surface-light rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${stats.invoices.percentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-text-muted">
            <span>{stats.invoices.paidCount} lunas</span>
            <span>{stats.invoices.unpaidCount} belum bayar</span>
          </div>
        </div>
      )}

      {stats?.revenueChart && stats.revenueChart.length > 0 && (
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <h2 className="font-semibold text-text mb-4">Pendapatan 12 Bulan Terakhir</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueChart}>
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
                  formatter={(value: number) => [formatRupiah(value), 'Pendapatan']}
                  labelFormatter={(label: string) => `Periode: ${label}`}
                />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
