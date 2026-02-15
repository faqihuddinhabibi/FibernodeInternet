import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { useState, useEffect } from 'react';
import { MessageSquare, Wifi, WifiOff, Loader2, Send, QrCode } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/whatsapp')({
  component: WhatsAppPage,
});

function WhatsAppPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['wa-status'],
    queryFn: () => api.get<any>('/wa/status'),
    refetchInterval: 5000,
  });

  const { data: queueData } = useQuery({
    queryKey: ['wa-queue'],
    queryFn: () => api.get<any>('/wa/queue'),
    refetchInterval: 10000,
  });

  const connectMutation = useMutation({
    mutationFn: () => api.post('/wa/connect'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wa-status'] }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.post('/wa/disconnect'),
    onSuccess: () => {
      setQrCode(null);
      queryClient.invalidateQueries({ queryKey: ['wa-status'] });
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: () => api.post('/wa/send-test', { phone: testPhone, message: testMessage }),
    onSuccess: () => {
      setTestPhone('');
      setTestMessage('');
    },
  });

  useEffect(() => {
    const socket = getSocket();
    socket.on('wa:qr', (qr: string) => setQrCode(qr));
    socket.on('wa:connected', () => {
      setQrCode(null);
      queryClient.invalidateQueries({ queryKey: ['wa-status'] });
    });
    socket.on('wa:disconnected', () => {
      queryClient.invalidateQueries({ queryKey: ['wa-status'] });
    });

    return () => {
      socket.off('wa:qr');
      socket.off('wa:connected');
      socket.off('wa:disconnected');
    };
  }, [queryClient]);

  const status = statusData?.data;
  const queue = queueData?.data;
  const isConnected = status?.status === 'connected';

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-text">WhatsApp Bot</h1>

      {/* Connection Status */}
      <div className="bg-surface rounded-2xl p-4 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConnected ? 'bg-success/10' : 'bg-danger/10'}`}>
              {isConnected ? <Wifi className="w-6 h-6 text-success" /> : <WifiOff className="w-6 h-6 text-danger" />}
            </div>
            <div>
              <p className="font-semibold text-text">
                {isConnected ? 'Terhubung' : status?.status === 'connecting' ? 'Menghubungkan...' : 'Terputus'}
              </p>
              {status?.phoneNumber && (
                <p className="text-sm text-text-muted">+{status.phoneNumber}</p>
              )}
            </div>
          </div>

          {isConnected ? (
            <button
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="px-4 py-2 bg-danger/10 hover:bg-danger/20 text-danger text-sm font-medium rounded-xl transition-all"
            >
              Putuskan
            </button>
          ) : (
            <button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending || status?.status === 'connecting'}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {connectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hubungkan'}
            </button>
          )}
        </div>

        {qrCode && (
          <div className="mt-4 flex flex-col items-center gap-3 p-4 bg-white rounded-xl">
            <QrCode className="w-6 h-6 text-gray-600" />
            <p className="text-sm text-gray-600 text-center">Scan QR code dengan WhatsApp</p>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrCode)}`} alt="QR Code" className="w-64 h-64" />
          </div>
        )}
      </div>

      {/* Queue Stats */}
      {queue && (
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <h2 className="font-semibold text-text mb-3">Antrian Pesan</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-bg rounded-xl">
              <p className="text-lg font-bold text-warning">{queue.pending}</p>
              <p className="text-xs text-text-muted">Menunggu</p>
            </div>
            <div className="text-center p-3 bg-bg rounded-xl">
              <p className="text-lg font-bold text-info">{queue.sending}</p>
              <p className="text-xs text-text-muted">Mengirim</p>
            </div>
            <div className="text-center p-3 bg-bg rounded-xl">
              <p className="text-lg font-bold text-success">{queue.sent}</p>
              <p className="text-xs text-text-muted">Terkirim</p>
            </div>
            <div className="text-center p-3 bg-bg rounded-xl">
              <p className="text-lg font-bold text-danger">{queue.failed}</p>
              <p className="text-xs text-text-muted">Gagal</p>
            </div>
          </div>
        </div>
      )}

      {/* Send Test */}
      {isConnected && (
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <h2 className="font-semibold text-text mb-3">Kirim Pesan Test</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nomor telepon (62xxx)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <textarea
              placeholder="Pesan..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <button
              onClick={() => sendTestMutation.mutate()}
              disabled={sendTestMutation.isPending || !testPhone || !testMessage}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {sendTestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Kirim
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
