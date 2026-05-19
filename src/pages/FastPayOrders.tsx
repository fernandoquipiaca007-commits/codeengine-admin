/**
 * FastPayOrders — Admin page for managing FastPay payment orders.
 * Route: /fastpay
 */
import { useState, useEffect } from 'react';
import {
  Clock, CheckCircle, XCircle, Search, Filter,
  RefreshCw, Loader2, Eye, TrendingUp, DollarSign,
  Package, AlertCircle, Settings, ToggleLeft, ToggleRight,
} from 'lucide-react';
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

  useEffect(() => {
    fetchAll();
  }, [statusFilter]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchStats(), fetchSettings()]);
    setLoading(false);
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`${BACKEND_URL}/api/admin/fastpay/orders?${params}`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      });
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/fastpay/stats`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/fastpay/settings`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      });
      const data = await res.json();
      if (data.success) setSettings(data.settings);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const updateSettings = async (updates: Partial<FastPaySettings>) => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/fastpay/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(prev => prev ? { ...prev, ...updates } : prev);
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FastPay</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie pagamentos FastPay e aprovações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition
              ${showSettings ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Settings className="w-4 h-4" />
            Configurações
          </button>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && settings && (
        <div className="mb-6 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Configurações Globais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">FastPay Ativo</p>
                <p className="text-xs text-gray-500">Habilitar/desabilitar globalmente</p>
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
            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium text-gray-700 block mb-1">
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
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium text-gray-700 block mb-1">
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
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total_orders}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-yellow-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-yellow-600 uppercase tracking-wider">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending_orders}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 uppercase tracking-wider">Aprovados</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.completed_orders}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-600 uppercase tracking-wider">Rejeitados</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.failed_orders}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-blue-600 uppercase tracking-wider">Receita</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {stats.total_revenue.toFixed(0)} <span className="text-sm font-normal">Kz</span>
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 'pending', 'completed', 'failed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'Todos' : statusConfig[s as keyof typeof statusConfig].label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex-1 flex">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por membro ou produto..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        </form>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Membro</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Comprovativo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const cfg = statusConfig[order.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {order.member?.profile_data?.name || 'Sem nome'}
                        </p>
                        <p className="text-xs text-gray-500">{order.member?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900 truncate max-w-[180px]">
                          {order.product?.title || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {Number(order.amount).toFixed(2)} Kz
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {order.proof_url ? (
                          <span className="text-xs text-green-600 font-medium">✓ Enviado</span>
                        ) : (
                          <span className="text-xs text-gray-400">Pendente</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-100 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver
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
