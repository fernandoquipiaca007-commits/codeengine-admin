import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { checkConnection } from '../lib/supabase-admin';
import { useAdminAnalytics } from '../hooks/useAdminAnalytics';

import { 
  Eye, TrendingUp, Users, Activity, DollarSign, Landmark, 
  Plus, Bookmark, Ticket, LayoutGrid, CheckCircle
} from 'lucide-react';

export default function Dashboard() {
  const { data, loading: analyticsLoading, error: analyticsError, warning: analyticsWarning } = useAdminAnalytics();
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Real-time Traffic and Product Sales states
  const [trafficStats, setTrafficStats] = useState<any | null>(null);
  const [loadingTraffic, setLoadingTraffic] = useState(false);

  useEffect(() => {
    checkConnection().then((ok) => {
      setConnectionStatus(ok ? 'connected' : 'error');
      if (!ok) {
        setErrorMessage('Failed to connect to Supabase. Check your environment variables.');
      }
    });

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

    setLoadingTraffic(true);
    fetch(`${BACKEND_URL}/api/admin/collaborators/traffic-stats`, {
      headers: { 'x-admin-key': ADMIN_KEY }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTrafficStats(data);
        }
      })
      .catch(err => console.error('Error fetching traffic stats:', err))
      .finally(() => setLoadingTraffic(false));
  }, []);

  const loading = analyticsLoading || connectionStatus === 'checking';

  return (
    <div className="p-4 sm:p-6 md:p-8 overflow-x-hidden space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-display">Painel de Controle</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Bem-vindo ao Painel Administrativo da Loja de Conhecimento IA
          </p>
        </div>
        {trafficStats && trafficStats.traffic && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-150 px-4 py-2 rounded-xl text-green-700 font-semibold text-xs shadow-sm self-start md:self-center">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span>{trafficStats.traffic.active1Min} Usuários ativos agora</span>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div>
        {connectionStatus === 'checking' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-blue-800">Verificando conexão com Supabase...</p>
            </div>
          </div>
        )}
        {connectionStatus === 'connected' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600" />
            <p className="text-sm text-green-800 font-medium">Conectado ao Supabase com sucesso</p>
          </div>
        )}
        {connectionStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <Activity size={20} className="text-red-600 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-semibold">Falha ao conectar ao Supabase</p>
              {errorMessage && <p className="text-xs text-red-700 mt-1">{errorMessage}</p>}
            </div>
          </div>
        )}
      </div>

      {analyticsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Falha ao carregar métricas do dashboard: {analyticsError}
        </div>
      )}
      {analyticsWarning && !analyticsError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {analyticsWarning}
        </div>
      )}

      {/* Main Core Statistics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total de Produtos</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><LayoutGrid size={18} /></div>
          </div>
          <span className="text-3xl font-extrabold text-gray-900 block mt-2 font-display">{loading ? '...' : data.totalProducts}</span>
          <span className="text-xs text-gray-500 mt-1 block">Produtos ativos na plataforma</span>
        </div>

        {/* Total Members */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total de Membros</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={18} /></div>
          </div>
          <span className="text-3xl font-extrabold text-gray-900 block mt-2 font-display">{loading ? '...' : data.totalMembers}</span>
          <span className="text-xs text-gray-500 mt-1 block">Usuários e clientes cadastrados</span>
        </div>

        {/* Total Sales (Combined USD / AOA count) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total de Pedidos</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={18} /></div>
          </div>
          <span className="text-3xl font-extrabold text-gray-900 block mt-2 font-display">
            {loading ? '...' : `${data.totalSales} USD / ${data.aoaSales || 0} AOA`}
          </span>
          <span className="text-xs text-gray-500 mt-1 block">Transações concluídas com sucesso</span>
        </div>

        {/* Real-time traffic views */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Visualizações Totais</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Eye size={18} /></div>
          </div>
          <span className="text-3xl font-extrabold text-gray-900 block mt-2 font-display">
            {loadingTraffic ? '...' : (trafficStats?.traffic?.totalPageViews ? trafficStats.traffic.totalPageViews.toLocaleString('pt-AO') : '0')}
          </span>
          <span className="text-xs text-gray-500 mt-1 block">Visualizações de página acumuladas</span>
        </div>
      </div>

      {/* Financial Breakdown (Separated Ecosystems) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* USD ECOSYSTEM CARD */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
                <DollarSign size={18} />
              </div>
              <h4 className="font-bold text-white tracking-wide uppercase text-sm">Faturamento USD (Stripe)</h4>
            </div>
            <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2.5 py-0.5">USD</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Faturamento Total</span>
              <span className="text-xl font-bold text-white block mt-1 font-mono">${(data.totalRevenue || 0).toFixed(2)}</span>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Faturamento Hoje</span>
              <span className="text-xl font-bold text-green-400 block mt-1 font-mono">${(data.revenueToday || 0).toFixed(2)}</span>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Quantidade de Vendas</span>
              <span className="text-xl font-bold text-white block mt-1 font-mono">{data.totalSales}</span>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Valor Médio do Pedido</span>
              <span className="text-xl font-bold text-white block mt-1 font-mono">${(data.avgOrderValue || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* AOA ECOSYSTEM CARD */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                <Landmark size={18} />
              </div>
              <h4 className="font-bold text-white tracking-wide uppercase text-sm">Faturamento AOA (Kwanza / Facipay)</h4>
            </div>
            <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2.5 py-0.5">AOA</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Faturamento Total</span>
              <span className="text-xl font-bold text-white block mt-1 font-mono">{(data.aoaRevenue || 0).toLocaleString('pt-AO')} Kz</span>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Faturamento Hoje</span>
              <span className="text-xl font-bold text-green-400 block mt-1 font-mono">{(data.aoaRevenueToday || 0).toLocaleString('pt-AO')} Kz</span>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Quantidade de Vendas</span>
              <span className="text-xl font-bold text-white block mt-1 font-mono">{data.aoaSales || 0}</span>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Valor Médio do Pedido</span>
              <span className="text-xl font-bold text-white block mt-1 font-mono">{(data.avgOrderValueAoa || 0).toLocaleString('pt-AO', { maximumFractionDigits: 0 })} Kz</span>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic analysis & Product Sales tables */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Most visited pages */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm lg:col-span-1">
          <div className="border-b border-gray-200 px-5 py-4">
            <h3 className="font-bold text-gray-900 text-sm font-display flex items-center gap-1.5">
              <Eye size={16} className="text-blue-500" /> Páginas Mais Visitadas
            </h3>
          </div>
          <div className="p-4">
            {loadingTraffic ? (
              <p className="text-center py-6 text-gray-400 text-xs">Carregando dados...</p>
            ) : trafficStats?.traffic?.topPages && trafficStats.traffic.topPages.length > 0 ? (
              <div className="space-y-3">
                {trafficStats.traffic.topPages.slice(0, 8).map((page: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <span className="font-mono text-gray-600 truncate max-w-[170px]" title={page.path}>
                      {page.path}
                    </span>
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                      {page.count} views
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-gray-400 text-xs">Sem tráfego registrado.</p>
            )}
          </div>
        </div>

        {/* Product sales performances */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm lg:col-span-2">
          <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm font-display flex items-center gap-1.5">
              <TrendingUp size={16} className="text-green-500" /> Desempenho de Vendas por Produto
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase text-gray-400">
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-5 py-3">Autor</th>
                  <th className="px-5 py-3 text-center">Quant. Vendas</th>
                  <th className="px-5 py-3 text-right">Faturamento USD</th>
                  <th className="px-5 py-3 text-right">Faturamento AOA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingTraffic ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400 text-xs">Carregando dados...</td>
                  </tr>
                ) : trafficStats?.sales?.productSales && trafficStats.sales.productSales.length > 0 ? (
                  trafficStats.sales.productSales.slice(0, 6).map((ps: any) => (
                    <tr key={ps.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-gray-900 text-xs">{ps.title}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{ps.collaboratorName}</td>
                      <td className="px-5 py-3 text-center font-bold font-mono text-gray-700 text-xs">{ps.quantitySold}</td>
                      <td className="px-5 py-3 text-right font-mono text-gray-900 text-xs">
                        {ps.totalUSD > 0 ? `$${ps.totalUSD.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-gray-900 text-xs">
                        {ps.totalAOA > 0 ? `${ps.totalAOA.toLocaleString('pt-AO')} Kz` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400 text-xs">Nenhuma venda de produto registrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 font-display">Ações Rápidas</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/products?action=create"
            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Novo Produto
          </Link>
          <Link
            to="/categories?action=create"
            className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-200 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow"
          >
            <Bookmark className="mr-2 h-4 w-4 text-gray-400" />
            Adicionar Categoria
          </Link>
          <Link
            to="/coupons?action=create"
            className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-200 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow"
          >
            <Ticket className="mr-2 h-4 w-4 text-gray-400" />
            Criar Cupom
          </Link>
        </div>
      </div>
    </div>
  );
}
