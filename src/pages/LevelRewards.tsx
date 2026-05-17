// ============================================
// ADMIN — Level Rewards Management
// ============================================
import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

interface LevelReward {
  id: string;
  level: string;
  description: string;
  reward_type: string;
  reward_value: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

const LEVELS = ['starter', 'bronze', 'silver', 'gold', 'platinum'] as const;
const REWARD_TYPES = ['coupon', 'bonus_points', 'early_access', 'exclusive_offer'] as const;

const LEVEL_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700 border-gray-200',
  bronze: 'bg-amber-50 text-amber-800 border-amber-200',
  silver: 'bg-slate-100 text-slate-700 border-slate-200',
  gold: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  platinum: 'bg-purple-50 text-purple-800 border-purple-200',
};

const LEVEL_ICONS: Record<string, string> = {
  starter: '⭐', bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎',
};

const TYPE_LABELS: Record<string, string> = {
  coupon: '🎟️ Cupom de Desconto',
  bonus_points: '✨ Pontos Bónus',
  early_access: '⚡ Acesso Antecipado',
  exclusive_offer: '👑 Oferta Exclusiva',
};

export default function LevelRewards() {
  const [rewards, setRewards] = useState<LevelReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  // Form state
  const [formLevel, setFormLevel] = useState<string>('starter');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<string>('coupon');
  const [formActive, setFormActive] = useState(true);
  // Coupon-specific
  const [formDiscountValue, setFormDiscountValue] = useState(5);
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  // Bonus points specific
  const [formPointsAmount, setFormPointsAmount] = useState(50);

  const headers = { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY };

  const fetchRewards = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/rewards`, { headers });
      const data = await res.json();
      if (data.success) setRewards(data.rewards || []);
    } catch (err) {
      console.error('Fetch rewards error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const resetForm = () => {
    setFormLevel('starter');
    setFormDesc('');
    setFormType('coupon');
    setFormActive(true);
    setFormDiscountValue(5);
    setFormDiscountType('percentage');
    setFormPointsAmount(50);
    setEditingId(null);
    setShowForm(false);
  };

  const buildRewardValue = () => {
    switch (formType) {
      case 'coupon':
        return { discount: formDiscountValue, type: formDiscountType };
      case 'bonus_points':
        return { amount: formPointsAmount };
      case 'early_access':
        return { days: 7 };
      case 'exclusive_offer':
        return { type: 'exclusive' };
      default:
        return {};
    }
  };

  const handleSubmit = async () => {
    if (!formDesc.trim()) {
      setMsg('❌ Descrição obrigatória');
      return;
    }

    const payload = {
      level: formLevel,
      description: formDesc,
      reward_type: formType,
      reward_value: buildRewardValue(),
      is_active: formActive,
    };

    try {
      const url = editingId ? `${API}/api/admin/rewards/${editingId}` : `${API}/api/admin/rewards`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();

      if (data.success) {
        setMsg(editingId ? '✅ Recompensa atualizada' : '✅ Recompensa criada');
        resetForm();
        fetchRewards();
      } else {
        setMsg(`❌ ${data.error}`);
      }
    } catch {
      setMsg('❌ Erro de rede');
    }
  };

  const handleEdit = (reward: LevelReward) => {
    setEditingId(reward.id);
    setFormLevel(reward.level);
    setFormDesc(reward.description);
    setFormType(reward.reward_type);
    setFormActive(reward.is_active);

    if (reward.reward_type === 'coupon' && reward.reward_value) {
      setFormDiscountValue(reward.reward_value.discount || 5);
      setFormDiscountType(reward.reward_value.type || 'percentage');
    }
    if (reward.reward_type === 'bonus_points' && reward.reward_value) {
      setFormPointsAmount(reward.reward_value.amount || 50);
    }

    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar esta recompensa?')) return;

    try {
      const res = await fetch(`${API}/api/admin/rewards/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success) {
        setMsg(data.claimedCount > 0
          ? `✅ Apagada (${data.claimedCount} resgate(s) existente(s))`
          : '✅ Recompensa apagada');
        fetchRewards();
      } else {
        setMsg(`❌ ${data.error}`);
      }
    } catch {
      setMsg('❌ Erro de rede');
    }
  };

  const handleToggleActive = async (reward: LevelReward) => {
    try {
      const res = await fetch(`${API}/api/admin/rewards/${reward.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !reward.is_active }),
      });
      const data = await res.json();
      if (data.success) fetchRewards();
    } catch {}
  };

  const groupedRewards = LEVELS.reduce((acc, level) => {
    acc[level] = rewards.filter((r) => r.level === level);
    return acc;
  }, {} as Record<string, LevelReward[]>);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            🎁 Recompensas por Nível
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie as recompensas que os utilizadores desbloqueiam ao subir de nível
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          + Nova Recompensa
        </button>
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg}
          <button onClick={() => setMsg('')} className="ml-2 text-xs underline">fechar</button>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {editingId ? '✏️ Editar Recompensa' : '➕ Nova Recompensa'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Level */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nível</label>
              <select
                value={formLevel}
                onChange={(e) => setFormLevel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{LEVEL_ICONS[l]} {l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Recompensa</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {REWARD_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
              <input
                type="text"
                placeholder="Ex: Cupom de 10% de desconto em qualquer produto"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Coupon-specific fields */}
            {formType === 'coupon' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Desconto</label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentual (%)</option>
                    <option value="fixed">Valor Fixo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Valor do Desconto ({formDiscountType === 'percentage' ? '%' : '$'})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={formDiscountType === 'percentage' ? 100 : 999999}
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Bonus points fields */}
            {formType === 'bonus_points' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Quantidade de Pontos</label>
                <input
                  type="number"
                  min={1}
                  value={formPointsAmount}
                  onChange={(e) => setFormPointsAmount(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm text-gray-600">Ativo</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingId ? 'Salvar Alterações' : 'Criar Recompensa'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Rewards grouped by level */}
      {!loading && (
        <div className="space-y-6">
          {LEVELS.map((level) => {
            const levelRewards = groupedRewards[level];
            return (
              <div key={level} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${LEVEL_COLORS[level]?.split(' ').find(c => c.startsWith('border-')) || 'border-gray-200'}`}>
                {/* Level Header */}
                <div className={`px-5 py-3 ${LEVEL_COLORS[level]} border-b flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{LEVEL_ICONS[level]}</span>
                    <h3 className="font-semibold capitalize text-sm">{level}</h3>
                    <span className="text-xs opacity-60">({levelRewards.length} recompensa{levelRewards.length !== 1 ? 's' : ''})</span>
                  </div>
                </div>

                {/* Level Rewards */}
                {levelRewards.length === 0 ? (
                  <div className="px-5 py-6 text-center text-gray-400 text-sm bg-white">
                    Nenhuma recompensa para este nível.{' '}
                    <button
                      onClick={() => { resetForm(); setFormLevel(level); setShowForm(true); }}
                      className="text-blue-600 hover:underline"
                    >
                      Criar uma
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 bg-white">
                    {levelRewards.map((reward) => (
                      <div key={reward.id} className="px-5 py-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              reward.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {reward.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                            <span className="text-xs text-gray-400">{TYPE_LABELS[reward.reward_type] || reward.reward_type}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-800">{reward.description}</p>
                          {reward.reward_type === 'coupon' && reward.reward_value && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Desconto: {reward.reward_value.discount}{reward.reward_value.type === 'percentage' ? '%' : '$'}
                            </p>
                          )}
                          {reward.reward_type === 'bonus_points' && reward.reward_value && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              +{reward.reward_value.amount} pontos
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleToggleActive(reward)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              reward.is_active
                                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {reward.is_active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            onClick={() => handleEdit(reward)}
                            className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(reward.id)}
                            className="px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                          >
                            Apagar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {!loading && rewards.length > 0 && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Resumo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{rewards.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{rewards.filter(r => r.is_active).length}</p>
              <p className="text-xs text-gray-500">Ativos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{rewards.filter(r => r.reward_type === 'coupon').length}</p>
              <p className="text-xs text-gray-500">Cupons</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{new Set(rewards.map(r => r.level)).size}</p>
              <p className="text-xs text-gray-500">Níveis com Recompensas</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
