import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatRupiah } from '@/lib/utils';
import {
  Users, Receipt, TrendingUp, AlertTriangle, Loader2,
  Wifi, WifiOff, UserPlus, FileText, MessageSquare,
  ArrowUpRight, ArrowDownRight, Activity, Zap,
  Package, Settings, User, LogOut,
} from 'lucide-react';
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

  const { data: waData } = useQuery({
    queryKey: ['wa-status'],
    queryFn: () => api.get<any>('/wa/status'),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = data?.data;
  const waStatus = waData?.data;
  const isWaConnected = waStatus?.status === 'connected';

  const cards = [
    {
      label: 'Pelanggan Aktif',
      value: stats?.customers?.active || 0,
      sub: `${stats?.customers?.total || 0} total`,
      icon: Users,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Total Tagihan',
      value: formatRupiah(stats?.invoices?.totalAmount || 0),
      sub: `${stats?.invoices?.total || 0} invoice`,
      icon: Receipt,
      color: 'text-warning bg-warning/10',
    },
    {
      label: 'Terbayar',
      value: formatRupiah(stats?.invoices?.paid || 0),
      sub: `${stats?.invoices?.paidCount || 0} lunas`,
      icon: TrendingUp,
      color: 'text-success bg-success/10',
      trend: 'up' as const,
    },
    {
      label: 'Belum Bayar',
      value: formatRupiah(stats?.invoices?.unpaid || 0),
      sub: `${stats?.invoices?.unpaidCount || 0} pending`,
      icon: AlertTriangle,
      color: 'text-danger bg-danger/10',
      trend: 'down' as const,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl p-5 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text">Selamat datang, {user?.name}!</h1>
            <p className="text-sm text-text-muted mt-1">{user?.businessName} &middot; {user?.role === 'superadmin' ? 'Super Admin' : 'Mitra'}</p>
            <p className="text-xs text-text-muted mt-2">
              Periode: <span className="text-primary font-semibold">{stats?.invoices?.period || new Date().toISOString().slice(0, 7)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isWaConnected ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {isWaConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">WA</span> {isWaConnected ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-surface rounded-2xl p-4 border border-border hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              {card.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-success" />}
              {card.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-danger" />}
            </div>
            <p className="text-lg lg:text-xl font-bold text-text">{card.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{card.label}</p>
            <p className="text-[10px] text-text-muted mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Payment Progress */}
        {stats?.invoices && (
          <div className="lg:col-span-2 bg-surface rounded-2xl p-4 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-text">Pembayaran Bulan Ini</h2>
              <span className="text-2xl font-bold text-primary">{stats.invoices.percentage}%</span>
            </div>
            <div className="w-full bg-surface-light rounded-full h-4 mb-3">
              <div
                className="bg-gradient-to-r from-primary to-primary-light h-4 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(stats.invoices.percentage, 2)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-text-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" /> {stats.invoices.paidCount} lunas</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning inline-block" /> {stats.invoices.unpaidCount} belum bayar</span>
            </div>

            {/* Customer breakdown */}
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-bg rounded-xl">
                <p className="text-sm font-bold text-primary">{stats.customers?.active || 0}</p>
                <p className="text-[10px] text-text-muted">Aktif</p>
              </div>
              <div className="text-center p-2 bg-bg rounded-xl">
                <p className="text-sm font-bold text-danger">{stats.customers?.isolated || 0}</p>
                <p className="text-[10px] text-text-muted">Isolir</p>
              </div>
              <div className="text-center p-2 bg-bg rounded-xl">
                <p className="text-sm font-bold text-text-muted">{stats.customers?.total || 0}</p>
                <p className="text-[10px] text-text-muted">Total</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions + WA Status */}
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <h2 className="font-semibold text-text mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-warning" /> Aksi Cepat</h2>
            <div className="space-y-2">
              <Link to="/customers" className="flex items-center gap-3 p-3 bg-bg rounded-xl hover:bg-surface-light transition-all">
                <UserPlus className="w-5 h-5 text-primary" />
                <span className="text-sm text-text">Tambah Pelanggan</span>
              </Link>
              <Link to="/invoices" className="flex items-center gap-3 p-3 bg-bg rounded-xl hover:bg-surface-light transition-all">
                <FileText className="w-5 h-5 text-warning" />
                <span className="text-sm text-text">Kelola Tagihan</span>
              </Link>
              <Link to="/whatsapp" className="flex items-center gap-3 p-3 bg-bg rounded-xl hover:bg-surface-light transition-all">
                <MessageSquare className="w-5 h-5 text-success" />
                <span className="text-sm text-text">WhatsApp Bot</span>
              </Link>
            </div>
          </div>

          {/* WA Status Card */}
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isWaConnected ? 'bg-success/10' : 'bg-danger/10'}`}>
                {isWaConnected ? <Wifi className="w-5 h-5 text-success" /> : <WifiOff className="w-5 h-5 text-danger" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-text">WhatsApp Bot</p>
                <p className={`text-xs font-medium ${isWaConnected ? 'text-success' : 'text-danger'}`}>
                  {isWaConnected ? 'Terhubung' : 'Terputus'}
                </p>
                {waStatus?.phoneNumber && (
                  <p className="text-[10px] text-text-muted">+{waStatus.phoneNumber}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Grid - only visible on mobile since desktop has sidebar */}
      <div className="lg:hidden bg-surface rounded-2xl p-4 border border-border">
        <h2 className="font-semibold text-text mb-3">Menu</h2>
        <div className={`grid gap-2 ${user?.role === 'superadmin' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {user?.role === 'superadmin' && (
            <>
              <Link to="/admin/users" className="flex flex-col items-center gap-1.5 p-3 bg-bg rounded-xl hover:bg-surface-light transition-all">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-[11px] text-text font-medium">Mitra</span>
              </Link>
              <Link to="/admin/packages" className="flex flex-col items-center gap-1.5 p-3 bg-bg rounded-xl hover:bg-surface-light transition-all">
                <Package className="w-5 h-5 text-warning" />
                <span className="text-[11px] text-text font-medium">Paket</span>
              </Link>
              <Link to="/admin/settings" className="flex flex-col items-center gap-1.5 p-3 bg-bg rounded-xl hover:bg-surface-light transition-all">
                <Settings className="w-5 h-5 text-info" />
                <span className="text-[11px] text-text font-medium">Pengaturan</span>
              </Link>
            </>
          )}
          <Link to="/profile" className="flex flex-col items-center gap-1.5 p-3 bg-bg rounded-xl hover:bg-surface-light transition-all">
            <User className="w-5 h-5 text-success" />
            <span className="text-[11px] text-text font-medium">Profil</span>
          </Link>
        </div>
      </div>

      {/* Revenue Chart */}
      {stats?.revenueChart && stats.revenueChart.length > 0 && (
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Pendapatan 12 Bulan Terakhir
          </h2>
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
