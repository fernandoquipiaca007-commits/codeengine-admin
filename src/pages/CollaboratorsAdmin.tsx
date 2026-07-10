import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../lib/supabase-admin';
import { 
  Users, FileText, Landmark, BarChart3, Database, Check, ExternalLink,
  TrendingUp, Download, DollarSign, Clock, CheckCircle, ShieldCheck,
  BookOpen, Video, Wrench, Search, Save, Eye
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
  currency?: string;
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
  const [activeTab, setActiveTab] = useState<'candidates' | 'products' | 'withdrawals' | 'upgrades' | 'settings' | 'stats' | 'analytics'>('candidates');
  
  // Data lists
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [globalFunds, setGlobalFunds] = useState<{ totalGuarantee: number; totalProcessing: number; totalAvailable: number } | null>(null);
  const [globalFundsAoa, setGlobalFundsAoa] = useState<{ totalGuarantee: number; totalProcessing: number; totalAvailable: number } | null>(null);
  const [stats, setStats] = useState<OnboardingStats | null>(null);
  
  // Financial Analytics state
  const [analyticsSummary, setAnalyticsSummary] = useState<any | null>(null);
  const [analyticsCollaborators, setAnalyticsCollaborators] = useState<any[]>([]);
  const [trafficStats, setTrafficStats] = useState<any | null>(null);

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

  // Collaborator Details modal states
  const [detailModalCollab, setDetailModalCollab] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'products' | 'sales' | 'affiliates' | 'founder'>('overview');
  const [collabDetailsData, setCollabDetailsData] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // States for updating plan within details view
  const [detailPlanType, setDetailPlanType] = useState<'ebook_creator' | 'course_creator'>('ebook_creator');
  const [detailPlanExpiry, setDetailPlanExpiry] = useState('');
  const [detailCollabStatus, setDetailCollabStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [updatingDetailPlan, setUpdatingDetailPlan] = useState(false);

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
          setGlobalFunds(data.globalFunds || null);
          setGlobalFundsAoa(data.globalFundsAoa || null);
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

      if (activeTab === 'analytics') {
        const [resSummary, resTraffic] = await Promise.all([
          fetch(`${BACKEND_URL}/api/admin/collaborators/analytics`, {
            headers: { 'x-admin-key': ADMIN_KEY }
          }),
          fetch(`${BACKEND_URL}/api/admin/collaborators/traffic-stats`, {
            headers: { 'x-admin-key': ADMIN_KEY }
          })
        ]);
        const dataSummary = await resSummary.json();
        const dataTraffic = await resTraffic.json();

        if (dataSummary.success && dataTraffic.success) {
          setAnalyticsSummary(dataSummary.summary || null);
          setAnalyticsCollaborators(dataSummary.collaborators || []);
          setGlobalFunds(dataSummary.globalFunds || null);
          setGlobalFundsAoa(dataSummary.globalFundsAoa || null);
          setTrafficStats(dataTraffic || null);
        } else {
          throw new Error(dataSummary.error || dataTraffic.error || 'Erro ao carregar dados analíticos.');
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

  async function handleViewDetails(collab: any) {
    setDetailModalCollab(collab);
    setDetailTab('overview');
    setLoadingDetails(true);
    setCollabDetailsData(null);
    setDetailPlanType(collab.plan);
    setDetailPlanExpiry(collab.plan_expires_at ? collab.plan_expires_at.split('T')[0] : '');
    setDetailCollabStatus(collab.status);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/${collab.id}/details`, {
        headers: { 'x-admin-key': ADMIN_KEY }
      });
      const data = await res.json();
      if (data.success) {
        setCollabDetailsData(data);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao carregar detalhes do colaborador.');
      setDetailModalCollab(null);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleUpdateDetailPlanSubmit() {
    if (!detailModalCollab) return;
    setUpdatingDetailPlan(true);
    try {
      const { error } = await supabaseAdmin
        .from('collaborators')
        .update({
          plan: detailPlanType,
          plan_expires_at: detailPlanExpiry ? new Date(detailPlanExpiry).toISOString() : null,
          status: detailCollabStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', detailModalCollab.id);

      if (error) throw error;
      notifySuccess('Plano e Status do colaborador atualizados com sucesso!');
      
      // Update local state in details modal
      setDetailModalCollab((prev: any) => prev ? {
        ...prev,
        plan: detailPlanType,
        plan_expires_at: detailPlanExpiry ? new Date(detailPlanExpiry).toISOString() : null,
        status: detailCollabStatus
      } : null);

      // Reload list and details
      void loadData();
      
      // Re-fetch details
      const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/${detailModalCollab.id}/details`, {
        headers: { 'x-admin-key': ADMIN_KEY }
      });
      const data = await res.json();
      if (data.success) {
        setCollabDetailsData(data);
      }
    } catch (err: any) {
      notifyError(err.message || 'Erro ao atualizar plano.');
    } finally {
      setUpdatingDetailPlan(false);
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

  function exportAnalyticsToCSV() {
    if (!analyticsSummary || !analyticsCollaborators || analyticsCollaborators.length === 0) {
      notifyError('Nenhum dado analítico disponível para exportação.');
      return;
    }

    // Define CSV content starting with BOM for UTF-8 compatibility with Excel
    let csvContent = '\uFEFF';

    // Summary section
    csvContent += 'RELATÓRIO FINANCEIRO CODE ENGINE\n';
    csvContent += `Gerado em:;${new Date().toLocaleString('pt-PT')}\n\n`;
    
    csvContent += 'RESUMO GERAL DO ECOSSISTEMA;\n';
    csvContent += ';Ecossistema USD (Internacional);Ecossistema AOA (Angola - Kwanza)\n';
    csvContent += `Total Vendido;${analyticsSummary.totalSalesUSD.toFixed(2).replace('.', ',')};${analyticsSummary.totalSalesAOA.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Capital/Receita Code Engine;${analyticsSummary.totalPlatformRevenueUSD.toFixed(2).replace('.', ',')};${analyticsSummary.totalPlatformRevenueAOA.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Lucro Líquido Code Engine;${analyticsSummary.totalPlatformRevenueUSD.toFixed(2).replace('.', ',')};${analyticsSummary.totalPlatformRevenueAOA.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Total Pago (Saques Concluídos);${analyticsSummary.totalPaidOutUSD.toFixed(2).replace('.', ',')};${analyticsSummary.totalPaidOutAOA.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Total Devido (A Pagar);${analyticsSummary.totalOwedUSD.toFixed(2).replace('.', ',')};${analyticsSummary.totalOwedAOA.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Média de Ganhos por Colaborador;${analyticsSummary.avgEarningsUSD.toFixed(2).replace('.', ',')};${analyticsSummary.avgEarningsAOA.toFixed(2).replace('.', ',')}\n\n`;

    // Collaborators table header
    csvContent += 'ANÁLISE INDIVIDUAL DE COLABORADORES;\n';
    csvContent += 'Nome;E-mail;Plano;Método de Payout;Detalhes Payout/Conta FaciPay;';
    csvContent += 'Acumulado USD;Disponível USD;Em Garantia USD;Em Processamento USD;Pago USD;';
    csvContent += 'Acumulado AOA;Disponível AOA;Em Garantia AOA;Em Processamento AOA;Pago AOA\n';

    // Collaborators lines
    for (const c of analyticsCollaborators) {
      const payoutDetails = c.payout_method === 'paypal' 
        ? c.payout_info?.email || ''
        : c.payout_method === 'iban' 
          ? `${c.payout_info?.bankName || ''} - IBAN: ${c.payout_info?.iban || ''}` 
          : c.facipay_account || '';

      csvContent += `"${c.display_name.replace(/"/g, '""')}";`;
      csvContent += `"${c.email.replace(/"/g, '""')}";`;
      csvContent += `"${c.plan === 'course_creator' ? 'Course Creator' : 'Ebook Creator'}";`;
      csvContent += `"${c.payout_method || ''}";`;
      csvContent += `"${payoutDetails.replace(/"/g, '""')}";`;
      
      csvContent += `${c.usd.accumulated_earnings.toFixed(2).replace('.', ',')};`;
      csvContent += `${c.usd.available_balance.toFixed(2).replace('.', ',')};`;
      csvContent += `${c.usd.guarantee_balance.toFixed(2).replace('.', ',')};`;
      csvContent += `${c.usd.processing_balance.toFixed(2).replace('.', ',')};`;
      csvContent += `${c.usd.withdrawn_amount.toFixed(2).replace('.', ',')};`;

      csvContent += `${c.aoa.accumulated_earnings.toFixed(2).replace('.', ',')};`;
      csvContent += `${c.aoa.available_balance.toFixed(2).replace('.', ',')};`;
      csvContent += `${c.aoa.guarantee_balance.toFixed(2).replace('.', ',')};`;
      csvContent += `${c.aoa.processing_balance.toFixed(2).replace('.', ',')};`;
      csvContent += `${c.aoa.withdrawn_amount.toFixed(2).replace('.', ',')}\n`;
    }

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CodeEngine_Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notifySuccess('Folha de cálculo financeira exportada com sucesso para Excel!');
  }

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
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'analytics'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <TrendingUp size={16} /> Análise Financeira
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
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <span className="text-sm text-gray-700 font-medium">
                    <span className="font-bold text-blue-600">{selectedCandidateIds.length}</span> candidatos selecionados para aprovação em massa.
                  </span>
                  <button
                    onClick={handleBulkApproveCandidates}
                    disabled={actionLoading !== null}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all"
                  >
                    Aprovar Candidaturas Selecionadas
                  </button>
                </div>
              )}

              {/* Section 1: Pending Candidates */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 text-base">Registo de Criadores</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 border border-green-200 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      <CheckCircle size={12} /> Aprovação Automática Activa
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">O sistema aprova criadores automaticamente no registo</span>
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
                      <th className="px-6 py-4">Data de Adesão</th>
                      <th className="px-6 py-4">Expira em</th>
                      <th className="px-6 py-4">Payout Esperado</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {candidates.filter(c => c.status === 'approved').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-400">Nenhum colaborador parceiro ativo no momento.</td>
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
                            {cand.created_at ? new Date(cand.created_at).toLocaleDateString('pt-BR') : '—'}
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
                                onClick={() => handleViewDetails(cand)}
                                className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-all"
                              >
                                Ficha Completa
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
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <span className="text-sm text-gray-700 font-medium">
                    <span className="font-bold text-blue-600">{selectedProductIds.length}</span> produtos selecionados para aprovação em massa.
                  </span>
                  <button
                    onClick={handleBulkApproveProducts}
                    disabled={actionLoading !== null}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all"
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
            <div className="space-y-6">

              {globalFunds && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                      <DollarSign size={16} className="text-blue-400" /> Ecossistema USD · Fundos na Plataforma
                    </span>
                    <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">USD</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 text-center">
                      <div className="flex justify-center text-amber-400 mb-2"><ShieldCheck size={20} /></div>
                      <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">Em Garantia (D1-D3)</div>
                      <div className="text-lg font-bold text-white font-mono">
                        ${(globalFunds.totalGuarantee || 0).toFixed(2)}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Período de reembolso activo</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/25 rounded-xl p-4 text-center">
                      <div className="flex justify-center text-blue-400 mb-2"><Clock size={20} /></div>
                      <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">Processando (D4-D6)</div>
                      <div className="text-lg font-bold text-white font-mono">
                        ${(globalFunds.totalProcessing || 0).toFixed(2)}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">A liquidar pelo Stripe</p>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/25 rounded-xl p-4 text-center">
                      <div className="flex justify-center text-green-400 mb-2"><CheckCircle size={20} /></div>
                      <div className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-1">Disponível (Dia 7+)</div>
                      <div className="text-lg font-bold text-white font-mono">
                        ${(globalFunds.totalAvailable || 0).toFixed(2)}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Passível de saque</p>
                    </div>
                  </div>
                </div>
              )}
 
              {/* AOA Fund State Summary */}
              {globalFundsAoa && (
                <div className="bg-gradient-to-r from-amber-950 to-amber-900 rounded-xl border border-amber-700 p-5 mt-4 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                      <Landmark size={16} className="text-amber-400" /> Ecossistema AOA · Fundos na Plataforma (Kwanza)
                    </span>
                    <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">AOA</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 text-center">
                      <div className="flex justify-center text-amber-400 mb-2"><ShieldCheck size={20} /></div>
                      <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">Em Garantia (D1-D3)</div>
                      <div className="text-lg font-bold text-white font-mono">
                        Kz {(globalFundsAoa.totalGuarantee || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Período de reembolso activo</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/25 rounded-xl p-4 text-center">
                      <div className="flex justify-center text-blue-400 mb-2"><Clock size={20} /></div>
                      <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">Processando (D4-D6)</div>
                      <div className="text-lg font-bold text-white font-mono">
                        Kz {(globalFundsAoa.totalProcessing || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">A liquidar pela plataforma</p>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/25 rounded-xl p-4 text-center">
                      <div className="flex justify-center text-green-400 mb-2"><CheckCircle size={20} /></div>
                      <div className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-1">Disponível (Dia 7+)</div>
                      <div className="text-lg font-bold text-white font-mono">
                        Kz {(globalFundsAoa.totalAvailable || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Passível de saque</p>
                    </div>
                  </div>
                </div>
              )}

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
                          {w.currency === 'AOA' || (!w.currency && w.collaborators?.payout_method === 'iban')
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
            <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm max-w-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-150 pb-4 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 font-display">Preços e Link de Assinatura</h3>
                  <p className="text-xs text-gray-500 mt-1">Configurações globais dos planos pagos para os colaboradores (upgrade para Course Creator).</p>
                </div>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-sm text-white hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm hover:shadow"
                >
                  {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
                </button>
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
                className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-all disabled:opacity-50"
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
                    <div className="flex items-center gap-1"><BookOpen size={14} className="text-blue-500" /> Ebooks: <span className="font-bold text-gray-800">{stats.formats.ebooks}</span></div>
                    <div className="flex items-center gap-1"><Video size={14} className="text-purple-500" /> Vídeos: <span className="font-bold text-gray-800">{stats.formats.courses}</span></div>
                    <div className="flex items-center gap-1"><Wrench size={14} className="text-amber-500" /> Tools: <span className="font-bold text-gray-800">{stats.formats.tools}</span></div>
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
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${stats.totalApplications ? (stats.formats.ebooks / stats.totalApplications) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span>Cursos em Vídeo (Vídeo / Aulas)</span>
                        <span>{stats.formats.courses} ({stats.totalApplications ? Math.round((stats.formats.courses / stats.totalApplications) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${stats.totalApplications ? (stats.formats.courses / stats.totalApplications) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span>Ferramentas Digitais / Plugins / Softwares</span>
                        <span>{stats.formats.tools} ({stats.totalApplications ? Math.round((stats.formats.tools / stats.totalApplications) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${stats.totalApplications ? (stats.formats.tools / stats.totalApplications) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span>Ingressos para Eventos</span>
                        <span>{stats.formats.events} ({stats.totalApplications ? Math.round((stats.formats.events / stats.totalApplications) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${stats.totalApplications ? (stats.formats.events / stats.totalApplications) * 100 : 0}%` }} />
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

          {/* TAB 7: Financial Analytics */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-4 mb-6 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 font-display">Resumo Financeiro & Balanço Patrimonial</h3>
                  <p className="text-xs text-gray-500 mt-1">Análise consolidada do capital, faturamento, lucros e saldos de colaboradores da Code Engine.</p>
                </div>
                <button
                  onClick={exportAnalyticsToCSV}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-6 py-2.5 shadow-sm hover:shadow transition-all"
                >
                  <Download size={16} /> Exportar Relatório Excel (CSV)
                </button>
              </div>

              {analyticsSummary && (
                <div className="space-y-6">
                  {/* Ecosystem breakdown grids */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* USD ECOSYSTEM CARD */}
                    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-6 shadow-lg space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
                            <DollarSign size={18} />
                          </div>
                          <h4 className="font-bold text-white tracking-wide uppercase text-sm">Ecossistema USD (Stripe/Internacional)</h4>
                        </div>
                        <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2.5 py-0.5">USD</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Faturamento Total</span>
                          <span className="text-xl font-bold text-white block mt-1 font-mono">${analyticsSummary.totalSalesUSD.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Capital / Comissão CE</span>
                          <span className="text-xl font-bold text-green-400 block mt-1 font-mono">${analyticsSummary.totalPlatformRevenueUSD.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pago aos Colaboradores</span>
                          <span className="text-xl font-bold text-slate-300 block mt-1 font-mono">${analyticsSummary.totalPaidOutUSD.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Média de Ganhos/Criador</span>
                          <span className="text-xl font-bold text-slate-300 block mt-1 font-mono">${analyticsSummary.avgEarningsUSD.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="bg-slate-800/25 border border-slate-800 rounded-xl p-4 space-y-3">
                        <span className="text-xs font-bold text-white uppercase tracking-wider block">Total Devido (A Pagar): ${analyticsSummary.totalOwedUSD.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-slate-800/60 p-2.5 rounded-lg">
                            <div className="text-amber-400 font-semibold mb-0.5 flex items-center justify-center gap-1">
                              <ShieldCheck size={12} /> Garantia
                            </div>
                            <div className="font-bold font-mono text-slate-200">${globalFunds?.totalGuarantee?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0,00'}</div>
                          </div>
                          <div className="bg-slate-800/60 p-2.5 rounded-lg">
                            <div className="text-blue-400 font-semibold mb-0.5 flex items-center justify-center gap-1">
                              <Clock size={12} /> Proc.
                            </div>
                            <div className="font-bold font-mono text-slate-200">${globalFunds?.totalProcessing?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0,00'}</div>
                          </div>
                          <div className="bg-slate-800/60 p-2.5 rounded-lg">
                            <div className="text-green-400 font-semibold mb-0.5 flex items-center justify-center gap-1">
                              <CheckCircle size={12} /> Disp.
                            </div>
                            <div className="font-bold font-mono text-slate-200">${globalFunds?.totalAvailable?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) || '0,00'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AOA ECOSYSTEM CARD */}
                    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-6 shadow-lg space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                            <Landmark size={18} />
                          </div>
                          <h4 className="font-bold text-white tracking-wide uppercase text-sm">Ecossistema AOA (Angola - Kwanza)</h4>
                        </div>
                        <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2.5 py-0.5">AOA</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Faturamento Total</span>
                          <span className="text-xl font-bold text-white block mt-1 font-mono">{analyticsSummary.totalSalesAOA.toLocaleString('pt-AO')} Kz</span>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Capital / Comissão CE</span>
                          <span className="text-xl font-bold text-green-400 block mt-1 font-mono">{analyticsSummary.totalPlatformRevenueAOA.toLocaleString('pt-AO')} Kz</span>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pago aos Colaboradores</span>
                          <span className="text-xl font-bold text-slate-300 block mt-1 font-mono">{analyticsSummary.totalPaidOutAOA.toLocaleString('pt-AO')} Kz</span>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Média de Ganhos/Criador</span>
                          <span className="text-xl font-bold text-slate-300 block mt-1 font-mono">{analyticsSummary.avgEarningsAOA.toLocaleString('pt-AO')} Kz</span>
                        </div>
                      </div>

                      <div className="bg-slate-800/25 border border-slate-800 rounded-xl p-4 space-y-3">
                        <span className="text-xs font-bold text-white uppercase tracking-wider block">Total Devido (A Pagar): {analyticsSummary.totalOwedAOA.toLocaleString('pt-AO')} Kz</span>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-slate-800/60 p-2.5 rounded-lg">
                            <div className="text-amber-400 font-semibold mb-0.5 flex items-center justify-center gap-1">
                              <ShieldCheck size={12} /> Garantia
                            </div>
                            <div className="font-bold font-mono text-slate-200">{globalFundsAoa?.totalGuarantee?.toLocaleString('pt-AO') || '0'} Kz</div>
                          </div>
                          <div className="bg-slate-800/60 p-2.5 rounded-lg">
                            <div className="text-blue-400 font-semibold mb-0.5 flex items-center justify-center gap-1">
                              <Clock size={12} /> Proc.
                            </div>
                            <div className="font-bold font-mono text-slate-200">{globalFundsAoa?.totalProcessing?.toLocaleString('pt-AO') || '0'} Kz</div>
                          </div>
                          <div className="bg-slate-800/60 p-2.5 rounded-lg">
                            <div className="text-green-400 font-semibold mb-0.5 flex items-center justify-center gap-1">
                              <CheckCircle size={12} /> Disp.
                            </div>
                            <div className="font-bold font-mono text-slate-200">{globalFundsAoa?.totalAvailable?.toLocaleString('pt-AO') || '0'} Kz</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collaborator details section */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                      <h3 className="font-semibold text-gray-900 text-base font-display">Balanço Individual por Colaborador</h3>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-400">
                          <th className="px-6 py-4">Colaborador</th>
                          <th className="px-6 py-4">Plano</th>
                          <th className="px-6 py-4">Informação de Payout</th>
                          <th className="px-6 py-4 text-center">Faturamento & Payout (USD)</th>
                          <th className="px-6 py-4 text-center">Faturamento & Payout (AOA)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analyticsCollaborators.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-gray-400">Nenhum colaborador parceiro com dados registrados.</td>
                          </tr>
                        ) : (
                          analyticsCollaborators.map((c) => (
                            <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-semibold text-gray-900 text-sm">{c.display_name}</div>
                                <div className="text-[11px] text-gray-500 mt-0.5">{c.email}</div>
                              </td>
                              <td className="px-6 py-4 capitalize text-[10px]">
                                {c.plan === 'course_creator' ? (
                                  <span className="text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full font-semibold border border-purple-100">Course Creator</span>
                                ) : (
                                  <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-semibold border border-blue-100">Ebook Creator</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-[10px] text-gray-600 max-w-xs truncate">
                                {c.payout_method === 'paypal' && (
                                  <div>
                                    <span className="font-bold uppercase text-gray-400 block text-[8px]">PayPal Email</span>
                                    <span>{c.payout_info?.email || 'N/A'}</span>
                                  </div>
                                )}
                                {c.payout_method === 'iban' && (
                                  <div>
                                    <span className="font-bold uppercase text-gray-400 block text-[8px]">IBAN / Transferência</span>
                                    <span className="font-mono">{c.payout_info?.bankName} - {c.payout_info?.iban}</span>
                                  </div>
                                )}
                                {c.payout_method === 'facipay' && (
                                  <div>
                                    <span className="font-bold uppercase text-gray-400 block text-[8px]">Conta FaciPay (P2P)</span>
                                    <span className="font-mono">{c.facipay_account || 'N/A'}</span>
                                  </div>
                                )}
                                {!c.payout_method && <span className="text-gray-400">Não configurado</span>}
                              </td>
                              <td className="px-6 py-4">
                                <div className="grid grid-cols-2 gap-x-4 text-[10px] max-w-xs mx-auto">
                                  <div>
                                    <span className="text-gray-400 block text-[9px]">Acumulado:</span>
                                    <span className="font-semibold text-gray-900 font-mono">${c.usd.accumulated_earnings.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block text-[9px]">Pago/Sacado:</span>
                                    <span className="font-semibold text-green-600 font-mono">${c.usd.withdrawn_amount.toFixed(2)}</span>
                                  </div>
                                  <div className="col-span-2 border-t border-gray-100 mt-1.5 pt-1 flex justify-between text-[9px] text-gray-500 gap-2">
                                    <span>Disp: ${c.usd.available_balance.toFixed(2)}</span>
                                    <span>Garantia: ${c.usd.guarantee_balance.toFixed(2)}</span>
                                    <span>Proc: ${c.usd.processing_balance.toFixed(2)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="grid grid-cols-2 gap-x-4 text-[10px] max-w-xs mx-auto">
                                  <div>
                                    <span className="text-gray-400 block text-[9px]">Acumulado:</span>
                                    <span className="font-semibold text-gray-900 font-mono">{c.aoa.accumulated_earnings.toLocaleString('pt-AO')} Kz</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block text-[9px]">Pago/Sacado:</span>
                                    <span className="font-semibold text-green-600 font-mono">{c.aoa.withdrawn_amount.toLocaleString('pt-AO')} Kz</span>
                                  </div>
                                  <div className="col-span-2 border-t border-gray-100 mt-1.5 pt-1 flex justify-between text-[9px] text-gray-500 gap-2">
                                    <span>Disp: {c.aoa.available_balance.toLocaleString('pt-AO')} Kz</span>
                                    <span>Garantia: {c.aoa.guarantee_balance.toLocaleString('pt-AO')} Kz</span>
                                    <span>Proc: {c.aoa.processing_balance.toLocaleString('pt-AO')} Kz</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Real-Time Traffic Section */}
                  {trafficStats && trafficStats.traffic && (
                    <div className="grid gap-6 md:grid-cols-3">
                      {/* Active Users 1m */}
                      <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl border border-blue-800 p-5 shadow-lg relative overflow-hidden">
                        <div className="absolute top-3 right-3 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </div>
                        <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">Visitantes Ativos Agora</span>
                        <span className="text-3xl font-extrabold block mt-2 font-mono">{trafficStats.traffic.active1Min}</span>
                        <span className="text-[11px] text-blue-300 mt-1 block">Usuários ativos no último minuto</span>
                      </div>

                      {/* Active Users 5m */}
                      <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-5 shadow-lg">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Ativos nos últimos 5 min</span>
                        <span className="text-3xl font-extrabold block mt-2 font-mono text-white">{trafficStats.traffic.active5Min}</span>
                        <span className="text-[11px] text-slate-400 mt-1 block">Sessões únicas ativas recentemente</span>
                      </div>

                      {/* Total Page Views */}
                      <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-5 shadow-lg">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Visualizações Totais</span>
                        <span className="text-3xl font-extrabold block mt-2 font-mono text-white">{trafficStats.traffic.totalPageViews.toLocaleString('pt-AO')}</span>
                        <span className="text-[11px] text-slate-400 mt-1 block">Total acumulado de páginas abertas</span>
                      </div>
                    </div>
                  )}

                  {/* Top Pages & Product Sales Section */}
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Top Visited Pages (1/3 width) */}
                    {trafficStats && trafficStats.traffic && (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm lg:col-span-1">
                        <div className="border-b border-gray-200 px-5 py-4">
                          <h3 className="font-semibold text-gray-900 text-sm font-display flex items-center gap-1.5">
                            <Eye size={16} className="text-blue-500" /> Páginas Mais Visitadas (Últimos 30 Dias)
                          </h3>
                        </div>
                        <div className="p-4">
                          {trafficStats.traffic.topPages && trafficStats.traffic.topPages.length === 0 ? (
                            <p className="text-center py-6 text-gray-400 text-xs">Nenhum tráfego registrado.</p>
                          ) : (
                            <div className="space-y-3">
                              {trafficStats.traffic.topPages.map((page: any, index: number) => (
                                <div key={index} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                                  <span className="font-mono text-gray-600 truncate max-w-[180px]" title={page.path}>
                                    {page.path}
                                  </span>
                                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                                    {page.count} views
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Product Sales Table (2/3 width) */}
                    {trafficStats && trafficStats.sales && (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm lg:col-span-2">
                        <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 text-sm font-display flex items-center gap-1.5">
                            <TrendingUp size={16} className="text-green-500" /> Desempenho e Vendas por Produto
                          </h3>
                          <div className="text-[10px] text-gray-500 font-mono">
                            Faturamento Global: <span className="font-bold text-gray-900">${trafficStats.sales.totalRevenueUSD.toFixed(2)}</span> | <span className="font-bold text-gray-900">{trafficStats.sales.totalRevenueAOA.toLocaleString('pt-AO')} Kz</span>
                          </div>
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
                              {trafficStats.sales.productSales && trafficStats.sales.productSales.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="text-center py-8 text-gray-400 text-xs">Nenhuma venda de produto registrada.</td>
                                </tr>
                              ) : (
                                trafficStats.sales.productSales.map((ps: any) => (
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
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                <Search size={18} /> Revisão de Produto Pendente
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
                      <Download size={14} /> Baixar Capa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(approveAoaModalData)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm"
                    >
                      <Save size={14} /> Baixar Arquivo Principal
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
      {detailModalCollab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-gray-900 font-display">Ficha do Colaborador: {detailModalCollab.display_name}</h3>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  detailModalCollab.status === 'approved' ? 'text-green-700 bg-green-50' :
                  detailModalCollab.status === 'rejected' ? 'text-red-700 bg-red-50' : 'text-amber-700 bg-amber-50'
                }`}>
                  {detailModalCollab.status === 'approved' ? 'Aprovado' :
                   detailModalCollab.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                </span>
              </div>
              <button onClick={() => setDetailModalCollab(null)} className="text-gray-400 hover:text-gray-600 text-sm font-semibold">Fechar</button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200 mb-4 flex-shrink-0">
              <button
                onClick={() => setDetailTab('overview')}
                className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
                  detailTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setDetailTab('products')}
                className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
                  detailTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Produtos ({collabDetailsData?.products?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('sales')}
                className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
                  detailTab === 'sales' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Vendas ({collabDetailsData?.products ? (collabDetailsData.products.length > 0 ? 'Consultar' : '0') : '...'})
              </button>
              <button
                onClick={() => setDetailTab('affiliates')}
                className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
                  detailTab === 'affiliates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Afiliados ({collabDetailsData?.affiliates?.links?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('founder')}
                className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
                  detailTab === 'founder' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🏆 Membro Fundador ({collabDetailsData?.founder?.invited?.length || 0})
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex h-64 items-center justify-center flex-grow">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
              </div>
            ) : (
              <div className="flex-grow">
                {/* TAB: Overview */}
                {detailTab === 'overview' && collabDetailsData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Profile Info */}
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Informações de Perfil</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div><span className="font-semibold text-gray-800">E-mail:</span> {collabDetailsData.collaborator.members?.email}</div>
                          <div><span className="font-semibold text-gray-800">Especialidade:</span> {collabDetailsData.collaborator.specialty}</div>
                          <div><span className="font-semibold text-gray-800">Bio:</span> {collabDetailsData.collaborator.bio || 'Sem bio informada.'}</div>
                          <div><span className="font-semibold text-gray-800">Data de Registo:</span> {new Date(collabDetailsData.collaborator.members?.registration_date).toLocaleDateString('pt-BR')}</div>
                          <div><span className="font-semibold text-gray-800">Plano Atual:</span> <span className="uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-xs">{collabDetailsData.collaborator.plan?.replace('_', ' ')}</span></div>
                          <div><span className="font-semibold text-gray-800">Expiração:</span> {collabDetailsData.collaborator.plan_expires_at ? new Date(collabDetailsData.collaborator.plan_expires_at).toLocaleDateString('pt-BR') : 'Sem expiração (Grátis)'}</div>
                          {collabDetailsData.collaborator.members?.referred_by && (
                            <div className="mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                              Este colaborador foi convidado por outro Membro Fundador.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Dados de Pagamento (Saque)</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div><span className="font-semibold text-gray-800">Método de Saque:</span> <span className="uppercase font-bold text-gray-700">{collabDetailsData.collaborator.payout_method}</span></div>
                          {collabDetailsData.collaborator.payout_method === 'paypal' ? (
                            <div><span className="font-semibold text-gray-800">E-mail PayPal:</span> {collabDetailsData.collaborator.payout_info?.email}</div>
                          ) : (
                            <>
                              <div><span className="font-semibold text-gray-800">Banco:</span> {collabDetailsData.collaborator.payout_info?.bankName}</div>
                              <div><span className="font-semibold text-gray-800">Conta:</span> {collabDetailsData.collaborator.payout_info?.accountNumber}</div>
                              <div><span className="font-semibold text-gray-800">IBAN:</span> <span className="font-mono text-xs">{collabDetailsData.collaborator.payout_info?.iban}</span></div>
                            </>
                          )}
                          {collabDetailsData.collaborator.facipay_account && (
                            <div className="mt-1 pt-1 border-t border-gray-200"><span className="font-semibold text-gray-800">Conta FaciPay (AOA):</span> <span className="font-mono text-xs text-indigo-600 font-bold">{collabDetailsData.collaborator.facipay_account}</span></div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Balance & Plan Control */}
                    <div className="space-y-4">
                      {/* Financial Balances Card */}
                      {(() => {
                        const isCollabAngola = collabDetailsData?.collaborator?.members?.profile_data?.country === 'AO';
                        return (
                          <div className="bg-gradient-to-br from-gray-900 to-slate-800 text-white p-5 rounded-2xl shadow-md">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Saldos do Colaborador</h4>
                            
                            <div className={`grid ${isCollabAngola ? 'grid-cols-2 divide-x divide-slate-700' : 'grid-cols-1'} gap-4 text-sm`}>
                              {/* USD Balance */}
                              <div className="space-y-2.5">
                                <span className="block text-xs font-bold text-blue-400 uppercase">Carteira USD</span>
                                <div>
                                  <span className="block text-xxs text-slate-400 uppercase">Disponível</span>
                                  <span className="text-base font-bold text-blue-50">{(Number(collabDetailsData.balances.available_balance) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                </div>
                                <div>
                                  <span className="block text-xxs text-slate-400 uppercase">Garantia / Em espera</span>
                                  <span className="text-xs text-slate-300">{(Number(collabDetailsData.balances.guarantee_balance) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                </div>
                                <div>
                                  <span className="block text-xxs text-slate-400 uppercase">Total Ganho</span>
                                  <span className="text-xs font-semibold text-green-400">{(Number(collabDetailsData.balances.accumulated_earnings) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                </div>
                              </div>

                              {/* AOA Balance */}
                              {isCollabAngola && (
                                <div className="space-y-2.5 pl-4 animate-in fade-in slide-in-from-left-2 duration-200">
                                  <span className="block text-xs font-bold text-amber-400 uppercase">Carteira AOA</span>
                                  <div>
                                    <span className="block text-xxs text-slate-400 uppercase">Disponível</span>
                                    <span className="text-base font-bold text-amber-50">{(Number(collabDetailsData.balances.available_balance_aoa) || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</span>
                                  </div>
                                  <div>
                                    <span className="block text-xxs text-slate-400 uppercase">Garantia / Em espera</span>
                                    <span className="text-xs text-slate-300">{(Number(collabDetailsData.balances.guarantee_balance_aoa) || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</span>
                                  </div>
                                  <div>
                                    <span className="block text-xxs text-slate-400 uppercase">Total Ganho</span>
                                    <span className="text-xs font-semibold text-green-400">{(Number(collabDetailsData.balances.accumulated_earnings_aoa) || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Manual Plan Management Form */}
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Gerenciamento de Conta pelo Admin</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tipo de Plano</label>
                            <select
                              value={detailPlanType}
                              onChange={(e: any) => setDetailPlanType(e.target.value)}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-primary focus:outline-none bg-white"
                            >
                              <option value="ebook_creator">Ebook Creator (Grátis)</option>
                              <option value="course_creator">Course Creator ($9/mês)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Expiração do Plano</label>
                            <input
                              type="date"
                              value={detailPlanExpiry}
                              onChange={(e) => setDetailPlanExpiry(e.target.value)}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-primary focus:outline-none bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Status do Colaborador</label>
                            <select
                              value={detailCollabStatus}
                              onChange={(e: any) => setDetailCollabStatus(e.target.value)}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-primary focus:outline-none bg-white"
                            >
                              <option value="pending">Pendente de Análise</option>
                              <option value="approved">Aprovado (Ativo)</option>
                              <option value="rejected">Rejeitado</option>
                            </select>
                          </div>

                          <button
                            onClick={handleUpdateDetailPlanSubmit}
                            disabled={updatingDetailPlan}
                            className="w-full rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 text-xs transition-colors disabled:opacity-50 mt-1"
                          >
                            {updatingDetailPlan ? 'Salvando...' : 'Salvar Alterações'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: Products */}
                {detailTab === 'products' && collabDetailsData && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden text-sm">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 font-bold uppercase text-gray-400">
                          <th className="px-4 py-3">Produto</th>
                          <th className="px-4 py-3">Preço</th>
                          <th className="px-4 py-3">Moeda</th>
                          <th className="px-4 py-3">Status Loja</th>
                          <th className="px-4 py-3">Status Aprovação</th>
                          <th className="px-4 py-3">Data Cadastro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {collabDetailsData.products.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-gray-400">Nenhum produto cadastrado por este colaborador.</td>
                          </tr>
                        ) : (
                          collabDetailsData.products.map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-semibold text-gray-900">{p.title}</td>
                              <td className="px-4 py-3 font-bold text-gray-700">
                                {p.price_currency === 'AOA'
                                  ? Number(p.price).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })
                                  : Number(p.price).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                              </td>
                              <td className="px-4 py-3 uppercase text-gray-400 font-semibold">{p.price_currency}</td>
                              <td className="px-4 py-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  p.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {p.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  p.approval_status === 'approved' ? 'bg-green-50 text-green-700' :
                                  p.approval_status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {p.approval_status === 'approved' ? 'Aprovado' :
                                   p.approval_status === 'rejected' ? 'Rejeitado' : 'Em Análise'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-400">
                                {new Date(p.created_at).toLocaleDateString('pt-BR')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TAB: Sales */}
                {detailTab === 'sales' && (
                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        setLoadingDetails(true);
                        try {
                          const res = await fetch(`${BACKEND_URL}/api/admin/collaborators/${detailModalCollab.id}/sales`, {
                            headers: { 'x-admin-key': ADMIN_KEY }
                          });
                          const data = await res.json();
                          if (data.success) {
                            setCollabDetailsData((prev: any) => ({
                              ...prev,
                              salesData: data
                            }));
                          }
                        } catch (err: any) {
                          notifyError('Erro ao buscar histórico de vendas.');
                        } finally {
                          setLoadingDetails(false);
                        }
                      }}
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white transition-all"
                    >
                      {collabDetailsData?.salesData ? 'Recarregar Histórico de Vendas' : 'Carregar Histórico de Vendas'}
                    </button>

                    {collabDetailsData?.salesData && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                          <div>
                            <span className="block text-xs text-gray-400 font-semibold uppercase">Total Faturado</span>
                            <span className="text-lg font-bold text-gray-800">
                              {detailModalCollab.payout_method === 'iban'
                                ? Number(collabDetailsData.salesData.totalSalesAmount || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })
                                : Number(collabDetailsData.salesData.totalSalesAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs text-gray-400 font-semibold uppercase">Vendas Realizadas</span>
                            <span className="text-lg font-bold text-gray-800">{collabDetailsData.salesData.salesCount || 0}</span>
                          </div>
                        </div>

                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-150 font-bold uppercase text-gray-400">
                                <th className="px-4 py-3">Produto</th>
                                <th className="px-4 py-3">Comprador</th>
                                <th className="px-4 py-3">Valor</th>
                                <th className="px-4 py-3">Data</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {collabDetailsData.salesData.sales.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="text-center py-6 text-gray-400">Nenhuma venda registrada ainda.</td>
                                </tr>
                              ) : (
                                collabDetailsData.salesData.sales.map((sale: any) => (
                                  <tr key={sale.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-semibold text-gray-900">{sale.productTitle}</td>
                                    <td className="px-4 py-3 text-gray-500">{sale.buyerEmail}</td>
                                    <td className="px-4 py-3 font-bold text-gray-900">
                                      {detailModalCollab.payout_method === 'iban'
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
                )}

                {/* TAB: Affiliates */}
                {detailTab === 'affiliates' && collabDetailsData && (
                  <div className="space-y-6">
                    {/* Affiliate Links */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Afiliados Promovendo os Produtos ({collabDetailsData.affiliates.links.length})</h4>
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-150 font-bold uppercase text-gray-400">
                              <th className="px-4 py-3">E-mail do Afiliado</th>
                              <th className="px-4 py-3">Produto</th>
                              <th className="px-4 py-3">Cliques</th>
                              <th className="px-4 py-3">Conversões</th>
                              <th className="px-4 py-3">Parceria Desde</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {collabDetailsData.affiliates.links.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-6 text-gray-400">Nenhum afiliado promovendo ainda.</td>
                              </tr>
                            ) : (
                              collabDetailsData.affiliates.links.map((l: any) => (
                                <tr key={l.id} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-3 font-semibold text-gray-900">{l.affiliateEmail}</td>
                                  <td className="px-4 py-3 text-gray-600">{l.productTitle}</td>
                                  <td className="px-4 py-3 font-bold text-gray-700">{l.clicks || 0}</td>
                                  <td className="px-4 py-3 font-bold text-green-600">{l.conversions || 0}</td>
                                  <td className="px-4 py-3 text-gray-400">{new Date(l.createdAt).toLocaleDateString('pt-BR')}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Affiliate Conversions */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Conversões e Comissões de Afiliados ({collabDetailsData.affiliates.conversions.length})</h4>
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-150 font-bold uppercase text-gray-400">
                              <th className="px-4 py-3">E-mail do Afiliado</th>
                              <th className="px-4 py-3">Produto</th>
                              <th className="px-4 py-3">Comissão Afiliado</th>
                              <th className="px-4 py-3">Status Comissão</th>
                              <th className="px-4 py-3">Data Venda</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {collabDetailsData.affiliates.conversions.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-6 text-gray-400">Nenhuma conversão registrada ainda.</td>
                              </tr>
                            ) : (
                              collabDetailsData.affiliates.conversions.map((c: any) => (
                                <tr key={c.id} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-3 font-semibold text-gray-900">{c.affiliateEmail}</td>
                                  <td className="px-4 py-3 text-gray-600">{c.productTitle}</td>
                                  <td className="px-4 py-3 font-bold text-violet-600">
                                    {c.currency === 'AOA'
                                      ? Number(c.commissionAoa).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })
                                      : Number(c.commissionUsd).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                  </td>
                                  <td className="px-4 py-3 uppercase">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      c.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                                    }`}>
                                      {c.status === 'paid' ? 'Pago' : 'Pendente'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-gray-400">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: Founder Member referrals */}
                {detailTab === 'founder' && collabDetailsData && (() => {
                  const isCollabAngola = collabDetailsData?.collaborator?.members?.profile_data?.country === 'AO';
                  return (
                    <div className="space-y-6">
                      {/* General Referral Statistics Card */}
                      <div className={`grid grid-cols-2 ${isCollabAngola ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <span className="block text-xxs text-gray-400 uppercase font-bold">Membros Convidados</span>
                          <span className="text-xl font-bold text-gray-800">{collabDetailsData.founder.stats.total_invited_members || 0}</span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <span className="block text-xxs text-gray-400 uppercase font-bold">Colaboradores Convertidos</span>
                          <span className="text-xl font-bold text-gray-800">{collabDetailsData.founder.stats.total_invited_collaborators || 0}</span>
                        </div>
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                          <span className="block text-xxs text-blue-500 uppercase font-bold">Comissões Recebidas (USD)</span>
                          <span className="text-xl font-bold text-blue-700">
                            {(Number(collabDetailsData.founder.stats.total_earned_usd) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </span>
                        </div>
                        {isCollabAngola && (
                          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                            <span className="block text-xxs text-amber-600 uppercase font-bold">Comissões Recebidas (AOA)</span>
                            <span className="text-xl font-bold text-amber-700">
                              {(Number(collabDetailsData.founder.stats.total_earned_aoa) || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Table of referrals */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Utilizadores Convidados Diretamente ({collabDetailsData.founder.invited.length})</h4>
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-150 font-bold uppercase text-gray-400">
                                <th className="px-4 py-3">E-mail do Convidado</th>
                                <th className="px-4 py-3">Data de Registo</th>
                                <th className="px-4 py-3">Estado na Plataforma</th>
                                <th className="px-4 py-3">Plano de Criador</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {collabDetailsData.founder.invited.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="text-center py-6 text-gray-400">Nenhum utilizador registado através deste fundador.</td>
                                </tr>
                              ) : (
                                collabDetailsData.founder.invited.map((inv: any) => (
                                  <tr key={inv.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-semibold text-gray-900">{inv.email}</td>
                                    <td className="px-4 py-3 text-gray-400">{new Date(inv.registrationDate).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-4 py-3">
                                      {inv.collaboratorStatus === 'none' ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-50 text-gray-500 uppercase">Membro Comum</span>
                                      ) : (
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                          inv.collaboratorStatus === 'approved' ? 'bg-green-50 text-green-700' :
                                          inv.collaboratorStatus === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                          Criador ({inv.collaboratorStatus})
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 uppercase font-bold text-gray-500">
                                      {inv.collaboratorPlan === 'none' ? '-' : inv.collaboratorPlan?.replace('_', ' ')}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
                className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-all"
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
