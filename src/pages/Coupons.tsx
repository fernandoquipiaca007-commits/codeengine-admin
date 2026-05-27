import { useState, useEffect } from 'react';
import {
  Plus as LucidePlus,
  Trash2 as LucideTrash2,
  Copy as LucideCopy,
  Check as LucideCheck
} from 'lucide-react';

const Plus = LucidePlus as any;
const Trash2 = LucideTrash2 as any;
const Copy = LucideCopy as any;
const Check = LucideCheck as any;
import { supabaseAdmin } from '../lib/supabase-admin';

interface GlobalCoupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  usage_limit: number;
  usage_count: number;
  expiration_date: string;
  applicable_products: string[] | null;
  created_at: string;
}

function getCouponStatus(c: GlobalCoupon): { label: string; color: string } {
  const now = new Date();
  if (new Date(c.expiration_date) < now) return { label: 'Expirado', color: 'bg-red-100 text-red-700' };
  if (c.usage_count >= c.usage_limit) return { label: 'Esgotado', color: 'bg-gray-200 text-gray-600' };
  return { label: 'Ativo', color: 'bg-green-100 text-green-700' };
}

export default function Coupons() {
  const [coupons, setCoupons] = useState<GlobalCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    usage_limit: 100,
    expiration_date: '',
  });

  useEffect(() => {
    void loadCoupons();
  }, []);

  async function loadCoupons() {
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCoupons((data as GlobalCoupon[]) || []);
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar cupons globais');
    } finally {
      setLoading(false);
    }
  }

  function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewCoupon({ ...newCoupon, code });
  }

  async function addCoupon() {
    if (!newCoupon.code || newCoupon.discount_value <= 0) {
      alert('Preencha o código e o valor do desconto');
      return;
    }
    if (!newCoupon.expiration_date) {
      alert('Preencha a data de validade');
      return;
    }
    if (newCoupon.usage_limit <= 0) {
      alert('O limite de usos deve ser maior que zero');
      return;
    }
    const { error } = await supabaseAdmin.from('coupons').insert({
      code: newCoupon.code.toUpperCase(),
      discount_type: newCoupon.discount_type,
      discount_value: newCoupon.discount_value,
      usage_limit: newCoupon.usage_limit,
      usage_count: 0,
      expiration_date: new Date(newCoupon.expiration_date).toISOString(),
      applicable_products: null,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setShowForm(false);
    setNewCoupon({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      usage_limit: 100,
      expiration_date: '',
    });
    await loadCoupons();
  }

  async function deleteCoupon(id: string) {
    if (!confirm('Excluir este cupom?')) return;
    await supabaseAdmin.from('coupons').delete().eq('id', id);
    await loadCoupons();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Cupons Globais</h1>
          <p className="text-base text-gray-500 mt-2">Válidos em qualquer produto da plataforma</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className={`inline-flex items-center justify-center px-6 py-3 font-bold rounded-xl shadow-lg transition-all active:scale-95 ${showForm ? 'bg-gray-500 text-white shadow-gray-200' : 'bg-primary-600 text-white shadow-primary-100 hover:bg-primary-700'}`}
        >
          {showForm ? <Plus className="w-5 h-5 mr-2 rotate-45" /> : <Plus className="w-5 h-5 mr-2" />}
          {showForm ? 'Cancelar' : 'Criar Cupom'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 lg:p-8 mb-10 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-primary-600 rounded-full" />
            Novo Cupom
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium">Código</label>
              <div className="flex gap-2 mt-1">
                <input
                  className="flex-1 border rounded-md px-3 py-2 uppercase"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                />
                <button type="button" onClick={generateRandomCode} className="px-3 border rounded-md text-sm">
                  Gerar
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <select
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={newCoupon.discount_type}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, discount_type: e.target.value as 'percentage' | 'fixed' })
                }
              >
                <option value="percentage">Percentual</option>
                <option value="fixed">Valor fixo</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">
                Valor {newCoupon.discount_type === 'percentage' ? '(%)' : '($)'}
              </label>
              <input
                type="number"
                min="0"
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={newCoupon.discount_value || ''}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Limite de Usos</label>
              <input
                type="number"
                min="1"
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={newCoupon.usage_limit || ''}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, usage_limit: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Validade *</label>
              <input
                type="datetime-local"
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={newCoupon.expiration_date}
                onChange={(e) => setNewCoupon({ ...newCoupon, expiration_date: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button type="button" onClick={() => void addCoupon()} className="flex-1 px-8 py-4 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-100 transition-all active:scale-95">
              Criar Cupom
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 mb-10">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium">Nenhum cupom global encontrado</p>
          </div>
        ) : (
          coupons.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="font-mono font-black text-lg text-primary-600">{c.code}</div>
                {(() => { const s = getCouponStatus(c); return <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold uppercase tracking-tight ${s.color}`}>{s.label}</span>; })()}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Desconto</div>
                  <div className="text-sm font-black text-gray-900">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `$ ${c.discount_value}`}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Uso</div>
                  <div className="text-sm font-bold text-gray-700">{c.usage_count}/{c.usage_limit}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                  Expira em: <span className="text-gray-600 ml-1">{new Date(c.expiration_date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(c.code);
                      setCopiedId(c.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                    className={`p-2 rounded-xl transition-all ${copiedId === c.id ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400 hover:text-gray-600'}`}
                  >
                    {copiedId === c.id ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteCoupon(c.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 font-medium">Nenhum cupom global cadastrado.</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Desconto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Uso</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Validade</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-black text-primary-600 text-base">{c.code}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {c.discount_type === 'percentage' ? (
                      <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600">{c.discount_value}%</span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">$ {c.discount_value}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">
                    <span className="text-gray-900 font-bold">{c.usage_count}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    {c.usage_limit}
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-medium">
                    {new Date(c.expiration_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    {(() => { const s = getCouponStatus(c); return <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-tight ${s.color}`}>{s.label}</span>; })()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(c.code);
                          setCopiedId(c.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className={`p-2 rounded-xl transition-all ${copiedId === c.id ? 'bg-green-50 text-green-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                        title="Copiar código"
                      >
                        {copiedId === c.id ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteCoupon(c.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Excluir cupom"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
