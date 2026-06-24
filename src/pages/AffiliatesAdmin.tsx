// ============================================
// ADMIN — Affiliates Dashboard
// ============================================
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Link2, Users, TrendingUp, DollarSign, Landmark, CheckCircle,
  Clock, XCircle, Download, RefreshCw, Search, AlertTriangle,
  Copy, Wallet, ArrowDownToLine,
  BarChart3
} from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';
const H = { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY };

// ── helpers ────────────────────────────────────────────────
const fmt = (n: number, d = 0) => (n || 0).toLocaleString('pt-AO', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtUSD = (n: number) => `$${(n || 0).toFixed(2)}`;
const fmtAOA = (n: number) => `${fmt(n)} Kz`;
const relTime = (d: string) => {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(d).toLocaleDateString('pt-BR');
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };
  const label: Record<string, string> = {
    pending: 'Pendente', paid: 'Pago', cancelled: 'Cancelado',
    processing: 'Processando', completed: 'Concluído', rejected: 'Rejeitado',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {label[status] || status}
    </span>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white/40 rounded-xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest opacity-70">{label}</p>
          <p className="text-2xl font-extrabold font-mono mt-0.5">{value}</p>
          {sub && <p className="text-[11px] opacity-60 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

type Tab = 'overview' | 'links' | 'conversions' | 'wallets' | 'withdrawals';

export default function AffiliatesAdmin() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [overview, setOverview] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [convFilter, setConvFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedConvs, setSelectedConvs] = useState<Set<string>>(new Set());
  const [payingBatch, setPayingBatch] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ovRes, lkRes, cvRes, wlRes, wdRes] = await Promise.all([
        fetch(`${API}/api/admin/affiliates/overview`, { headers: H }).then(r => r.json()),
        fetch(`${API}/api/admin/affiliates/links?limit=200`, { headers: H }).then(r => r.json()),
        fetch(`${API}/api/admin/affiliates/conversions?limit=200`, { headers: H }).then(r => r.json()),
        fetch(`${API}/api/admin/affiliates/wallets`, { headers: H }).then(r => r.json()),
        fetch(`${API}/api/admin/affiliates/withdrawals`, { headers: H }).then(r => r.json()),
      ]);
      if (ovRes.success) setOverview(ovRes.overview);
      if (lkRes.success) setLinks(lkRes.links || []);
      if (cvRes.success) setConversions(cvRes.conversions || []);
      if (wlRes.success) setWallets(wlRes.wallets || []);
      if (wdRes.success) setWithdrawals(wdRes.withdrawals || []);
    } catch (err) {
      console.error('[AffiliatesAdmin] load error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  // ── Pay single conversion ─────────────────────────────────
  const paySingle = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`${API}/api/admin/affiliates/conversions/${id}/pay`, { method: 'PUT', headers: H });
      const data = await res.json();
      if (data.success) {
        notify('Comissão marcada como paga e creditada na wallet ✓');
        setConversions(prev => prev.map(c => c.id === id ? { ...c, status: 'paid', paid_at: new Date().toISOString() } : c));
      } else {
        notify(data.error || 'Erro ao pagar comissão', false);
      }
    } catch { notify('Erro de rede', false); }
    setProcessingId(null);
  };

  // ── Pay batch ─────────────────────────────────────────────
  const payBatch = async () => {
    if (selectedConvs.size === 0) return;
    setPayingBatch(true);
    try {
      const res = await fetch(`${API}/api/admin/affiliates/conversions/pay-batch`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ ids: Array.from(selectedConvs) }),
      });
      const data = await res.json();
      if (data.success) {
        notify(`${data.paid} comissões pagas com sucesso ✓`);
        setSelectedConvs(new Set());
        await load(true);
      } else {
        notify(data.error || 'Erro ao pagar lote', false);
      }
    } catch { notify('Erro de rede', false); }
    setPayingBatch(false);
  };

  // ── Process withdrawal ────────────────────────────────────
  const processWithdrawal = async (id: string, status: 'completed' | 'rejected', notes?: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`${API}/api/admin/affiliates/withdrawals/${id}`, {
        method: 'PUT', headers: H,
        body: JSON.stringify({ status, admin_notes: notes }),
      });
      const data = await res.json();
      if (data.success) {
        notify(data.message + ' ✓');
        setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status } : w));
      } else {
        notify(data.error || 'Erro', false);
      }
    } catch { notify('Erro de rede', false); }
    setProcessingId(null);
  };

  // ── Export CSV ────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Afiliado', 'Produto', 'Comissão %', 'Venda USD', 'Venda AOA', 'Comissão USD', 'Comissão AOA', 'Moeda', 'Status', 'Data'],
      ...conversions.map(c => [
        c.members?.email || '',
        c.products?.title || '',
        c.commission_rate,
        c.sale_amount_usd,
        c.sale_amount_aoa,
        c.commission_usd,
        c.commission_aoa,
        c.currency?.toUpperCase(),
        c.status,
        new Date(c.created_at).toLocaleDateString('pt-BR'),
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `comissoes-afiliados-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const filteredLinks = links.filter(l =>
    !search || l.affiliateEmail?.includes(search) || l.productTitle?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredConvs = conversions.filter(c =>
    (convFilter === 'all' || c.status === convFilter) &&
    (!search || c.members?.email?.includes(search) || c.products?.title?.toLowerCase().includes(search.toLowerCase()))
  );
  const pendingConvs = conversions.filter(c => c.status === 'pending');

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Visão Geral', icon: <BarChart3 size={15} /> },
    { id: 'links', label: 'Links', icon: <Link2 size={15} />, badge: links.length },
    { id: 'conversions', label: 'Comissões', icon: <TrendingUp size={15} />, badge: pendingConvs.length || undefined },
    { id: 'wallets', label: 'Wallets', icon: <Wallet size={15} />, badge: wallets.length },
    { id: 'withdrawals', label: 'Saques', icon: <ArrowDownToLine size={15} />, badge: withdrawals.filter(w => w.status === 'pending').length || undefined },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border transition-all ${
          toast.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md shadow-violet-200">
              <Link2 size={17} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Sistema de Afiliados</h1>
              <p className="text-xs text-gray-500">Gestão completa de links, comissões e pagamentos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Download size={13} /> Exportar CSV
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.icon} {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab === t.id ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-700'
                }`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ─────────────────────────────────────────────── */}
            {tab === 'overview' && overview && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    icon={<Link2 size={18} className="text-violet-700" />}
                    label="Links Ativos"
                    value={fmt(overview.totalLinks)}
                    sub="Links de rastreio criados"
                    color="bg-violet-50 border-violet-100 text-violet-900"
                  />
                  <KpiCard
                    icon={<TrendingUp size={18} className="text-blue-700" />}
                    label="Conversões"
                    value={fmt(overview.totalConversions)}
                    sub="Vendas rastreadas"
                    color="bg-blue-50 border-blue-100 text-blue-900"
                  />
                  <KpiCard
                    icon={<Users size={18} className="text-emerald-700" />}
                    label="Afiliados Ativos"
                    value={fmt(overview.totalAffiliates)}
                    sub="Com wallet criada"
                    color="bg-emerald-50 border-emerald-100 text-emerald-900"
                  />
                  <KpiCard
                    icon={<Clock size={18} className="text-amber-700" />}
                    label="Saques Pendentes"
                    value={fmt(overview.pendingWithdrawals)}
                    sub="Aguardando processamento"
                    color="bg-amber-50 border-amber-100 text-amber-900"
                  />
                </div>

                {/* Comissões financeiras */}
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* USD */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                      <DollarSign size={16} className="text-blue-400" />
                      <h3 className="text-sm font-bold text-white">Comissões em USD</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">A Pagar</p>
                        <p className="text-lg font-bold text-amber-400 font-mono mt-0.5">{fmtUSD(overview.commissions?.pendingUSD || 0)}</p>
                      </div>
                      <div className="bg-slate-800 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Já Pago</p>
                        <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{fmtUSD(overview.commissions?.paidUSD || 0)}</p>
                      </div>
                    </div>
                  </div>
                  {/* AOA */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                      <Landmark size={16} className="text-amber-400" />
                      <h3 className="text-sm font-bold text-white">Comissões em AOA (Kz)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">A Pagar</p>
                        <p className="text-lg font-bold text-amber-400 font-mono mt-0.5">{fmtAOA(overview.commissions?.pendingAOA || 0)}</p>
                      </div>
                      <div className="bg-slate-800 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Já Pago</p>
                        <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{fmtAOA(overview.commissions?.paidAOA || 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── LINKS ──────────────────────────────────────────────────── */}
            {tab === 'links' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-bold text-gray-900 text-sm">Links de Afiliado ({filteredLinks.length})</h3>
                  <div className="flex items-center gap-2">
                    <Search size={14} className="text-gray-400" />
                    <input
                      value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar afiliado ou produto..."
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 w-56"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="px-5 py-3 text-left">Afiliado</th>
                        <th className="px-4 py-3 text-left">Produto</th>
                        <th className="px-4 py-3 text-left">Colaborador</th>
                        <th className="px-4 py-3 text-center">Comissão</th>
                        <th className="px-4 py-3 text-center">Cliques</th>
                        <th className="px-4 py-3 text-center">Conversões</th>
                        <th className="px-4 py-3 text-center">Tracking Code</th>
                        <th className="px-4 py-3 text-right">Criado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredLinks.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-10 text-gray-400">
                          <Link2 size={28} className="mx-auto mb-2 text-gray-200" />
                          Nenhum link encontrado.
                        </td></tr>
                      ) : filteredLinks.map(link => (
                        <tr key={link.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-800">{link.affiliateEmail}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{link.productTitle}</td>
                          <td className="px-4 py-3 text-gray-500">{link.collaboratorName || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-violet-50 text-violet-700 font-bold px-2 py-0.5 rounded-full text-[11px] border border-violet-100">
                              {link.productCommissionPct || 0}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-gray-700">{link.clicks || 0}</td>
                          <td className="px-4 py-3 text-center font-mono text-gray-700">{link.totalConversions}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-mono">{link.tracking_code}</code>
                              <button
                                onClick={() => { navigator.clipboard.writeText(link.tracking_code); notify('Código copiado!'); }}
                                className="text-gray-400 hover:text-violet-600 transition-colors"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">{relTime(link.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── CONVERSIONS ────────────────────────────────────────────── */}
            {tab === 'conversions' && (
              <div className="space-y-4">
                {selectedConvs.size > 0 && (
                  <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-2xl px-5 py-3">
                    <span className="text-sm font-semibold text-violet-800">{selectedConvs.size} comissão(ões) selecionada(s)</span>
                    <button
                      onClick={payBatch}
                      disabled={payingBatch}
                      className="flex items-center gap-1.5 bg-violet-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-violet-700 transition-all disabled:opacity-50"
                    >
                      {payingBatch ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                      Pagar Selecionadas
                    </button>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-gray-900 text-sm flex-1">Comissões ({filteredConvs.length})</h3>
                    <div className="flex gap-1">
                      {(['all', 'pending', 'paid'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setConvFilter(f)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            convFilter === f ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Pagas'}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Search size={13} className="text-gray-400" />
                      <input
                        value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 w-44"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          <th className="px-4 py-3">
                            <input
                              type="checkbox"
                              onChange={e => {
                                if (e.target.checked) setSelectedConvs(new Set(filteredConvs.filter(c => c.status === 'pending').map((c: any) => c.id)));
                                else setSelectedConvs(new Set());
                              }}
                              checked={selectedConvs.size > 0}
                              className="rounded"
                            />
                          </th>
                          <th className="px-4 py-3 text-left">Afiliado</th>
                          <th className="px-4 py-3 text-left">Produto</th>
                          <th className="px-4 py-3 text-center">Comissão %</th>
                          <th className="px-4 py-3 text-right">Venda</th>
                          <th className="px-4 py-3 text-right">Comissão</th>
                          <th className="px-4 py-3 text-center">Moeda</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Data</th>
                          <th className="px-4 py-3 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredConvs.length === 0 ? (
                          <tr><td colSpan={10} className="text-center py-10 text-gray-400">
                            <TrendingUp size={28} className="mx-auto mb-2 text-gray-200" />
                            Nenhuma comissão encontrada.
                          </td></tr>
                        ) : filteredConvs.map((c: any) => (
                          <tr key={c.id} className={`hover:bg-gray-50/80 transition-colors ${selectedConvs.has(c.id) ? 'bg-violet-50/50' : ''}`}>
                            <td className="px-4 py-3">
                              {c.status === 'pending' && (
                                <input
                                  type="checkbox"
                                  checked={selectedConvs.has(c.id)}
                                  onChange={e => {
                                    const ns = new Set(selectedConvs);
                                    e.target.checked ? ns.add(c.id) : ns.delete(c.id);
                                    setSelectedConvs(ns);
                                  }}
                                  className="rounded"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800">{c.members?.email}</td>
                            <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{c.products?.title}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-violet-50 text-violet-700 font-bold text-[11px] px-1.5 py-0.5 rounded-full">{c.commission_rate}%</span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-700">
                              {c.currency === 'usd' ? fmtUSD(c.sale_amount_usd) : fmtAOA(c.sale_amount_aoa)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold">
                              {c.currency === 'usd'
                                ? <span className="text-blue-700">{fmtUSD(c.commission_usd)}</span>
                                : <span className="text-amber-700">{fmtAOA(c.commission_aoa)}</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.currency === 'usd' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                                {c.currency?.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center"><StatusBadge status={c.status} /></td>
                            <td className="px-4 py-3 text-right text-gray-400">{relTime(c.created_at)}</td>
                            <td className="px-4 py-3 text-center">
                              {c.status === 'pending' ? (
                                <button
                                  onClick={() => paySingle(c.id)}
                                  disabled={processingId === c.id}
                                  className="flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 mx-auto"
                                >
                                  {processingId === c.id ? <RefreshCw size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                                  Pagar
                                </button>
                              ) : (
                                <span className="text-gray-300 text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── WALLETS ────────────────────────────────────────────────── */}
            {tab === 'wallets' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm">Wallets de Afiliados ({wallets.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="px-5 py-3 text-left">Afiliado</th>
                        <th className="px-4 py-3 text-right">Saldo USD</th>
                        <th className="px-4 py-3 text-right">Saldo AOA</th>
                        <th className="px-4 py-3 text-right">Total Ganho USD</th>
                        <th className="px-4 py-3 text-right">Total Ganho AOA</th>
                        <th className="px-4 py-3 text-right">Sacado USD</th>
                        <th className="px-4 py-3 text-right">Sacado AOA</th>
                        <th className="px-4 py-3 text-center">Método</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {wallets.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-10 text-gray-400">
                          <Wallet size={28} className="mx-auto mb-2 text-gray-200" />
                          Nenhuma wallet criada ainda.
                        </td></tr>
                      ) : wallets.map((w: any) => (
                        <tr key={w.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-800">{w.members?.email}</td>
                          <td className="px-4 py-3 text-right font-mono text-blue-700 font-bold">{fmtUSD(w.balance_usd)}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-700 font-bold">{fmtAOA(w.balance_aoa)}</td>
                          <td className="px-4 py-3 text-right font-mono text-gray-600">{fmtUSD(w.total_earned_usd)}</td>
                          <td className="px-4 py-3 text-right font-mono text-gray-600">{fmtAOA(w.total_earned_aoa)}</td>
                          <td className="px-4 py-3 text-right font-mono text-gray-500">{fmtUSD(w.total_withdrawn_usd)}</td>
                          <td className="px-4 py-3 text-right font-mono text-gray-500">{fmtAOA(w.total_withdrawn_aoa)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                              {w.payout_method || 'N/D'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── WITHDRAWALS ────────────────────────────────────────────── */}
            {tab === 'withdrawals' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">Pedidos de Saque ({withdrawals.length})</h3>
                  <span className="text-xs text-gray-500">Taxas de envio aplicadas por método</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="px-5 py-3 text-left">Afiliado</th>
                        <th className="px-4 py-3 text-center">Moeda</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                        <th className="px-4 py-3 text-center">Método</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Data</th>
                        <th className="px-4 py-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {withdrawals.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                          <ArrowDownToLine size={28} className="mx-auto mb-2 text-gray-200" />
                          Nenhum pedido de saque.
                        </td></tr>
                      ) : withdrawals.map((w: any) => (
                        <tr key={w.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-800">{w.members?.email}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${w.currency === 'usd' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                              {w.currency?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                            {w.currency === 'usd' ? fmtUSD(w.amount_usd) : fmtAOA(w.amount_aoa)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize">
                              {w.payout_method}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center"><StatusBadge status={w.status} /></td>
                          <td className="px-4 py-3 text-right text-gray-400">{relTime(w.created_at)}</td>
                          <td className="px-4 py-3 text-center">
                            {w.status === 'pending' ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => processWithdrawal(w.id, 'completed')}
                                  disabled={processingId === w.id}
                                  className="flex items-center gap-0.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                                >
                                  {processingId === w.id ? <RefreshCw size={9} className="animate-spin" /> : <CheckCircle size={9} />}
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Motivo da rejeição:');
                                    if (reason !== null) processWithdrawal(w.id, 'rejected', reason);
                                  }}
                                  disabled={processingId === w.id}
                                  className="flex items-center gap-0.5 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-red-600 transition-all disabled:opacity-50"
                                >
                                  <XCircle size={9} /> Rejeitar
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-[10px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
