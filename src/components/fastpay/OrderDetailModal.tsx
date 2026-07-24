/**
 * OrderDetailModal
 * Admin modal to view FastPay order details, proof image, and approve/reject.
 */
import { useState, useEffect } from 'react';
import {
  X as LucideX,
  CheckCircle as LucideCheckCircle,
  XCircle as LucideXCircle,
  Clock as LucideClock,
  User as LucideUser,
  Package as LucidePackage,
  DollarSign as LucideDollarSign,
  Calendar as LucideCalendar,
  Image as LucideImage,
  FileText as LucideFileText,
  Loader2 as LucideLoader2,
  AlertTriangle as LucideAlertTriangle,
} from 'lucide-react';

const X = LucideX as any;
const CheckCircle = LucideCheckCircle as any;
const XCircle = LucideXCircle as any;
const Clock = LucideClock as any;
const User = LucideUser as any;
const Package = LucidePackage as any;
const DollarSign = LucideDollarSign as any;
const Calendar = LucideCalendar as any;
const Image = LucideImage as any;
const FileText = LucideFileText as any;
const Loader2 = LucideLoader2 as any;
const AlertTriangle = LucideAlertTriangle as any;

interface OrderDetail {
  id: string;
  member_id: string;
  product_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  proof_url: string | null;
  proof_signed_url?: string | null;
  proof_uploaded_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  member?: { id: string; email: string; profile_data?: { name?: string } };
  product?: { id: string; title: string; price: number; cover_url: string };
}

interface OrderDetailModalProps {
  orderId: string;
  onClose: () => void;
  onActionComplete: () => void;
}

import { supabaseAdmin } from '../../lib/supabase-admin';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

export function OrderDetailModal({ orderId, onClose, onActionComplete }: OrderDetailModalProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabaseAdmin
        .from('fastpay_orders')
        .select(`
          *,
          member:members(id, email, profile_data),
          product:products(id, title, price, cover_url, fastpay_link)
        `)
        .eq('id', orderId)
        .single();

      if (dbErr || !data) throw dbErr || new Error('Pedido não encontrado');

      let signedUrl = data.proof_url;
      if (data.proof_url && !data.proof_url.startsWith('http')) {
        const { data: signedData } = await supabaseAdmin
          .storage
          .from('fastpay-proofs')
          .createSignedUrl(data.proof_url, 3600);

        if (signedData?.signedUrl) {
          signedUrl = signedData.signedUrl;
        }
      }

      setOrder({
        ...data,
        proof_signed_url: signedUrl,
      });
    } catch (err: any) {
      console.warn('[OrderDetailModal] DB query failed, trying API fallback...', err);
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/fastpay/orders/${orderId}`, {
          headers: { 'x-admin-key': ADMIN_KEY },
        });
        const data = await res.json();
        if (data.success) {
          setOrder(data.order);
        } else {
          setError(data.error || 'Falha ao carregar pedido');
        }
      } catch (fallbackErr) {
        setError('Erro de conexão ao carregar detalhes do pedido');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!order || actionLoading) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/fastpay/approve/${order.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        onActionComplete();
        onClose();
        return;
      }
    } catch {
      // Backend endpoint unreachable — fallback to direct Supabase update
    }

    try {
      const { error: updateErr } = await supabaseAdmin
        .from('fastpay_orders')
        .update({
          status: 'completed',
          approved_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateErr) throw updateErr;

      await supabaseAdmin.from('purchases').insert({
        member_id: order.member_id,
        product_id: order.product_id,
        amount_paid: 0,
        amount_paid_aoa: order.amount,
        payment_status: 'completed',
        transaction_id: `fastpay_${order.id}`,
        selected_bonus_ids: (order as any).selected_bonus_ids || []
      });

      onActionComplete();
      onClose();
    } catch (dbErr: any) {
      console.error('[OrderDetailModal] handleApprove error:', dbErr);
      setError(dbErr.message || 'Falha ao aprovar pedido');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!order || actionLoading || !rejectionReason.trim()) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/fastpay/reject/${order.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY,
        },
        body: JSON.stringify({ rejection_reason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        onActionComplete();
        onClose();
        return;
      }
    } catch {
      // Backend endpoint unreachable — fallback to direct Supabase update
    }

    try {
      const { error: updateErr } = await supabaseAdmin
        .from('fastpay_orders')
        .update({
          status: 'failed',
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim(),
        })
        .eq('id', order.id);

      if (updateErr) throw updateErr;

      onActionComplete();
      onClose();
    } catch (dbErr: any) {
      console.error('[OrderDetailModal] handleReject error:', dbErr);
      setError(dbErr.message || 'Falha ao rejeitar pedido');
    } finally {
      setActionLoading(false);
    }
  };

  const statusConfig = {
    pending: { label: 'Pendente', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
    completed: { label: 'Aprovado', color: 'text-green-600 bg-green-50', icon: CheckCircle },
    failed: { label: 'Rejeitado', color: 'text-red-600 bg-red-50', icon: XCircle },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">Detalhes do Pedido</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : !order ? (
          <div className="p-6 text-center text-gray-500">Pedido não encontrado</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Status badge */}
            {(() => {
              const cfg = statusConfig[order.status];
              const Icon = cfg.icon;
              return (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${cfg.color}`}>
                  <Icon className="w-4 h-4" />
                  {cfg.label}
                </div>
              );
            })()}

            {/* Order Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Membro</p>
                  <p className="text-sm font-medium text-gray-900">
                    {order.member?.profile_data?.name || 'Sem nome'}
                  </p>
                  <p className="text-xs text-gray-500">{order.member?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Produto</p>
                  <p className="text-sm font-medium text-gray-900">{order.product?.title}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Valor</p>
                  <p className="text-lg font-bold text-gray-900">{Number(order.amount).toFixed(2)} Kz</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Data do Pedido</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(order.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Proof viewer */}
            {order.proof_signed_url && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Comprovativo de Pagamento
                </h3>
                <div className="border rounded-xl overflow-hidden bg-gray-50">
                  {order.proof_url?.endsWith('.pdf') ? (
                    <div className="p-8 text-center">
                      <FileText className="w-16 h-16 text-red-400 mx-auto mb-3" />
                      <a
                        href={order.proof_signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm font-medium"
                      >
                        Abrir PDF em nova aba
                      </a>
                    </div>
                  ) : (
                    <a href={order.proof_signed_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={order.proof_signed_url}
                        alt="Comprovativo"
                        className="w-full max-h-96 object-contain"
                      />
                    </a>
                  )}
                  {order.proof_uploaded_at && (
                    <p className="text-xs text-gray-500 p-3 border-t">
                      Enviado em: {new Date(order.proof_uploaded_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {!order.proof_url && order.status === 'pending' && (
              <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  O membro ainda não enviou o comprovativo de pagamento.
                </p>
              </div>
            )}

            {/* Rejection reason */}
            {order.status === 'failed' && order.rejection_reason && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs text-red-500 uppercase tracking-wider mb-1">Motivo da Rejeição</p>
                <p className="text-sm text-red-700">{order.rejection_reason}</p>
                {order.rejected_at && (
                  <p className="text-xs text-red-400 mt-2">
                    Rejeitado em: {new Date(order.rejected_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            )}

            {/* Approval info */}
            {order.status === 'completed' && order.approved_at && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-xs text-green-500 uppercase tracking-wider mb-1">Aprovado</p>
                <p className="text-sm text-green-700">
                  Aprovado em: {new Date(order.approved_at).toLocaleString('pt-BR')}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Actions */}
            {order.status === 'pending' && !showRejectForm && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl
                             font-medium hover:bg-green-700 transition disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Aprovar
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl
                             font-medium hover:bg-red-700 transition disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Rejeitar
                </button>
              </div>
            )}

            {/* Rejection form */}
            {showRejectForm && (
              <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <h4 className="text-sm font-semibold text-red-700">Motivo da rejeição</h4>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explique o motivo da rejeição..."
                  className="w-full p-3 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500
                             focus:border-red-500 outline-none resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={actionLoading || !rejectionReason.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg
                               font-medium text-sm hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Rejeição'}
                  </button>
                  <button
                    onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}
                    className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
