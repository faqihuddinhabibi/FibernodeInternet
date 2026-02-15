import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatRupiah } from '@/lib/utils';
import { Package, Plus, Loader2, Wifi } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/admin/packages')({
  component: AdminPackagesPage,
});

function AdminPackagesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => api.get<any>('/packages'),
  });

  const packages = data?.data || [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Kelola Paket</h1>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-all">
          <Plus className="w-4 h-4" />
          Tambah Paket
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada paket</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {packages.map((pkg: any) => (
            <div key={pkg.id} className="bg-surface border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-text">{pkg.name}</p>
                  <p className="text-xs text-text-muted">{pkg.speed}</p>
                </div>
              </div>
              <p className="text-lg font-bold text-primary">{formatRupiah(pkg.price)}</p>
              {pkg.description && <p className="text-xs text-text-muted mt-1">{pkg.description}</p>}
              <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${pkg.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {pkg.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
