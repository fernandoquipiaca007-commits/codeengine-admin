import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../lib/supabase-admin';
import { 
  Users, FileText, Landmark, BarChart3, Database, Check, ExternalLink 
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
  plan_expires_at?: string;
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
  cover_storage_path?: string | null;
  storage_url: string;
  file_storage_path?: string | null;
  stripe_price_id?: string | null;
  fastpay_link?: string | null;
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
  const [activeTab, setActiveTab] = useState<'candidates' | 'products' | 'withdrawals' | 'upgrades' | 'settings' | 'stats'>('candidates');
  
  // Data lists
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<OnboardingStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals state
  const [rejectModalData, setRejectModalData] = useState<{ id: string; type: 'candidate' | 'product' | 'withdrawal' | 'upgrade' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [approveAoaModalData, setApproveAoaModalData] = useState<PendingProduct | null>(null);
  const [stripePriceId, setStripePriceId] = useState('');
  const [fastpayLink, setFastpayLink] = useState('');

  const [payoutModalData, setPayoutModalData] = useState<Withdrawal | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');

  // Subscription settings states
  const [subscriptionLinkSetting, setSubscriptionLinkSetting] = useState('');
  const [subscriptionPriceUsdSetting, setSubscriptionPriceUsdSetting] = useState('');
  const [subscriptionPriceAoaSetting, setSubscriptionPriceAoaSetting] = useState('');
  const [subscriptionPriceIdSetting, setSubscriptionPriceIdSetting] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Upgrades list state
  const [upgrades, setUpgrades] = useState<any[]>([]);

  // Bulk actions selection states
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Payout scheduling state
  const [scheduleDate, setScheduleDate] = useState('');

  // Collaborator Sales Viewer modal state
  const [salesModalCollab, setSalesModalCollab] = useState<any | null>(null);
  const [salesDetails, setSalesDetails] = useState<any>(null);
  const [loadingSales, setLoadingSales] = useState(false);

  // Manage Plan modal state
  const [managePlanCollab, setManagePlanCollab] = useState<any | null>(null);
  const [newPlanType, setNewPlanType] = useState<'ebook_creator' | 'course_creator'>('ebook_creator');
  const [newPlanExpiry, setNewPlanExpiry] = useState('');

  // Helper functions for selections
  function toggleSelectCandidate(id: string) {
    setSelectedCandidateIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAllCandidates(filteredCandidates: Candidate[]) {
    const pendingIds = filteredCandidates.filter(c => c.status === 'pending').map(c => c.id);
    if (selectedCandidateIds.length === pendingIds.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(pendingIds);
    }
  }

  function toggleSelectProduct(id: string) {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAllProducts() {
    const pendingProductIds = products.map(p => p.id);
    if (selectedProductIds.length === pendingProductIds.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(pendingProductIds);
    }
  }

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

      if (activeTab === 'upgrades') {
        const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/upgrades`, {
          headers: { 'x-admin-key': ADMIN_KEY }
        });
        const data = await res.json();
        if (data.success) {
          setUpgrades(data.upgrades || []);
        } else {
          throw new Error(data.error);
        }
      }

      if (activeTab === 'settings') {
        const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/settings`, {
          headers: { 'x-admin-key': ADMIN_KEY }
        });
        const data = await res.json();
        if (data.success) {
          setSubscriptionLinkSetting(data.settings?.fastpay_subscription_link || '');
          setSubscriptionPriceUsdSetting(data.settings?.subscription_price_usd || '9.00');
          setSubscriptionPriceAoaSetting(data.settings?.subscription_price_aoa || '8000.00');
          setSubscriptionPriceIdSetting(data.settings?.stripe_subscription_price_id || '');
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

  // ============================================
  // SUBSCRIPTION & SETTINGS ACTIONS
  // ============================================

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({
          settings: {
            fastpay_subscription_link: subscriptionLinkSetting.trim(),
            subscription_price_usd: subscriptionPriceUsdSetting.trim(),
            subscription_price_aoa: subscriptionPriceAoaSetting.trim(),
            stripe_subscription_price_id: subscriptionPriceIdSetting.trim()
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess('Configurações atualizadas com sucesso!');
        void loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao salvar configurações.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleApproveUpgrade(id: string) {
    setActionLoading(`approve-upgrade-${id}`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/upgrades/${id}/approve`, {
        method: 'POST',
        headers: { 'x-admin-key': ADMIN_KEY }
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess('Upgrade de plano aprovado com sucesso!');
        void loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao aprovar upgrade.');
    } finally {
      setActionLoading('');
    }
  }

  async function handleRejectUpgrade(id: string, reason: string) {
    setActionLoading(`reject-upgrade-${id}`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/upgrades/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess('Upgrade de plano recusado.');
        void loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao rejeitar upgrade.');
    } finally {
      setActionLoading('');
    }
  }

  async function handleViewSales(collab: any) {
    setSalesModalCollab(collab);
    setLoadingSales(true);
    setSalesDetails(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/${collab.id}/sales`, {
        headers: { 'x-admin-key': ADMIN_KEY }
      });
      const data = await res.json();
      if (data.success) {
        setSalesDetails(data);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao carregar histórico de vendas.');
      setSalesModalCollab(null);
    } finally {
      setLoadingSales(false);
    }
  }

  async function handleScheduleWithdrawalSubmit() {
    if (!payoutModalData || !scheduleDate) {
      notifyError('Por favor, informe uma data para o agendamento.');
      return;
    }
    const { id } = payoutModalData;
    setActionLoading(`schedule-payout-${id}`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/withdrawals/${id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({ date: scheduleDate })
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess('Pagamento agendado com sucesso!');
        setPayoutModalData(null);
        setScheduleDate('');
        void loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao agendar pagamento.');
    } finally {
      setActionLoading('');
    }
  }

  async function handleBulkApproveCandidates() {
    if (selectedCandidateIds.length === 0) return;
    setActionLoading('bulk-approve-candidates');
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/bulk-approve-candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({ ids: selectedCandidateIds, adminUserId: null })
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess(`${selectedCandidateIds.length} candidatos aprovados em massa!`);
        setSelectedCandidateIds([]);
        void loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro na aprovação em massa.');
    } finally {
      setActionLoading('');
    }
  }

  async function handleBulkApproveProducts() {
    if (selectedProductIds.length === 0) return;
    setActionLoading('bulk-approve-products');
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/bulk-approve-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({ ids: selectedProductIds })
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess(`${selectedProductIds.length} produtos aprovados em massa!`);
        setSelectedProductIds([]);
        void loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro na aprovação de produtos em massa.');
    } finally {
      setActionLoading('');
    }
  }

  async function handleUpdatePlanSubmit() {
    if (!managePlanCollab) return;
    try {
      const { error } = await supabaseAdmin
        .from('collaborators')
        .update({
          plan: newPlanType,
          plan_expires_at: newPlanExpiry ? new Date(newPlanExpiry).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', managePlanCollab.id);

      if (error) throw error;
      notifySuccess('Plano do colaborador atualizado com sucesso!');
      setManagePlanCollab(null);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao atualizar plano.');
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
  async function handleDownloadFile(prod: PendingProduct) {
    let filePath = prod.file_storage_path || prod.storage_url || '';
    if (filePath.includes('/ebooks-private/')) {
      filePath = filePath.substring(filePath.indexOf('/ebooks-private/') + '/ebooks-private/'.length);
    }
    
    try {
      notifySuccess('Iniciando download do arquivo principal...');
      const { data, error } = await supabaseAdmin.storage
        .from('ebooks-private')
        .download(filePath);
        
      if (error) throw error;
      
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'product-file';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      notifyError('Erro ao baixar arquivo: ' + err.message);
    }
  }

  async function handleDownloadCover(prod: PendingProduct) {
    let filePath = prod.cover_storage_path || prod.cover_url || '';
    if (filePath.includes('/product-covers/')) {
      filePath = filePath.substring(filePath.indexOf('/product-covers/') + '/product-covers/'.length);
    }
    
    try {
      notifySuccess('Iniciando download da capa...');
      const { data, error } = await supabaseAdmin.storage
        .from('product-covers')
        .download(filePath);
        
      if (error) throw error;
      
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'product-cover';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      notifyError('Erro ao baixar capa: ' + err.message);
    }
  }

  async function handleApproveProduct(prod: PendingProduct, forcePriceId?: string, forceFastpayLink?: string) {
    setActionLoading(`approve-prod-${prod.id}`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/products/${prod.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({ 
          stripePriceId: forcePriceId || stripePriceId,
          fastpayLink: forceFastpayLink || fastpayLink
        })
      });
      const data = await res.json();
      if (data.success) {
        notifySuccess('Produto aprovado e ativado!');
        setApproveAoaModalData(null);
        setStripePriceId('');
        setFastpayLink('');
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
          <Users size={16} /> Candidatos & Parceiros
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
          onClick={() => setActiveTab('upgrades')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'upgrades'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Landmark size={16} /> Comprovantes de Assinatura
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'settings'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Database size={16} /> Configurações de Plano
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
            <div className="space-y-6">
              {/* Bulk actions bar */}
              {selectedCandidateIds.length > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <span className="text-sm text-gray-700 font-medium">
                    <span className="font-bold text-primary">{selectedCandidateIds.length}</span> candidatos selecionados para aprovação em massa.
                  </span>
                  <button
                    onClick={handleBulkApproveCandidates}
                    disabled={actionLoading !== null}
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-high transition-all"
                  >
                    Aprovar Candidaturas Selecionadas
                  </button>
                </div>
              )}

              {/* Section 1: Pending Candidates */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-base">Candidatos Aguardando Moderação</h3>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-400">
                      <th className="px-6 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedCandidateIds.length > 0 && selectedCandidateIds.length === candidates.filter(c => c.status === 'pending').length}
                          onChange={() => toggleSelectAllCandidates(candidates)}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                      </th>
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
                        <td colSpan={6} className="text-center py-12 text-gray-400">Nenhum candidato aguardando moderação.</td>
                      </tr>
                    ) : (
                      candidates.filter(c => c.status === 'pending').map((cand) => (
                        <tr key={cand.id}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedCandidateIds.includes(cand.id)}
                              onChange={() => toggleSelectCandidate(cand.id)}
                              className="rounded text-primary focus:ring-primary h-4 w-4"
                            />
                          </td>
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

              {/* Section 2: Active Collaborators */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h3 className="font-semibold text-gray-900 text-base">Colaboradores Parceiros Ativos</h3>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-400">
                      <th className="px-6 py-4">Nome & Contato</th>
                      <th className="px-6 py-4">Plano</th>
                      <th className="px-6 py-4">Expira em</th>
                      <th className="px-6 py-4">Payout Esperado</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {candidates.filter(c => c.status === 'approved').length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-400">Nenhum colaborador parceiro ativo no momento.</td>
                      </tr>
                    ) : (
                      candidates.filter(c => c.status === 'approved').map((cand) => (
                        <tr key={cand.id}>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{cand.display_name}</div>
                            <div className="text-xs text-gray-400">{cand.members?.email}</div>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold uppercase">
                            {cand.plan === 'course_creator' ? (
                              <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Course Creator</span>
                            ) : (
                              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Ebook Creator</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {cand.plan_expires_at ? new Date(cand.plan_expires_at).toLocaleDateString('pt-BR') : 'Sem expiração (Grátis)'}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <div className="font-semibold text-gray-900 uppercase">{cand.payout_method}</div>
                            {cand.payout_method === 'paypal' ? (
                              <div className="text-gray-400 truncate">{cand.payout_info?.email}</div>
                            ) : (
                              <div className="text-gray-400 truncate">{cand.payout_info?.bankName} - {cand.payout_info?.iban}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleViewSales(cand)}
                                className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
                              >
                                Ver Vendas
                              </button>
                              <button
                                onClick={() => {
                                  setManagePlanCollab(cand);
                                  setNewPlanType(cand.plan);
                                  setNewPlanExpiry(cand.plan_expires_at ? cand.plan_expires_at.split('T')[0] : '');
                                }}
                                className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 transition-all"
                              >
                                Gerenciar Plano
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Pending Products */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Bulk actions bar */}
              {selectedProductIds.length > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <span className="text-sm text-gray-700 font-medium">
                    <span className="font-bold text-primary">{selectedProductIds.length}</span> produtos selecionados para aprovação em massa.
                  </span>
                  <button
                    onClick={handleBulkApproveProducts}
                    disabled={actionLoading !== null}
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-high transition-all"
                  >
                    Aprovar Produtos Selecionados
                  </button>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-400">
                      <th className="px-6 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.length > 0 && selectedProductIds.length === products.length}
                          onChange={toggleSelectAllProducts}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                      </th>
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
                        <td colSpan={7} className="text-center py-12 text-gray-400">Nenhum produto aguardando aprovação.</td>
                      </tr>
                    ) : (
                      products.map((prod) => (
                        <tr key={prod.id}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(prod.id)}
                              onChange={() => toggleSelectProduct(prod.id)}
                              className="rounded text-primary focus:ring-primary h-4 w-4"
                            />
                          </td>
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
                                onClick={() => {
                                  setStripePriceId(prod.stripe_price_id || '');
                                  setFastpayLink(prod.fastpay_link || '');
                                  setApproveAoaModalData(prod);
                                }}
                                disabled={actionLoading !== null}
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition-all flex items-center gap-1 disabled:opacity-50"
                              >
                                <Check size={14} /> Analisar / Aprovar
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

          {/* TAB: Upgrades (Comprovantes de Assinatura) */}
          {activeTab === 'upgrades' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-400">
                    <th className="px-6 py-4">Colaborador</th>
                    <th className="px-6 py-4">Plano Pretendido</th>
                    <th className="px-6 py-4">Comprovativo</th>
                    <th className="px-6 py-4">Data Solicitada</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {upgrades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">Nenhum comprovante de assinatura aguardando moderação.</td>
                    </tr>
                  ) : (
                    upgrades.map((upg) => (
                      <tr key={upg.id}>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{upg.display_name}</div>
                          <div className="text-xs text-gray-400">{upg.members?.email}</div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded uppercase">Course Creator</span>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {upg.upgrade_receipt_url ? (
                            <a
                              href={upg.upgrade_receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline font-semibold flex items-center gap-1"
                            >
                              Ver Comprovativo <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-gray-400">Sem arquivo</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {upg.upgrade_requested_at ? new Date(upg.upgrade_requested_at).toLocaleDateString('pt-BR') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleApproveUpgrade(upg.id)}
                              disabled={actionLoading !== null}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <Check size={14} /> Aprovar Upgrade
                            </button>
                            <button
                              onClick={() => setRejectModalData({ id: upg.id, type: 'upgrade' })}
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

          {/* TAB: Settings (Configurações de Plano) */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm max-w-xl space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 font-display">Preços e Link de Assinatura</h3>
                <p className="text-xs text-gray-500 mt-1">Configurações globais dos planos pagos para os colaboradores (upgrade para Course Creator).</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Preço da Assinatura (USD)</label>
                <input
                  type="text"
                  value={subscriptionPriceUsdSetting}
                  onChange={(e) => setSubscriptionPriceUsdSetting(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="9.00"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Preço da Assinatura (AOA / Kwanza)</label>
                <input
                  type="text"
                  value={subscriptionPriceAoaSetting}
                  onChange={(e) => setSubscriptionPriceAoaSetting(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="8000.00"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Link de Pagamento Facipay (Angola)</label>
                <input
                  type="url"
                  value={subscriptionLinkSetting}
                  onChange={(e) => setSubscriptionLinkSetting(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="https://fastpay.ao/pay/..."
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">Link da Facipay para pagamento em Kwanza (Angola).</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Stripe Price ID de Assinatura (USD)</label>
                <input
                  type="text"
                  value={subscriptionPriceIdSetting}
                  onChange={(e) => setSubscriptionPriceIdSetting(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="price_..."
                />
                <p className="text-[10px] text-gray-400 mt-1">Opcional. Identificador do preço recorrente correspondente no Stripe.</p>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full rounded-xl bg-primary py-3 font-semibold text-white hover:bg-primary-high transition-all disabled:opacity-50"
              >
                {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </form>
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
                  if (rejectModalData.type === 'upgrade') {
                    void handleRejectUpgrade(rejectModalData.id, rejectReason);
                    setRejectModalData(null);
                    setRejectReason('');
                  }
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

      {/* Modal: Product Review & Approval */}
      {approveAoaModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl my-8 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2 text-blue-600">
                🔍 Revisão de Produto Pendente
              </h3>
              <button 
                onClick={() => {
                  setApproveAoaModalData(null);
                  setStripePriceId('');
                  setFastpayLink('');
                }} 
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                Fechar
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Product Cover and Basic Info */}
              <div className="flex flex-col sm:flex-row gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="w-full sm:w-32 h-40 bg-gray-200 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0 relative group">
                  <img 
                    src={approveAoaModalData.cover_url} 
                    className="w-full h-full object-cover" 
                    alt="Capa do Produto" 
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{approveAoaModalData.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 uppercase font-semibold">
                      Criador: {approveAoaModalData.collaborators?.display_name} ({String(approveAoaModalData.collaborators?.plan || '').replace('_', ' ')})
                    </p>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-3">{approveAoaModalData.description}</p>
                  </div>
                  
                  {/* Downloads Row */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleDownloadCover(approveAoaModalData)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-sm"
                    >
                      ⬇️ Baixar Capa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(approveAoaModalData)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm"
                    >
                      💾 Baixar Arquivo Principal
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="block text-xs font-semibold uppercase text-gray-400">Preço Internacional (USD)</span>
                  <span className="text-2xl font-bold text-gray-900 font-mono mt-1 block">
                    $ {approveAoaModalData.price ? Number(approveAoaModalData.price).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="block text-xs font-semibold uppercase text-gray-400">Preço Angola (AOA)</span>
                  <span className="text-2xl font-bold text-gray-900 font-mono mt-1 block">
                    {approveAoaModalData.aoa_price ? `${Number(approveAoaModalData.aoa_price).toLocaleString()} Kz` : 'Não definido'}
                  </span>
                </div>
              </div>

              {/* Approval Forms */}
              <div className="space-y-4 border-t border-gray-100 pt-4">
                {/* FastPay Link input */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Link da Facipay (AOA)
                  </label>
                  <input
                    type="url"
                    placeholder="https://fastpay.ao/pay/..."
                    value={fastpayLink}
                    onChange={(e) => setFastpayLink(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Insira o link de pagamento gerado na Facipay para compras em Kwanza (AOA).
                  </p>
                </div>

                {/* Stripe Price ID input */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Stripe Price ID manual (USD/Internacional)
                  </label>
                  <input
                    type="text"
                    placeholder="price_1..."
                    value={stripePriceId}
                    onChange={(e) => setStripePriceId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Opcional. Se for um produto USD, o Stripe Price ID é gerado automaticamente. Caso queira forçar um preço manual do Stripe, insira-o aqui.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-gray-100 pt-4">
                <button
                  onClick={() => {
                    setApproveAoaModalData(null);
                    setRejectModalData({ id: approveAoaModalData.id, type: 'product' });
                  }}
                  className="px-4 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold flex-1"
                >
                  Recusar Produto
                </button>
                <button
                  onClick={() => handleApproveProduct(approveAoaModalData, stripePriceId, fastpayLink)}
                  className="px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex-1 shadow-md"
                >
                  Aprovar e Ativar na Loja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Process withdrawal payout */}
      {payoutModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 font-display">Registrar / Agendar Pagamento</h3>
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

              {/* OPÇÃO 1: Pagar Imediatamente */}
              <div className="border-t border-gray-100 pt-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Opção 1: Pagar Agora</h4>
                <label className="block text-xs text-gray-500 mb-1">Comprovante de Transferência:</label>
                <input
                  type="text"
                  placeholder="Ex: https://link-comprovante.com/payout-123.pdf ou Ref: 8493029"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none mb-2"
                />
                <button
                  onClick={handleProcessWithdrawalSubmit}
                  disabled={actionLoading !== null}
                  className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  Confirmar Pagamento Imediato
                </button>
              </div>

              {/* OPÇÃO 2: Agendar Pagamento */}
              <div className="border-t border-gray-100 pt-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Opção 2: Agendar Pagamento</h4>
                <label className="block text-xs text-gray-500 mb-1">Data para o Pagamento:</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none mb-2"
                />
                <button
                  onClick={handleScheduleWithdrawalSubmit}
                  disabled={!scheduleDate || actionLoading !== null}
                  className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  Agendar para {scheduleDate ? new Date(scheduleDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data informada'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Collaborator Sales Viewer */}
      {salesModalCollab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 font-display">Histórico de Vendas: {salesModalCollab.display_name}</h3>
              <button onClick={() => setSalesModalCollab(null)} className="text-gray-400 hover:text-gray-600 text-sm font-semibold">Fechar</button>
            </div>
            
            {loadingSales ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">Total Faturado</span>
                    <span className="text-lg font-bold text-gray-800">
                      {salesModalCollab.payout_method === 'iban'
                        ? Number(salesDetails?.totalSalesAmount || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })
                        : Number(salesDetails?.totalSalesAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">Vendas Realizadas</span>
                    <span className="text-lg font-bold text-gray-800">{salesDetails?.salesCount || 0}</span>
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-150 font-semibold uppercase text-gray-400">
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Comprador</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {!salesDetails?.sales || salesDetails.sales.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-gray-400">Nenhuma venda registrada ainda.</td>
                        </tr>
                      ) : (
                        salesDetails.sales.map((sale: any) => (
                          <tr key={sale.id}>
                            <td className="px-4 py-3 font-medium text-gray-900">{sale.productTitle}</td>
                            <td className="px-4 py-3 text-gray-500">{sale.buyerEmail}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {salesModalCollab.payout_method === 'iban'
                                ? Number(sale.amountPaid).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })
                                : Number(sale.amountPaid).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </td>
                            <td className="px-4 py-3 text-gray-400">
                              {new Date(sale.purchaseDate).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Manage Collaborator Plan manually */}
      {managePlanCollab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 font-display">Gerenciar Plano: {managePlanCollab.display_name}</h3>
              <button onClick={() => setManagePlanCollab(null)} className="text-gray-400 hover:text-gray-600 text-sm font-semibold">Fechar</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tipo de Plano</label>
                <select
                  value={newPlanType}
                  onChange={(e: any) => setNewPlanType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="ebook_creator">Ebook Creator (Grátis)</option>
                  <option value="course_creator">Course Creator ($9/mês)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Expiração do Plano</label>
                <input
                  type="date"
                  value={newPlanExpiry}
                  onChange={(e) => setNewPlanExpiry(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">Deixe em branco para sem expiração.</p>
              </div>

              <button
                onClick={handleUpdatePlanSubmit}
                className="w-full rounded-xl bg-primary py-3 font-semibold text-white hover:bg-primary-high transition-all"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
