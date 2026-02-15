import { createFileRoute, Outlet, redirect, useNavigate, Link, useRouterState } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Package, Receipt, BarChart3,
  MessageSquare, Settings, User, LogOut, Menu, X, ChevronDown,
  Wifi, Home,
} from 'lucide-react';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthenticatedLayout,
});

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Pelanggan', icon: Users },
  { to: '/invoices', label: 'Tagihan', icon: Receipt },
  { to: '/finance', label: 'Keuangan', icon: BarChart3 },
  { to: '/whatsapp', label: 'WhatsApp', icon: MessageSquare },
] as const;

const adminNavItems = [
  { to: '/admin/users', label: 'Mitra', icon: Users },
  { to: '/admin/packages', label: 'Paket', icon: Package },
  { to: '/admin/settings', label: 'Pengaturan', icon: Settings },
] as const;

function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/login' });
  };

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <div className="min-h-dvh bg-bg flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface border-r border-border fixed h-full z-30">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-text text-sm">FiberNode</h1>
              <p className="text-xs text-text-muted">{user?.businessName}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive(item.to)
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted hover:bg-surface-light hover:text-text'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}

          {user?.role === 'superadmin' && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Admin</p>
              </div>
              {adminNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive(item.to)
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-muted hover:bg-surface-light hover:text-text'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:bg-surface-light hover:text-text transition-all"
          >
            <User className="w-5 h-5" />
            Profil
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-danger hover:bg-danger/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-surface border-r border-border z-50 transform transition-transform lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wifi className="w-6 h-6 text-primary" />
            <span className="font-bold text-text">FiberNode</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-text-muted">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive(item.to)
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted hover:bg-surface-light hover:text-text'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}

          {user?.role === 'superadmin' && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Admin</p>
              </div>
              {adminNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive(item.to)
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-muted hover:bg-surface-light hover:text-text'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </>
          )}

          <div className="pt-3 border-t border-border mt-3">
            <Link
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:bg-surface-light hover:text-text transition-all"
            >
              <User className="w-5 h-5" />
              Profil
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-danger hover:bg-danger/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Keluar
            </button>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-surface/80 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-text-muted">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm text-text">FiberNode</span>
          </div>
          <Link to="/profile" className="text-text-muted">
            <User className="w-6 h-6" />
          </Link>
        </header>

        <main className="p-4 lg:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-lg border-t border-border z-20 safe-area-bottom">
          <div className="flex items-center justify-around py-2">
            {[
              { to: '/' as const, icon: Home, label: 'Home' },
              { to: '/customers' as const, icon: Users, label: 'Pelanggan' },
              { to: '/invoices' as const, icon: Receipt, label: 'Tagihan' },
              { to: '/finance' as const, icon: BarChart3, label: 'Keuangan' },
              { to: '/whatsapp' as const, icon: MessageSquare, label: 'WA' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                  isActive(item.to) ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
