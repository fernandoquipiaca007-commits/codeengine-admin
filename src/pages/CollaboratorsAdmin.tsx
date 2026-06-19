import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../lib/supabase-admin';
import { 
  Users, FileText, Landmark, BarChart3, Database, Check, AlertTriangle, ExternalLink 
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface Candidate {
  id: string;
  display_name: string;
  bio: string;
  specialty: string;
  status: 'pending' | 'approved' | 'rejected';
  plan: 'ebook_creator' | 'course_creator';
  payout_method: 'paypal' | 'iban';
  payout_info: any;
  onboarding_survey: {
    contentTypes?: string[];
    estimatedVolume?: string;
  };
  created_at: string;
  members?: {
    email: string;
  };
}

interface PendingProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  aoa_price: number | null;
  cover_url: string;
  storage_url: string;
  preview_url: string | null;
  video_url: string | null;
  licensing_info: any;
  collaborator_id: string;
  approval_status: 'pending_review' | 'approved' | 'rejected';
  created_at: string;
  collaborators?: {
    display_name: string;
    plan: string;
  };
}

interface Withdrawal {
  id: string;
  collaborator_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  payout_method_details: any;
  processed_at: string | null;
  rejection_reason: string | null;
  receipt_url: string | null;
  created_at: string;
  collaborators?: {
    display_name: string;
    plan: string;
    payout_method: string;
  };
}

interface OnboardingStats {
  totalApplications: number;
  formats: {
    ebooks: number;
    courses: number;
    tools: number;
    events: number;
  };
  volumeGb: {
    lessThan1Gb: number;
    oneToFiveGb: number;
    fiveToTwentyGb: number;
    moreThan20Gb: number;
  };
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

export default function CollaboratorsAdmin() {
  const { notifyError, notifySuccess } = useToast();
  const [activeTab, setActiveTab] = useState<'candidates' | 'products' | 'withdrawals' | 'stats'>('candidates');
  
  // Data lists
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<OnboardingStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals state
  const [rejectModalData, setRejectModalData] = useState<{ id: string; type: 'candidate' | 'product' | 'withdrawal' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [approveAoaModalData, setApproveAoaModalData] = useState<PendingProduct | null>(null);
  const [stripePriceId, setStripePriceId] = useState('');

  const [payoutModalData, setPayoutModalData] = useState<Withdrawal | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'candidates' || activeTab === 'stats') {
        const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/applications`, {
          headers: { 'x-admin-key': ADMIN_KEY }
        });
        const data = await res.json();
        if (data.success) {
          setCandidates(data.candidates || []);
          setStats(data.surveyStats);
        } else {
          throw new Error(data.error);
        }
      }

      if (activeTab === 'products') {
        // Query products pending_review directly from DB
        const { data, error } = await supabaseAdmin
          .from('products')
          .select('*, collaborators(display_name, plan)')
          .eq('approval_status', 'pending_review')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      }

      if (activeTab === 'withdrawals') {
        const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/withdrawals`, {
          headers: { 'x-admin-key': ADMIN_KEY }
        });
        const data = await res.json();
        if (data.success) {
          setWithdrawals(data.withdrawals || []);
        } else {
          throw new Error(data.error);
        }
      }
    } catch (err: any) {
      console.error('Error loading admin data:', err);
      notifyError(err.message || 'Erro ao carregar dados de colaboradores.');
    } finally {
      setLoading(false);
    }
  }

  // Candidacy actions
  async function handleApproveCandidate(id: string) {
    setActionLoading(`approve-candidate-${id}`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/approve/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({ adminUserId: null })
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess('Colaborador aprovado com sucesso!');
        void loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao aprovar candidato.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectCandidateSubmit() {
    if (!rejectModalData) return;
    const { id } = rejectModalData;
    setActionLoading(`reject-candidate-${id}`);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/reject/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess('Candidatura rejeitada.');
        setRejectModalData(null);
        setRejectReason('');
        void loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao rejeitar candidato.');
    } finally {
      setActionLoading(null);
    }
  }

  // Product actions
  async function handleApproveProduct(prod: PendingProduct, forcePriceId?: string) {
    const isAoa = prod.aoa_price && Number(prod.aoa_price) > 0;
    
    if (isAoa && !forcePriceId) {
      setApproveAoaModalData(prod);
      return;
    }

    setActionLoading(`approve-prod-${prod.id}`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/products/${prod.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({ stripePriceId: forcePriceId })
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess('Produto aprovado e ativado!');
        setApproveAoaModalData(null);
        setStripePriceId('');
        void loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao aprovar produto.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectProductSubmit() {
    if (!rejectModalData) return;
    const { id } = rejectModalData;
    setActionLoading(`reject-prod-${id}`);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/products/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess('Produto rejeitado e marcado como rascunho.');
        setRejectModalData(null);
        setRejectReason('');
        void loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao rejeitar produto.');
    } finally {
      setActionLoading(null);
    }
  }

  // Withdrawal actions
  async function handleProcessWithdrawalSubmit() {
    if (!payoutModalData) return;
    const { id } = payoutModalData;
    setActionLoading(`payout-${id}`);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/withdrawals/${id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({
          action: 'completed',
          receiptUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess('Saque processado e comprovante anexado!');
        setPayoutModalData(null);
        setReceiptUrl('');
        void loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao processar saque.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectWithdrawalSubmit() {
    if (!rejectModalData) return;
    const { id } = rejectModalData;
    setActionLoading(`reject-withdraw-${id}`);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/withdrawals/${id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({
          action: 'rejected',
          rejectionReason: rejectReason
        })
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess('Saque rejeitado e saldo estornado.');
        setRejectModalData(null);
        setRejectReason('');
        void loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao rejeitar saque.');
    } finally {
      setActionLoading(null);
    }
  }

  const formatPrice = (prod: PendingProduct) => {
    if (prod.aoa_price && Number(prod.aoa_price) > 0) {
      return Number(prod.aoa_price).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });
    }
    return Number(prod.price || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Moderação de Colaboradores</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie novos criadores, revise produtos pendentes de publicação e aprove solicitações de saque.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('candidates')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'candidates'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Users size={16} /> Candidatos Pendentes
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'products'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <FileText size={16} /> Produtos em Revisão
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'withdrawals'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Landmark size={16} /> Fila de Saques
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'stats'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <BarChart3 size={16} /> Projeção de Demanda
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: Candidates */}
          {activeTab === 'candidates' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-400">
                    <th className="px-6 py-4">Nome & Contato</th>
                    <th className="px-6 py-4">Especialidade / Bio</th>
                    <th className="px-6 py-4">Payout Esperado</th>
                    <th className="px-6 py-4">Onboarding Survey</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidates.filter(c => c.status === 'pending').length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">Nenhum candidato aguardando moderação.</td>
                    </tr>
                  ) : (
                    candidates.filter(c => c.status === 'pending').map((cand) => (
                      <tr key={cand.id}>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{cand.display_name}</div>
                          <div className="text-xs text-gray-400">{cand.members?.email}</div>
                          <div className="text-[10px] text-gray-400 mt-1">Data: {new Date(cand.created_at).toLocaleDateString('pt-BR')}</div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="font-medium text-gray-700">{cand.specialty}</div>
                          <div className="text-xs text-gray-400 line-clamp-2 mt-1">{cand.bio}</div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-semibold text-gray-900 uppercase">{cand.payout_method}</div>
                          {cand.payout_method === 'paypal' ? (
                            <div className="text-gray-400 truncate">{cand.payout_info?.email}</div>
                          ) : (
                            <div className="text-gray-400 truncate">{cand.payout_info?.bankName} - {cand.payout_info?.iban}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs space-y-1">
                          <div>
                            <strong>Tipos:</strong> {cand.onboarding_survey?.contentTypes?.join(', ') || 'Nenhum'}
                          </div>
                          <div>
                            <strong>Volume 90d:</strong>{' '}
                            <span className="font-semibold text-primary">
                              {cand.onboarding_survey?.estimatedVolume === 'less_1gb' && 'Menos de 1 GB'}
                              {cand.onboarding_survey?.estimatedVolume === '1_5gb' && '1 a 5 GB'}
                              {cand.onboarding_survey?.estimatedVolume === '5_20gb' && '5 a 20 GB'}
                              {cand.onboarding_survey?.estimatedVolume === 'more_20gb' && 'Mais de 20 GB'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleApproveCandidate(cand.id)}
                              disabled={actionLoading !== null}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <Check size={14} /> Aprovar
                            </button>
                            <button
                              onClick={() => setRejectModalData({ id: cand.id, type: 'candidate' })}
                              disabled={actionLoading !== null}
                              className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
                            >
                              Recusar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Pending Products */}
          {activeTab === 'products' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-400">
                    <th className="px-6 py-4">Produto</th>
                    <th className="px-6 py-4">Criador / Plano</th>
                    <th className="px-6 py-4">Preço</th>
                    <th className="px-6 py-4">Licenciamento</th>
                    <th className="px-6 py-4">Mídia / Download</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">Nenhum produto aguardando aprovação.</td>
                    </tr>
                  ) : (
                    products.map((prod) => (
                      <tr key={prod.id}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={prod.cover_url} className="h-12 w-10 object-cover rounded border border-gray-150" alt="" />
                            <div>
                              <div className="font-semibold text-gray-900 line-clamp-1">{prod.title}</div>
                              <div className="text-xs text-gray-400 mt-1 line-clamp-2">{prod.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{prod.collaborators?.display_name}</div>
                          <div className="text-xs text-gray-400 capitalize">{String(prod.collaborators?.plan || '').replace('_', ' ')}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-950">
                          {formatPrice(prod)}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-semibold text-gray-800 capitalize">{prod.licensing_info?.type}</div>
                          <div className="text-gray-400">{prod.licensing_info?.lifetime ? 'Vitalício' : `${prod.licensing_info?.duration_days} dias`}</div>
                        </td>
                        <td className="px-6 py-4 text-xs space-y-1">
                          <div>
                            <a href={prod.storage_url} className="text-primary hover:underline font-semibold flex items-center gap-1">
                              Download Arquivo <ExternalLink size={12} />
                            </a>
                          </div>
                          {prod.preview_url && (
                            <div>
                              <a href={prod.preview_url} className="text-gray-500 hover:underline">
                                Amostra/Preview
                              </a>
                            </div>
                          )}
                          {prod.video_url && (
                            <div>
                              <a href={prod.video_url} className="text-orange-500 hover:underline">
                                Vídeo Introdução
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleApproveProduct(prod)}
                              disabled={actionLoading !== null}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <Check size={14} /> Aprovar
                            </button>
                            <button
                              onClick={() => setRejectModalData({ id: prod.id, type: 'product' })}
                              disabled={actionLoading !== null}
                              className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
                            >
                              Recusar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: Withdrawals */}
          {activeTab === 'withdrawals' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-400">
                    <th className="px-6 py-4">Colaborador</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Método & Destino</th>
                    <th className="px-6 py-4">Data Solicitada</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">Nenhuma solicitação de saque na fila.</td>
                    </tr>
                  ) : (
                    withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{w.collaborators?.display_name}</div>
                          <div className="text-xs text-gray-400 capitalize">{String(w.collaborators?.plan || '').replace('_', ' ')}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {w.collaborators?.payout_method === 'iban' 
                            ? Number(w.amount).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })
                            : Number(w.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-semibold uppercase text-gray-800">{String(w.payout_method_details?.method || '').toUpperCase()}</div>
                          {w.payout_method_details?.method === 'paypal' ? (
                            <div className="text-gray-400">{w.payout_method_details?.details?.email}</div>
                          ) : (
                            <div className="text-gray-400 truncate max-w-xs">
                              {w.payout_method_details?.details?.bankName} - Titular: {w.payout_method_details?.details?.bankHolder} - IBAN: {w.payout_method_details?.details?.iban}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {new Date(w.created_at).toLocaleDateString('pt-BR')} {new Date(w.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4">
                          {w.status === 'completed' && <span className="rounded bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Pago</span>}
                          {w.status === 'pending' && <span className="rounded bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">Pendente</span>}
                          {w.status === 'rejected' && <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Recusado</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {w.status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setPayoutModalData(w)}
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition-all flex items-center gap-1"
                              >
                                Concluir Pago
                              </button>
                              <button
                                onClick={() => setRejectModalData({ id: w.id, type: 'withdrawal' })}
                                className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all"
                              >
                                Recusar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: Survey Demand Stats */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-5 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total de Candidatos</span>
                  <span className="text-3xl font-extrabold text-gray-900 block mt-2 font-display">{stats.totalApplications}</span>
                  <span className="text-xs text-gray-500 mt-1 block">Avaliados e pendentes acumulados</span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Formatos Requisitados</span>
                  <div className="flex gap-4 mt-3 text-xs">
                    <div>📚 Ebooks: <span className="font-bold text-gray-800">{stats.formats.ebooks}</span></div>
                    <div>🎥 Vídeos: <span className="font-bold text-gray-800">{stats.formats.courses}</span></div>
                    <div>🛠️ Tools: <span className="font-bold text-gray-800">{stats.formats.tools}</span></div>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block flex items-center gap-1.5 text-primary">
                    <Database size={14} /> Demanda Total Planejada (90 dias)
                  </span>
                  <span className="text-xs text-gray-500 mt-2 block">
                    Direciona investimentos futuros na infraestrutura de CDN e streaming de vídeo.
                  </span>
                </div>
              </div>

              {/* Demand Charts */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Formats Requested */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 font-display mb-4">Interesse de Formatos de Conteúdo</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span>Apenas Ebooks / Apostilas (PDFs)</span>
                        <span>{stats.formats.ebooks} ({stats.totalApplications ? Math.round((stats.formats.ebooks / stats.totalApplications) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${stats.totalApplications ? (stats.formats.ebooks / stats.totalApplications) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span>Cursos em Vídeo (Vídeo / Aulas)</span>
                        <span>{stats.formats.courses} ({stats.totalApplications ? Math.round((stats.formats.courses / stats.totalApplications) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${stats.totalApplications ? (stats.formats.courses / stats.totalApplications) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span>Ferramentas Digitais / Plugins / Softwares</span>
                        <span>{stats.formats.tools} ({stats.totalApplications ? Math.round((stats.formats.tools / stats.totalApplications) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${stats.totalApplications ? (stats.formats.tools / stats.totalApplications) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span>Ingressos para Eventos</span>
                        <span>{stats.formats.events} ({stats.totalApplications ? Math.round((stats.formats.events / stats.totalApplications) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${stats.totalApplications ? (stats.formats.events / stats.totalApplications) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Storage Demands */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 font-display mb-4">Estimativa de Volume (Primeiros 90 Dias)</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span>Menos de 1 GB (PDFs simples)</span>
                        <span>{stats.volumeGb.lessThan1Gb} ({stats.totalApplications ? Math.round((stats.volumeGb.lessThan1Gb / stats.totalApplications) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${stats.totalApplications ? (stats.volumeGb.lessThan1Gb / stats.totalApplications) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span>1 a 5 GB (Softwares ou apostilas densas)</span>
                        <span>{stats.volumeGb.oneToFiveGb} ({stats.totalApplications ? Math.round((stats.volumeGb.oneToFiveGb / stats.totalApplications) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${stats.totalApplications ? (stats.volumeGb.oneToFiveGb / stats.totalApplications) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span>5 a 20 GB (Cursos de vídeo pequenos)</span>
                        <span>{stats.volumeGb.fiveToTwentyGb} ({stats.totalApplications ? Math.round((stats.volumeGb.fiveToTwentyGb / stats.totalApplications) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${stats.totalApplications ? (stats.volumeGb.fiveToTwentyGb / stats.totalApplications) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span>Mais de 20 GB (Múltiplos cursos de vídeo)</span>
                        <span>{stats.volumeGb.moreThan20Gb} ({stats.totalApplications ? Math.round((stats.volumeGb.moreThan20Gb / stats.totalApplications) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${stats.totalApplications ? (stats.volumeGb.moreThan20Gb / stats.totalApplications) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Rejection Form */}
      {rejectModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 font-display">Motivo da Recusa / Rejeição</h3>
              <button onClick={() => setRejectModalData(null)} className="text-gray-400 hover:text-gray-600 text-sm">Fechar</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descreva o motivo (visível ao criador):</label>
                <textarea
                  required
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Por favor insira as diretrizes para correção ou motivo de recusa..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none resize-none"
                />
              </div>
              <button
                onClick={() => {
                  if (rejectModalData.type === 'candidate') void handleRejectCandidateSubmit();
                  if (rejectModalData.type === 'product') void handleRejectProductSubmit();
                  if (rejectModalData.type === 'withdrawal') void handleRejectWithdrawalSubmit();
                }}
                disabled={!rejectReason.trim()}
                className="w-full rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Approve local AOA product */}
      {approveAoaModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 font-display flex items-center gap-1 text-primary">
                <AlertTriangle size={20} /> Aprovação de Produto AOA
              </h3>
              <button onClick={() => setApproveAoaModalData(null)} className="text-gray-400 hover:text-gray-600 text-sm">Fechar</button>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Este produto tem preço configurado em Kwanza Angolano (<strong>AOA</strong>). 
                Para que ele possa ser processado via check-out FastPay, você precisa criar/associar o ID do Preço manual correspondente.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Price ID manual para o gateway:</label>
                <input
                  type="text"
                  required
                  placeholder="price_1..."
                  value={stripePriceId}
                  onChange={(e) => setStripePriceId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <button
                onClick={() => handleApproveProduct(approveAoaModalData, stripePriceId)}
                disabled={!stripePriceId.trim()}
                className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                Ativar e Publicar na Loja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Process withdrawal payout */}
      {payoutModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 font-display">Registrar Pagamento de Saque</h3>
              <button onClick={() => setPayoutModalData(null)} className="text-gray-400 hover:text-gray-600 text-sm">Fechar</button>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-500 space-y-1">
                <div>Solicitante: <span className="font-semibold text-gray-900">{payoutModalData.collaborators?.display_name}</span></div>
                <div>Método de Destino: <span className="font-semibold text-gray-900 uppercase">{payoutModalData.payout_method_details?.method}</span></div>
                {payoutModalData.payout_method_details?.method === 'paypal' ? (
                  <div>PayPal Email: <span className="font-medium text-gray-900">{payoutModalData.payout_method_details?.details?.email}</span></div>
                ) : (
                  <>
                    <div>Banco: <span className="font-medium text-gray-900">{payoutModalData.payout_method_details?.details?.bankName}</span></div>
                    <div>IBAN: <span className="font-medium text-gray-900">{payoutModalData.payout_method_details?.details?.iban}</span></div>
                  </>
                )}
                <div className="border-t border-gray-200 mt-2 pt-2 text-sm text-green-600 font-bold">
                  Valor a transferir:{' '}
                  {payoutModalData.collaborators?.payout_method === 'iban' 
                    ? Number(payoutModalData.amount).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })
                    : Number(payoutModalData.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante de Transferência (URL ou Ref):</label>
                <input
                  type="text"
                  placeholder="Ex: https://link-comprovante.com/payout-123.pdf ou Ref: 8493029"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <button
                onClick={handleProcessWithdrawalSubmit}
                className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
              >
                Confirmar Payout como Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
