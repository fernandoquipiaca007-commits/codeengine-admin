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
      console.error('Error fetching referral overview:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/referral/users?limit=50`, { headers });
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching referral users:', err);
    }
  }, []);

  const fetchConversions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/referral/conversions?limit=100`, { headers });
      const data = await res.json();
      if (data.success) setConversions(data.conversions || []);
    } catch (err) {
      console.error('Error fetching referral conversions:', err);
    }
  }, []);

  const fetchFraud = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/referral/fraud-log`, { headers });
      const data = await res.json();
      if (data.success) setFraudLog(data.logs || []);
    } catch (err) {
      console.error('Error fetching fraud logs:', err);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
          🚀 Referral & Rewards
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage referrals, points, levels, and progressive discounts</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.icon} {t.label}
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
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Referral Links', value: overview.totalLinks, color: 'blue' },
              { label: 'Conversions', value: overview.totalConversions, color: 'green' },
              { label: 'Revenue Generated', value: `$${overview.totalRevenue.toFixed(2)}`, color: 'purple' },
              { label: 'Points Distributed', value: overview.totalPointsDistributed.toLocaleString(), color: 'amber' },
            ].map((stat) => (
              <div key={stat.label} className={`bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm`}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <p className={`text-2xl sm:text-3xl font-bold mt-1 text-${stat.color}-600`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Level Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Level Distribution</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(overview.levelDistribution).map(([level, count]) => (
                <div key={level} className={`px-4 py-2 rounded-lg ${LEVEL_COLORS[level] || 'bg-gray-100'}`}>
                  <span className="mr-1">{LEVEL_ICONS[level]}</span>
                  <span className="font-semibold capitalize">{level}</span>
                  <span className="ml-2 font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud Attempts */}
          {overview.fraudAttempts > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-medium text-red-700">
                🛡️ {overview.fraudAttempts} fraud attempt(s) blocked
              </p>
            </div>
          )}

          {/* Grant Points */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">💰 Grant Points Manually</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Member ID (UUID)"
                value={grantMemberId}
                onChange={(e) => setGrantMemberId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Points amount"
                value={grantAmount || ''}
                onChange={(e) => setGrantAmount(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={grantDesc}
                onChange={(e) => setGrantDesc(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button onClick={handleGrantPoints} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                Grant Points
              </button>
              {grantMsg && <span className="text-sm">{grantMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {!loading && tab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm max-w-xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">⚙️ Product Referral Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Product ID</label>
              <input
                type="text"
                placeholder="Product UUID"
                value={configProductId}
                onChange={(e) => setConfigProductId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Conversion Goal</label>
                <input
                  type="number"
                  value={configGoal}
                  onChange={(e) => setConfigGoal(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={configMinPrice}
                  onChange={(e) => setConfigMinPrice(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSaveConfig} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                Save Configuration
              </button>
              {configMsg && <span className="text-sm">{configMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* FRAUD TAB */}
      {!loading && tab === 'fraud' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
