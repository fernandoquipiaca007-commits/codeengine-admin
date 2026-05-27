// ============================================
// ADMIN — Referral Dashboard
// ============================================
import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

interface Overview {
  totalLinks: number;
  totalConversions: number;
  totalRevenue: number;
  totalPointsDistributed: number;
  levelDistribution: Record<string, number>;
  fraudAttempts: number;
}

export default function ReferralDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [fraudLog, setFraudLog] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'users' | 'conversions' | 'config' | 'fraud'>('overview');
  const [loading, setLoading] = useState(true);

  // Config form
  const [configProductId, setConfigProductId] = useState('');
  const [configGoal, setConfigGoal] = useState(20);
  const [configMinPrice, setConfigMinPrice] = useState(0);
  const [configMsg, setConfigMsg] = useState('');

  // Grant points form
  const [grantMemberId, setGrantMemberId] = useState('');
  const [grantAmount, setGrantAmount] = useState(0);
  const [grantDesc, setGrantDesc] = useState('');
  const [grantMsg, setGrantMsg] = useState('');

  const headers = { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY };

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/referral/overview`, { headers });
      const data = await res.json();
      if (data.success) setOverview(data.overview);
    } catch (err) {
      console.error('Fetch overview error:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/referral/users?limit=50`, { headers });
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  }, []);

  const fetchConversions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/referral/conversions?limit=100`, { headers });
      const data = await res.json();
      if (data.success) setConversions(data.conversions || []);
    } catch (err) {
      console.error('Fetch conversions error:', err);
    }
  }, []);

  const fetchFraud = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/referral/fraud-log`, { headers });
      const data = await res.json();
      if (data.success) setFraudLog(data.logs || []);
    } catch (err) {
      console.error('Fetch fraud error:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOverview(), fetchUsers(), fetchConversions(), fetchFraud()]).finally(() => setLoading(false));
  }, []);

  const handleSaveConfig = async () => {
    if (!configProductId) return setConfigMsg('Product ID required');
    const res = await fetch(`${API}/api/admin/referral/config`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId: configProductId, conversionGoal: configGoal, minPrice: configMinPrice }),
    });
    const data = await res.json();
    setConfigMsg(data.success ? '✅ Config saved' : `❌ ${data.error}`);
  };

  const handleGrantPoints = async () => {
    if (!grantMemberId || !grantAmount) return setGrantMsg('Member ID and amount required');
    const res = await fetch(`${API}/api/admin/referral/grant-points`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ memberId: grantMemberId, amount: grantAmount, description: grantDesc || 'Admin grant' }),
    });
    const data = await res.json();
    setGrantMsg(data.success ? `✅ Awarded ${data.result?.awarded || grantAmount} pts` : `❌ ${data.error}`);
    if (data.success) { fetchUsers(); fetchOverview(); }
  };

  const LEVEL_COLORS: Record<string, string> = {
    starter: 'bg-gray-100 text-gray-700',
    bronze: 'bg-amber-100 text-amber-800',
    silver: 'bg-slate-200 text-slate-700',
    gold: 'bg-yellow-100 text-yellow-800',
    platinum: 'bg-cyan-100 text-cyan-800',
  };

  const LEVEL_ICONS: Record<string, string> = {
    starter: '⭐', bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎',
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users & Levels', icon: '👥' },
    { id: 'conversions', label: 'Conversions', icon: '🔄' },
    { id: 'config', label: 'Configuration', icon: '⚙️' },
    { id: 'fraud', label: 'Fraud Log', icon: '🛡️' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          Referral & Rewards
        </h1>
        <p className="mt-2 text-base text-gray-500">Gerencie sistema de indicação, níveis e recompensas progressivas</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-100 pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95 ${
              tab === t.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t.icon} <span className="ml-1.5">{t.label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* OVERVIEW TAB */}
      {!loading && tab === 'overview' && overview && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Referral Links', value: overview.totalLinks, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Conversões', value: overview.totalConversions, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Receita Gerada', value: `$${overview.totalRevenue.toFixed(2)}`, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Pontos Distribuídos', value: overview.totalPointsDistributed.toLocaleString(), color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm transition-all hover:shadow-md">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className={`text-2xl sm:text-3xl font-black ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Level Distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-primary-600 rounded-full" />
              Distribuição de Nível
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(overview.levelDistribution).map(([level, count]) => (
                <div key={level} className={`px-4 py-3 rounded-xl border flex items-center gap-3 transition-all hover:scale-105 ${LEVEL_COLORS[level] || 'bg-gray-50 border-gray-100'}`}>
                  <span className="text-xl">{LEVEL_ICONS[level]}</span>
                  <div>
                    <div className="text-[10px] font-bold uppercase opacity-60 leading-none mb-1">{level}</div>
                    <div className="text-lg font-black">{count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud Attempts */}
          {overview.fraudAttempts > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                🛡️
              </div>
              <div>
                <p className="text-red-900 font-bold">Tentativas de fraude detectadas</p>
                <p className="text-red-600 text-sm font-medium">{overview.fraudAttempts} ações suspeitas foram bloqueadas automaticamente.</p>
              </div>
            </div>
          )}

          {/* Grant Points */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
              💰 Conceder Pontos Manualmente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">ID do Membro (UUID)</label>
                <input
                  type="text"
                  placeholder="00000000-0000-..."
                  value={grantMemberId}
                  onChange={(e) => setGrantMemberId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Quantidade</label>
                <input
                  type="number"
                  placeholder="Ex: 500"
                  value={grantAmount || ''}
                  onChange={(e) => setGrantAmount(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Bónus de campanha"
                  value={grantDesc}
                  onChange={(e) => setGrantDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
              <button onClick={handleGrantPoints} className="w-full sm:w-auto px-8 py-3 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-all active:scale-95 shadow-lg shadow-primary-100">
                Conceder Pontos
              </button>
              {grantMsg && <span className={`text-sm font-bold ${grantMsg.includes('✅') ? 'text-emerald-600' : 'text-red-600'}`}>{grantMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {!loading && tab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Level</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Points</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Referrals</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Purchases</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs truncate max-w-[200px]">
                      {u.members?.email || u.member_id?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${LEVEL_COLORS[u.level] || ''}`}>
                        {LEVEL_ICONS[u.level]} {u.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{u.total_points?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{u.total_referrals}</td>
                    <td className="px-4 py-3 text-right">{u.total_purchases}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONVERSIONS TAB */}
      {!loading && tab === 'conversions' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Product</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Points</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conversions.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{c.referral_links?.code || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 truncate max-w-[200px]">{c.products?.title || c.product_id?.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">${Number(c.amount_paid).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-semibold">+{c.points_awarded}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        c.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        c.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {conversions.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No conversions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIG TAB */}
      {!loading && tab === 'config' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm max-w-2xl animate-in fade-in">
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8 flex items-center gap-2">
            <div className="w-2 h-6 bg-primary-600 rounded-full" />
            Configuração de Indicação
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Produto Principal (UUID)</label>
              <input
                type="text"
                placeholder="Insira o ID do produto digital"
                value={configProductId}
                onChange={(e) => setConfigProductId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Meta de Conversão</label>
                <input
                  type="number"
                  value={configGoal}
                  onChange={(e) => setConfigGoal(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Preço Mínimo ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={configMinPrice}
                  onChange={(e) => setConfigMinPrice(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
              <button onClick={handleSaveConfig} className="w-full sm:w-auto px-10 py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-100">
                Salvar Configuração
              </button>
              {configMsg && <span className={`text-sm font-bold ${configMsg.includes('✅') ? 'text-emerald-600' : 'text-red-600'}`}>{configMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* FRAUD TAB */}
      {!loading && tab === 'fraud' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fraudLog.map((f, i) => (
                  <tr key={i} className="hover:bg-red-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(f.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-xs">{f.members?.email || f.member_id?.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">{f.reason}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono truncate max-w-[300px]">
                      {JSON.stringify(f.details)}
                    </td>
                  </tr>
                ))}
                {fraudLog.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No fraud attempts logged</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
