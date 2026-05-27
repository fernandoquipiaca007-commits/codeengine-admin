/**
 * FastPayOrders — Admin page for managing FastPay payment orders.
 * Route: /fastpay
 */
import { useState, useEffect } from 'react';
import {
  Clock as LucideClock,
  CheckCircle as LucideCheckCircle,
  XCircle as LucideXCircle,
  Search as LucideSearch,
  Filter as LucideFilter,
  RefreshCw as LucideRefreshCw,
  Loader2 as LucideLoader2,
  Eye as LucideEye,
  DollarSign as LucideDollarSign,
  Package as LucidePackage,
  AlertCircle as LucideAlertCircle,
  Settings as LucideSettings,
  ToggleLeft as LucideToggleLeft,
  ToggleRight as LucideToggleRight,
} from 'lucide-react';

const Clock = LucideClock as any;
const CheckCircle = LucideCheckCircle as any;
const XCircle = LucideXCircle as any;
const Search = LucideSearch as any;
const Filter = LucideFilter as any;
const RefreshCw = LucideRefreshCw as any;
const Loader2 = LucideLoader2 as any;
const Eye = LucideEye as any;
const DollarSign = LucideDollarSign as any;
const Package = LucidePackage as any;
const AlertCircle = LucideAlertCircle as any;
const Settings = LucideSettings as any;
const ToggleLeft = LucideToggleLeft as any;
const ToggleRight = LucideToggleRight as any;
import { OrderDetailModal } from '../components/fastpay/OrderDetailModal';

interface FastPayOrder {
  id: string;
  member_id: string;
  product_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  proof_url: string | null;
  proof_uploaded_at: string | null;
  created_at: string;
  member?: { id: string; email: string; profile_data?: { name?: string } };
  product?: { id: string; title: string; price: number; cover_url: string };
}

interface FastPayStats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  failed_orders: number;
  total_revenue: number;
  average_approval_hours: number | null;
}

interface FastPaySettings {
  enabled: boolean;
  max_pending_per_member: number;
  auto_reject_days: number;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

export default function FastPayOrders() {
  const [orders, setOrders] = useState<FastPayOrder[]>([]);
  const [stats, setStats] = useState<FastPayStats | null>(null);
  const [settings, setSettings] = useState<FastPaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const configError = !ADMIN_KEY
    ? 'VITE_ADMIN_API_KEY não configurada. A aba FastPay não consegue carregar dados administrativos.'
    : null;

  useEffect(() => {
    fetchAll();
  }, [statusFilter]);

  const fetchAll = async () => {
    if (configError) {
      setErrorMessage(configError);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    await Promise.allSettled([fetchOrders(), fetchStats(), fetchSettings()]);
    setLoading(false);
  };

  async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        'x-admin-key': ADMIN_KEY,
      },
    });

    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      throw new Error(`Resposta inválida do servidor (${res.status})`);
    }

    if (!res.ok || !payload?.success) {
      const detail =
        payload?.error ||
        payload?.message ||
        `Falha na requisição (${res.status})`;
      throw new Error(detail);
    }

    return payload as T;
  }

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const data = await apiRequest<{ success: true; orders: FastPayOrder[] }>(
        `/api/admin/fastpay/orders?${params.toString()}`
      );
      setOrders(data.orders || []);
    } catch (err) {
      console.error('[FastPayOrders] Failed to fetch orders:', err);
      setOrders([]);
      const detail = err && typeof err === 'object'
        ? (err as any).message || JSON.stringify(err)
        : String(err);
      setErrorMessage(`Falha ao carregar pedidos FastPay: ${detail}`);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiRequest<{ success: true; stats: FastPayStats }>('/api/admin/fastpay/stats');
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setStats(null);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar estatísticas FastPay.');
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await apiRequest<{ success: true; settings: FastPaySettings }>('/api/admin/fastpay/settings');
      setSettings(data.settings);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setSettings(null);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar configurações FastPay.');
    }
  };

  const updateSettings = async (updates: Partial<FastPaySettings>) => {
    setSettingsLoading(true);
    try {
      await apiRequest<{ success: true }>('/api/admin/fastpay/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      setSettings(prev => prev ? { ...prev, ...updates } : prev);
      setErrorMessage(null);
    } catch (err) {
      console.error('Failed to update settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao atualizar configurações FastPay.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const filteredOrders = searchQuery.trim()
    ? orders.filter(o => {
        const q = searchQuery.toLowerCase();
        const name = (o.member?.profile_data?.name || o.member?.email || '').toLowerCase();
        const product = (o.product?.title || '').toLowerCase();
        return name.includes(q) || product.includes(q);
      })
    : orders;

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    completed: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    failed: { label: 'Rejeitado', color: 'bg-red-100 text-red-700', icon: XCircle },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">FastPay</h1>
          <p className="mt-2 text-base text-gray-500">
            Gerencie pagamentos FastPay e aprovações manuais
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm
              ${showSettings ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Settings className="w-4 h-4" />
            Configurações
          </button>
          <button
            onClick={fetchAll}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && settings && (
        <div className="mb-8 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-primary-600 rounded-full" />
            Configurações Globais
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
              <div>
                <p className="text-sm font-bold text-gray-900">FastPay Ativo</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Habilitar globalmente</p>
              </div>
              <button
                onClick={() => updateSettings({ enabled: !settings.enabled })}
                disabled={settingsLoading}
                className="text-primary-600"
              >
                {settings.enabled
                  ? <ToggleRight className="w-8 h-8 text-green-500" />
                  : <ToggleLeft className="w-8 h-8 text-gray-400" />
                }
              </button>
            </div>
            <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 ml-1">
                Máx. pedidos pendentes
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={settings.max_pending_per_member}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val > 0) updateSettings({ max_pending_per_member: val });
                }}
                className="w-full bg-white px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 ml-1">
                Auto-rejeição (dias)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={settings.auto_reject_days}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val > 0) updateSettings({ auto_reject_days: val });
                }}
                className="w-full bg-white px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-gray-50 rounded-lg">
                <Package className="w-4 h-4 text-gray-400" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{stats.total_orders}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-yellow-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-yellow-50 rounded-lg">
                <Clock className="w-4 h-4 text-yellow-500" />
              </div>
              <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">Pendentes</span>
            </div>
            <p className="text-3xl font-black text-yellow-600">{stats.pending_orders}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-green-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Aprovados</span>
            </div>
            <p className="text-3xl font-black text-green-600">{stats.completed_orders}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-red-50 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Rejeitados</span>
            </div>
            <p className="text-3xl font-black text-red-600">{stats.failed_orders}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Receita</span>
            </div>
            <p className="text-3xl font-black text-blue-600 leading-none">
              {stats.total_revenue.toFixed(0)}<span className="text-xs font-bold ml-1 uppercase">Kz</span>
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
          <div className="px-2">
            <Filter className="w-4 h-4 text-gray-400" />
          </div>
          {['all', 'pending', 'completed', 'failed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all
                ${statusFilter === s
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-100 scale-105'
                  : 'bg-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {s === 'all' ? 'Todos' : statusConfig[s as keyof typeof statusConfig].label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por membro ou produto..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
            />
          </div>
        </form>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <AlertCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-bold">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="text-left px-6 py-4">Membro</th>
                  <th className="text-left px-6 py-4">Produto</th>
                  <th className="text-left px-6 py-4">Valor</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Comprovativo</th>
                  <th className="text-left px-6 py-4">Data</th>
                  <th className="text-right px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const cfg = statusConfig[order.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {order.member?.profile_data?.name || 'Sem nome'}
                        </p>
                        <p className="text-xs text-gray-500 font-medium">{order.member?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-700 truncate max-w-[200px]">
                          {order.product?.title || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-black text-gray-900">
                        {Number(order.amount).toLocaleString('pt-AO')} <span className="text-[10px] uppercase opacity-50 ml-0.5 font-bold">Kz</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {order.proof_url ? (
                          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Enviado
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-xs font-bold hover:bg-primary-100 transition-all active:scale-95 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onActionComplete={() => {
            setSelectedOrderId(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}
