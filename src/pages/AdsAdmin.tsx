import { useState, useEffect, useCallback } from 'react';
import { 
  Megaphone, 
  CheckCircle, 
  Sliders, 
  DollarSign, 
  Play, 
  Pause,
  RefreshCw
} from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

export default function AdsAdmin() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'stats'>('pending');
  
  // Rejection overlay
  const [rejectionCampaignId, setRejectionCampaignId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Quality score adjustment state
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [tempQualityScore, setTempQualityScore] = useState<string>('1.0');

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-key': ADMIN_KEY
  };

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/ads/campaigns`, { headers });
      const data = await res.json();
      if (data.success) setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/ads/stats`, { headers });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCampaigns(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchCampaigns, fetchStats]);

  async function handleModerate(campaignId: string, status: 'active' | 'rejected', reason?: string) {
    try {
      const res = await fetch(`${API}/api/admin/ads/campaigns/${campaignId}/moderate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status, rejectionReason: reason })
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: data.campaign.status, rejection_reason: data.campaign.rejection_reason } : c));
        setRejectionCampaignId(null);
        setRejectionReason('');
        void fetchStats();
      } else {
        alert('Erro ao moderar anúncio: ' + (data.error || ''));
      }
    } catch (err) {
      console.error('Error moderating campaign:', err);
      alert('Erro inesperado de rede.');
    }
  }

  async function handleUpdateQualityScore(campaignId: string) {
    const scoreNum = parseFloat(tempQualityScore);
    if (isNaN(scoreNum) || scoreNum < 0.1 || scoreNum > 10.0) {
      alert('O Score de Qualidade deve ser um número entre 0.10 e 10.00');
      return;
    }

    try {
      const res = await fetch(`${API}/api/admin/ads/campaigns/${campaignId}/quality-score`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ qualityScore: scoreNum })
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, quality_score: data.campaign.quality_score } : c));
        setEditingScoreId(null);
      } else {
        alert('Erro ao atualizar score: ' + (data.error || ''));
      }
    } catch (err) {
      console.error('Error updating quality score:', err);
    }
  }

  async function handleToggleCampaign(campaignId: string, currentStatus: string) {
    // We can pause/resume using the same Express toggle endpoint but since it requires Collaborator token,
    // we can implement a custom Admin override toggle or just map a PUT/POST moderation endpoint
    // Actually, setting status to paused/active via moderation is extremely simple and already exists!
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`${API}/api/admin/ads/campaigns/${campaignId}/moderate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: data.campaign.status } : c));
        void fetchStats();
      }
    } catch (err) {
      console.error('Error toggling campaign status:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px] text-white">
        <RefreshCw className="animate-spin h-8 w-8 mb-4 text-primary" />
        <p className="text-xs text-slate-400">Carregando gerenciador de anúncios...</p>
      </div>
    );
  }

  const pendingCampaigns = campaigns.filter(c => c.status === 'pending_approval');
  const activeOrPausedCampaigns = campaigns.filter(c => ['active', 'paused', 'completed', 'rejected'].includes(c.status));

  return (
    <div className="space-y-6 text-white bg-slate-900 p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2">
            <Megaphone className="text-primary w-6 h-6" />
            CodeEngine Ads Platform (Moderação)
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Moderação de criativos, controle de orçamentos e otimização do Quality Score das campanhas patrocinadas.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Fila de Aprovação ({pendingCampaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'active'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Campanhas e Histórico ({activeOrPausedCampaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'stats'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Faturamento e Desempenho
        </button>
      </div>

      {/* TAB CONTENT: PENDING QUEUE */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingCampaigns.length === 0 ? (
            <div className="p-12 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-white">Nenhum anúncio pendente</h3>
              <p className="text-xs text-slate-400 mt-1">Todas as campanhas submetidas estão moderadas.</p>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-400 font-semibold border-b border-slate-800">
                    <th className="p-4">Colaborador / Produto</th>
                    <th className="p-4">Placement</th>
                    <th className="p-4">Duração</th>
                    <th className="p-4">Orçamento</th>
                    <th className="p-4">Filtro/Interesses</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {pendingCampaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {camp.product?.main_image && (
                            <img src={camp.product.main_image} alt="" className="w-10 h-10 rounded object-cover bg-black/40" />
                          )}
                          <div>
                            <div className="font-bold text-white">{camp.product?.title || 'Campanha Customizada'}</div>
                            <div className="text-[10px] text-slate-500">De: {camp.collaborator?.display_name || 'Desconhecido'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 uppercase font-mono text-[10px] text-primary">{camp.placement}</td>
                      <td className="p-4">{camp.duration_days} dias</td>
                      <td className="p-4 font-mono font-semibold text-white">$ {parseFloat(camp.total_budget).toFixed(2)}</td>
                      <td className="p-4">
                        {camp.target_interests && camp.target_interests.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {camp.target_interests.map((i: string) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px]">{i}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleModerate(camp.id, 'active')}
                          className="inline-flex h-7 items-center gap-1 rounded bg-green-600 hover:bg-green-700 px-3 text-[10px] font-bold text-white transition-colors"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => setRejectionCampaignId(camp.id)}
                          className="inline-flex h-7 items-center gap-1 rounded bg-red-600 hover:bg-red-700 px-3 text-[10px] font-bold text-white transition-colors"
                        >
                          Rejeitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ACTIVE & COMPLETED CAMPAIGNS */}
      {activeTab === 'active' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 font-semibold border-b border-slate-800">
                <th className="p-4">Produto / Criador</th>
                <th className="p-4">Placement</th>
                <th className="p-4">Status</th>
                <th className="p-4">Quality Score</th>
                <th className="p-4">Orçamento</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {activeOrPausedCampaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-bold text-white">{camp.product?.title || 'Campanha Customizada'}</div>
                        <div className="text-[10px] text-slate-500">Por: {camp.collaborator?.display_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 uppercase font-mono text-[10px] text-primary">{camp.placement}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      camp.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      camp.status === 'paused' ? 'bg-slate-700/30 text-slate-400 border border-slate-700/50' :
                      camp.status === 'completed' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {camp.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {editingScoreId === camp.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tempQualityScore}
                          onChange={(e) => setTempQualityScore(e.target.value)}
                          className="w-12 bg-slate-800 border border-slate-700 text-white rounded p-1 font-mono text-center"
                        />
                        <button
                          onClick={() => handleUpdateQualityScore(camp.id)}
                          className="px-2 py-1 bg-primary text-black rounded font-bold text-[9px]"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingScoreId(null)}
                          className="text-slate-400 hover:text-white text-[9px]"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-white">{camp.quality_score}</span>
                        {['active', 'paused'].includes(camp.status) && (
                          <button
                            onClick={() => {
                              setEditingScoreId(camp.id);
                              setTempQualityScore(String(camp.quality_score));
                            }}
                            className="text-slate-500 hover:text-primary transition-colors"
                            title="Editar Score de Qualidade"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-mono font-semibold text-white">$ {parseFloat(camp.total_budget).toFixed(2)}</td>
                  <td className="p-4 text-right">
                    {['active', 'paused'].includes(camp.status) && (
                      <button
                        onClick={() => handleToggleCampaign(camp.id, camp.status)}
                        className={`inline-flex h-7 items-center gap-1 rounded px-3 text-[10px] font-bold transition-colors ${
                          camp.status === 'active' 
                            ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' 
                            : 'bg-primary text-black hover:bg-primary-high'
                        }`}
                      >
                        {camp.status === 'active' ? (
                          <>
                            <Pause className="w-3 h-3" /> Pausar
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" /> Retomar
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: STATS & FINANCIALS */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-800/40 border border-slate-800 rounded-2xl">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Faturamento de Ads</div>
              <div className="text-2xl font-black text-white font-mono mt-2 flex items-center gap-1">
                <DollarSign className="w-5 h-5 text-primary" />
                {stats.totalRevenue.toFixed(2)}
              </div>
            </div>
            <div className="p-5 bg-slate-800/40 border border-slate-800 rounded-2xl">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Campanhas Ativas</div>
              <div className="text-2xl font-black text-white font-mono mt-2">
                {stats.activeCampaigns}
              </div>
            </div>
            <div className="p-5 bg-slate-800/40 border border-slate-800 rounded-2xl">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Impressões</div>
              <div className="text-2xl font-black text-white font-mono mt-2">
                {stats.totalImpressions}
              </div>
            </div>
            <div className="p-5 bg-slate-800/40 border border-slate-800 rounded-2xl">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Cliques (CTR)</div>
              <div className="text-2xl font-black text-white font-mono mt-2 flex items-center gap-1.5">
                {stats.totalClicks}
                <span className="text-xs text-primary font-bold">({stats.ctr.toFixed(2)}%)</span>
              </div>
            </div>
          </div>

          {/* Sub-Metrics details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-800/20 border border-slate-800 rounded-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Vendas Geradas via Ads</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                  <span className="text-slate-400 text-xs">Conversões Registadas</span>
                  <span className="text-sm font-bold text-white font-mono">{stats.totalConversions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs">Volume Financeiro Gerado (ROI)</span>
                  <span className="text-sm font-bold text-green-400 font-mono">$ {stats.totalSalesGenerated.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION POPUP */}
      {rejectionCampaignId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRejectionCampaignId(null)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm z-10 space-y-4">
            <h3 className="text-sm font-bold text-white">Motivo da Rejeição</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Digite o motivo pelo qual este anúncio foi rejeitado (criativo impróprio, erro de direcionamento, etc.)..."
              className="w-full h-24 bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 text-xs focus:border-red-500 outline-none"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setRejectionCampaignId(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleModerate(rejectionCampaignId, 'rejected', rejectionReason)}
                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Rejeitar Anúncio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
