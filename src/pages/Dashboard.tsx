import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { checkConnection } from '../lib/supabase-admin';
import { useAdminAnalytics } from '../hooks/useAdminAnalytics';

import {
  Eye, TrendingUp, Users, Activity, DollarSign, Landmark,
  Plus, Bookmark, Ticket, CheckCircle, Wifi, WifiOff,
  RefreshCw, ShoppingCart, Star, Download, Bell, ArrowUpRight,
  ArrowDownRight, Zap, Globe, BarChart3, Package, Clock, ChevronRight,
  ShieldCheck, AlertTriangle
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number, decimals = 0) =>
  n.toLocaleString('pt-AO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtUSD = (n: number) => `$${n.toFixed(2)}`;
const fmtAOA = (n: number) => `${fmt(n, 0)} Kz`;

function relTime(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;         // tailwind bg class for icon bg
  iconColor: string;     // tailwind text class for icon
  trend?: number | null; // positive = green, negative = red
  loading?: boolean;
  pulse?: boolean;
}
function KpiCard({ label, value, sub, icon, color, iconColor, trend, loading, pulse }: KpiCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${color}`}>
            <div className={iconColor}>{icon}</div>
          </div>
          {pulse && (
            <span className="relative flex h-2.5 w-2.5 mt-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
          )}
          {trend !== undefined && trend !== null && !pulse && (
            <div className={`flex items-center gap-0.5 text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 mt-1 font-mono leading-none">
          {loading ? <span className="text-gray-300 animate-pulse">—</span> : value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="text-gray-500">{icon}</div>
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h2>
      {badge && (
        <span className="ml-auto text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data, loading: analyticsLoading, error: analyticsError, warning: analyticsWarning, lastUpdated, refresh } = useAdminAnalytics();
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [trafficStats, setTrafficStats] = useState<any | null>(null);
  const [loadingTraffic, setLoadingTraffic] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const prevActiveRef = useRef<number>(0);
  const [activeUsersDelta, setActiveUsersDelta] = useState<number>(0);

  const loadTraffic = () => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';
    setLoadingTraffic(true);
    fetch(`${BACKEND_URL}/api/admin/collaborators/traffic-stats`, {
      headers: { 'x-admin-key': ADMIN_KEY }
    })
      .then(res => res.json())
      .then(d => {
        if (d.success) {
          const current = d.traffic?.active1Min || 0;
          setActiveUsersDelta(current - prevActiveRef.current);
          prevActiveRef.current = current;
          setTrafficStats(d);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTraffic(false));
  };

  useEffect(() => {
    checkConnection().then(ok => setConnectionStatus(ok ? 'connected' : 'error'));
    loadTraffic();
    const id = setInterval(loadTraffic, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    loadTraffic();
    setRefreshing(false);
  };

  const loading = analyticsLoading || connectionStatus === 'checking';
  const activeNow = trafficStats?.traffic?.active1Min ?? 0;
  const totalViews = trafficStats?.traffic?.totalPageViews ?? 0;
  const topPages: { path: string; count: number }[] = trafficStats?.traffic?.topPages ?? [];
  const productSales: any[] = trafficStats?.sales?.productSales ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30">
      <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
                <BarChart3 size={16} className="text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Painel de Controle
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 pl-11">
              Visão geral em tempo real · CodeEngine Platform
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Live users badge */}
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm border transition-colors ${
              activeNow > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeNow > 0 ? 'bg-emerald-400' : 'bg-gray-300'} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${activeNow > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              </span>
              {loadingTraffic ? '...' : `${activeNow} ativos agora`}
              {activeUsersDelta > 0 && <span className="text-emerald-500 font-bold">+{activeUsersDelta}</span>}
            </div>

            {/* Connection status */}
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${
              connectionStatus === 'connected'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : connectionStatus === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              {connectionStatus === 'connected'
                ? <><Wifi size={12} /> Supabase OK</>
                : connectionStatus === 'error'
                ? <><WifiOff size={12} /> Sem conexão</>
                : <><Activity size={12} className="animate-pulse" /> Verificando...</>}
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Atualizar
            </button>

            {lastUpdated && (
              <span className="text-[11px] text-gray-400">
                <Clock size={10} className="inline mr-1" />
                {relTime(lastUpdated)}
              </span>
            )}
          </div>
        </div>

        {/* ── Alerts ─────────────────────────────────────────────────────── */}
        {analyticsError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle size={16} className="shrink-0" />
            {analyticsError}
          </div>
        )}
        {analyticsWarning && !analyticsError && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="shrink-0" />
            {analyticsWarning}
          </div>
        )}

        {/* ── KPI Row 1 — Core metrics ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            label="Total de Produtos"
            value={loading ? '…' : fmt(data.totalProducts)}
            sub="Produtos ativos na plataforma"
            icon={<Package size={18} />}
            color="bg-indigo-50"
            iconColor="text-indigo-600"
            loading={loading}
          />
          <KpiCard
            label="Membros Registados"
            value={loading ? '…' : fmt(data.totalMembers)}
            sub="Utilizadores & clientes"
            icon={<Users size={18} />}
            color="bg-violet-50"
            iconColor="text-violet-600"
            loading={loading}
          />
          <KpiCard
            label="Vendas (USD)"
            value={loading ? '…' : fmt(data.totalSales)}
            sub={`Hoje: ${loading ? '…' : fmt(data.salesToday)} pedidos`}
            icon={<ShoppingCart size={18} />}
            color="bg-blue-50"
            iconColor="text-blue-600"
            loading={loading}
          />
          <KpiCard
            label="Vendas (AOA)"
            value={loading ? '…' : fmt(data.aoaSales)}
            sub={`Hoje: ${loading ? '…' : fmt(data.aoaSalesToday)} pedidos`}
            icon={<ShoppingCart size={18} />}
            color="bg-amber-50"
            iconColor="text-amber-600"
            loading={loading}
          />
        </div>

        {/* ── KPI Row 2 — Engagement ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            label="Usuários Ativos Agora"
            value={loadingTraffic ? '…' : fmt(activeNow)}
            sub="Ativos nos últimos 60 s"
            icon={<Zap size={18} />}
            color="bg-emerald-50"
            iconColor="text-emerald-600"
            pulse={activeNow > 0}
            loading={loadingTraffic}
          />
          <KpiCard
            label="Visualizações Totais"
            value={loadingTraffic ? '…' : fmt(totalViews)}
            sub="Page views acumuladas"
            icon={<Eye size={18} />}
            color="bg-sky-50"
            iconColor="text-sky-600"
            loading={loadingTraffic}
          />
          <KpiCard
            label="Downloads"
            value={loading ? '…' : fmt(data.totalDownloads)}
            sub="Conteúdos descarregados"
            icon={<Download size={18} />}
            color="bg-teal-50"
            iconColor="text-teal-600"
            loading={loading}
          />
          <KpiCard
            label="Favoritos"
            value={loading ? '…' : fmt(data.totalFavorites)}
            sub="Produtos marcados"
            icon={<Star size={18} />}
            color="bg-rose-50"
            iconColor="text-rose-500"
            loading={loading}
          />
        </div>

        {/* ── Financial Ecosystems ────────────────────────────────────────── */}
        <div>
          <SectionHeader icon={<DollarSign size={15} />} title="Ecossistemas Financeiros" badge="Tempo Real" />
          <div className="grid gap-4 lg:grid-cols-2">
            {/* USD */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-6 shadow-xl shadow-slate-900/20">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <DollarSign size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Stripe · USD</p>
                    <p className="text-sm font-bold text-white">Faturamento em Dólar</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2.5 py-1">USD $</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Faturamento Total', value: fmtUSD(data.totalRevenue || 0), highlight: false },
                  { label: 'Receita Hoje', value: fmtUSD(data.revenueToday || 0), highlight: true },
                  { label: 'Pedidos Totais', value: fmt(data.totalSales || 0), highlight: false },
                  { label: 'Ticket Médio', value: fmtUSD(data.avgOrderValue || 0), highlight: false },
                ].map(item => (
                  <div key={item.label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 hover:bg-slate-800 transition-colors">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.label}</p>
                    <p className={`text-lg font-bold font-mono mt-1 ${item.highlight ? 'text-emerald-400' : 'text-white'}`}>
                      {loading ? <span className="text-slate-600">—</span> : item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* AOA */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-amber-950/30 to-slate-900 border border-slate-700/50 p-6 shadow-xl shadow-slate-900/20">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Landmark size={16} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">FaciPay · AOA</p>
                    <p className="text-sm font-bold text-white">Faturamento em Kwanza</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2.5 py-1">Kz</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Faturamento Total', value: fmtAOA(data.aoaRevenue || 0), highlight: false },
                  { label: 'Receita Hoje', value: fmtAOA(data.aoaRevenueToday || 0), highlight: true },
                  { label: 'Pedidos Totais', value: fmt(data.aoaSales || 0), highlight: false },
                  { label: 'Ticket Médio', value: fmtAOA(data.avgOrderValueAoa || 0), highlight: false },
                ].map(item => (
                  <div key={item.label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 hover:bg-slate-800 transition-colors">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.label}</p>
                    <p className={`text-lg font-bold font-mono mt-1 ${item.highlight ? 'text-emerald-400' : 'text-white'}`}>
                      {loading ? <span className="text-slate-600">—</span> : item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Traffic + Product Sales ─────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Most visited pages */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={15} className="text-sky-500" />
                <h3 className="text-sm font-bold text-gray-800">Páginas Mais Visitadas</h3>
              </div>
              <span className="text-[10px] bg-sky-50 text-sky-600 border border-sky-100 font-bold px-2 py-0.5 rounded-full">
                {topPages.length} páginas
              </span>
            </div>
            <div className="p-4 space-y-2">
              {loadingTraffic ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                ))
              ) : topPages.length > 0 ? (
                topPages.slice(0, 8).map((page, idx) => {
                  const max = topPages[0]?.count || 1;
                  const pct = Math.round((page.count / max) * 100);
                  return (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono text-gray-600 truncate max-w-[160px] group-hover:text-gray-900 transition-colors" title={page.path}>
                          {page.path}
                        </span>
                        <span className="font-bold text-gray-700 ml-2 shrink-0">{fmt(page.count)}</span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Eye size={28} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Sem dados de tráfego ainda.</p>
                </div>
              )}
            </div>
          </div>

          {/* Product Sales */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden lg:col-span-2">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-gray-800">Desempenho de Vendas por Produto</h3>
              </div>
              <Link to="/collaborators" className="flex items-center gap-1 text-[11px] text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
                Ver tudo <ChevronRight size={12} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-5 py-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Produto</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Autor</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-center">Qtd</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-right">USD</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider text-right">AOA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingTraffic ? (
                    [...Array(4)].map((_, i) => (
                      <tr key={i}>
                        {[...Array(5)].map((_, j) => (
                          <td key={j} className="px-5 py-3">
                            <div className="h-3 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : productSales.length > 0 ? (
                    productSales.slice(0, 7).map((ps: any) => (
                      <tr key={ps.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-5 py-3 font-semibold text-gray-900">{ps.title}</td>
                        <td className="px-4 py-3 text-gray-500">{ps.collaboratorName || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
                            {ps.quantitySold}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-800 font-bold">
                          {ps.totalUSD > 0 ? <span className="text-blue-700">{fmtUSD(ps.totalUSD)}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-800 font-bold">
                          {ps.totalAOA > 0 ? <span className="text-amber-700">{fmtAOA(ps.totalAOA)}</span> : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-10">
                        <TrendingUp size={28} className="text-gray-200 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Nenhuma venda registrada ainda.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Recent Orders feed ─────────────────────────────────────────── */}
        {data.recentOrders && data.recentOrders.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-violet-500" />
                <h3 className="text-sm font-bold text-gray-800">Pedidos Recentes</h3>
              </div>
              <span className="text-[10px] bg-violet-50 text-violet-600 border border-violet-100 font-bold px-2 py-0.5 rounded-full">
                últimas transações
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {data.recentOrders.slice(0, 6).map((order: any, i: number) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/80 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] ${
                    order.currency === 'aoa'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.currency === 'aoa' ? 'Kz' : '$'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{order.productTitle || 'Produto'}</p>
                    <p className="text-[11px] text-gray-400">{order.memberEmail || 'Cliente'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-gray-900">
                      {order.currency === 'aoa'
                        ? fmtAOA(order.amount_paid_aoa || 0)
                        : fmtUSD(order.amount_paid || 0)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {order.created_at ? relTime(new Date(order.created_at)) : '—'}
                    </p>
                  </div>
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Engagement + Notifications ──────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={15} className="text-orange-500" />
              <h3 className="text-sm font-bold text-gray-800">Notificações</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Total enviadas</span>
                <span className="text-sm font-bold text-gray-900 font-mono">{loading ? '—' : fmt(data.totalNotifications)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Não lidas</span>
                <span className="text-sm font-bold text-orange-600 font-mono">{loading ? '—' : fmt(data.unreadNotifications)}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <Link to="/push" className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:text-indigo-700">
                Gerenciar notificações <ChevronRight size={12} />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={15} className="text-teal-500" />
              <h3 className="text-sm font-bold text-gray-800">Taxa de Conversão</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-extrabold text-gray-900 font-mono">
                  {loading ? '—' : `${(data.conversionRate || 0).toFixed(1)}%`}
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(data.conversionRate || 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">Membros que compraram vs. total</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={15} className="text-indigo-500" />
              <h3 className="text-sm font-bold text-gray-800">Produto Destaque</h3>
            </div>
            <div className="space-y-2">
              {data.topProductTitle ? (
                <>
                  <div className="flex items-center gap-2">
                    <Star size={14} className="text-amber-400 fill-amber-400 shrink-0" />
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2">{data.topProductTitle}</p>
                  </div>
                  <p className="text-[11px] text-gray-400">Produto mais vendido na plataforma</p>
                </>
              ) : (
                <p className="text-xs text-gray-400">Nenhum dado disponível.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick Actions ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader icon={<Zap size={15} />} title="Ações Rápidas" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                to: '/products?action=create',
                label: 'Novo Produto',
                desc: 'Adicionar produto à loja',
                icon: <Plus size={18} />,
                primary: true,
                color: 'from-indigo-500 to-purple-600',
              },
              {
                to: '/collaborators',
                label: 'Colaboradores',
                desc: 'Gerir comissões e relatórios',
                icon: <Users size={18} />,
                primary: false,
                color: '',
              },
              {
                to: '/categories?action=create',
                label: 'Categoria',
                desc: 'Adicionar nova categoria',
                icon: <Bookmark size={18} />,
                primary: false,
                color: '',
              },
              {
                to: '/coupons?action=create',
                label: 'Criar Cupom',
                desc: 'Novo cupom de desconto',
                icon: <Ticket size={18} />,
                primary: false,
                color: '',
              },
            ].map(action => (
              <Link
                key={action.to}
                to={action.to}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow hover:-translate-y-0.5 ${
                  action.primary
                    ? `bg-gradient-to-r ${action.color} text-white`
                    : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                <span className={`${action.primary ? 'text-white/80' : 'text-gray-400'}`}>{action.icon}</span>
                <div>
                  <p className="leading-none">{action.label}</p>
                  <p className={`text-[10px] mt-0.5 font-normal ${action.primary ? 'text-white/70' : 'text-gray-400'}`}>
                    {action.desc}
                  </p>
                </div>
                <ArrowUpRight size={14} className={`ml-auto ${action.primary ? 'text-white/60' : 'text-gray-300'}`} />
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
