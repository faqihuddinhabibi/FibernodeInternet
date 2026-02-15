import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { formatDateTime, formatPhone } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
  MessageSquare, Wifi, WifiOff, Loader2, Send, QrCode,
  Search, CheckCircle, XCircle, Clock, AlertTriangle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const Route = createFileRoute('/_authenticated/whatsapp')({
  component: WhatsAppPage,
});

function WhatsAppPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [logFilter, setLogFilter] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);

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

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['wa-logs', logFilter, logPage],
    queryFn: () => api.get<any>(`/wa/logs?type=${logFilter}&page=${logPage}&limit=20`),
    refetchInterval: 15000,
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
      setSendResult({ type: 'success', msg: 'Pesan berhasil terkirim!' });
      queryClient.invalidateQueries({ queryKey: ['wa-logs'] });
      setTimeout(() => setSendResult(null), 5000);
    },
    onError: (err: any) => {
      setSendResult({ type: 'error', msg: err.message || 'Gagal mengirim pesan' });
      setTimeout(() => setSendResult(null), 5000);
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
  const logs = logsData?.data || [];
  const logsMeta = logsData?.meta;

  const filteredLogs = logSearch
    ? logs.filter((l: any) => l.phone?.includes(logSearch) || l.content?.toLowerCase().includes(logSearch.toLowerCase()))
    : logs;

  const statusIcon = (s: string) => {
    if (s === 'sent') return <CheckCircle className="w-4 h-4 text-success shrink-0" />;
    if (s === 'failed') return <XCircle className="w-4 h-4 text-danger shrink-0" />;
    if (s === 'sending') return <Loader2 className="w-4 h-4 text-info animate-spin shrink-0" />;
    return <Clock className="w-4 h-4 text-warning shrink-0" />;
  };

  const statusLabel = (s: string) => {
    if (s === 'sent') return 'Terkirim';
    if (s === 'failed') return 'Gagal';
    if (s === 'sending') return 'Mengirim';
    return 'Menunggu';
  };

  const statusColor = (s: string) => {
    if (s === 'sent') return 'bg-success/10 text-success';
    if (s === 'failed') return 'bg-danger/10 text-danger';
    if (s === 'sending') return 'bg-info/10 text-info';
    return 'bg-warning/10 text-warning';
  };

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
              {connectMutation.isPending || status?.status === 'connecting' ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Menghubungkan...</span>
              ) : 'Hubungkan'}
            </button>
          )}
        </div>

        {qrCode && (
          <div className="mt-4 flex flex-col items-center gap-3 p-4 bg-white rounded-xl">
            <QrCode className="w-6 h-6 text-gray-600" />
            <p className="text-sm text-gray-600 text-center">Scan QR code dengan WhatsApp</p>
            <QRCodeSVG value={qrCode} size={220} level="M" className="w-48 h-48 sm:w-56 sm:h-56" />
          </div>
        )}
      </div>

      {/* Queue Stats */}
      {queue && (
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <h2 className="font-semibold text-text mb-3">Antrian Pesan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          {sendResult && (
            <div className={`mb-3 flex items-center gap-2 text-sm rounded-lg p-3 ${sendResult.type === 'success' ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'}`}>
              {sendResult.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              {sendResult.msg}
            </div>
          )}
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

      {/* Message Logs */}
      <div className="bg-surface rounded-2xl p-4 border border-border">
        <h2 className="font-semibold text-text mb-3">Log Pesan</h2>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Cari nomor atau isi pesan..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-xl text-sm text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select
            value={logFilter}
            onChange={(e) => { setLogFilter(e.target.value); setLogPage(1); }}
            className="w-full sm:w-auto px-3 py-2 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Semua</option>
            <option value="reminder">Reminder</option>
            <option value="receipt">Nota</option>
            <option value="isolation">Isolasi</option>
            <option value="manual">Manual</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {logsLoading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Belum ada log pesan</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLogs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-bg rounded-xl">
                {statusIcon(log.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text">{formatPhone(log.phone)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor(log.status)}`}>
                      {statusLabel(log.status)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-light text-text-muted">
                      {log.messageType}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">{log.content}</p>
                  {log.errorMessage && (
                    <p className="text-xs text-danger mt-0.5">{log.errorMessage}</p>
                  )}
                  <p className="text-[10px] text-text-muted mt-1">{log.sentAt ? formatDateTime(log.sentAt) : '-'}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {logsMeta && logsMeta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-3 mt-3 border-t border-border">
            <button
              onClick={() => setLogPage(Math.max(1, logPage - 1))}
              disabled={logPage <= 1}
              className="px-3 py-1.5 bg-bg border border-border rounded-lg text-sm text-text disabled:opacity-30"
            >
              Prev
            </button>
            <span className="text-sm text-text-muted">{logPage} / {logsMeta.totalPages}</span>
            <button
              onClick={() => setLogPage(Math.min(logsMeta.totalPages, logPage + 1))}
              disabled={logPage >= logsMeta.totalPages}
              className="px-3 py-1.5 bg-bg border border-border rounded-lg text-sm text-text disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
