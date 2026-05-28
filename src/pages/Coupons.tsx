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
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupons Globais</h1>
          <p className="text-sm text-gray-600 mt-1">Válidos em qualquer produto da plataforma</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md text-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Criar Cupom
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="font-semibold mb-4">Novo cupom</h2>
          <div className="grid md:grid-cols-2 gap-4">
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
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => void addCoupon()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Salvar
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Carregando...</p>
        ) : coupons.length === 0 ? (
          <p className="p-8 text-center text-gray-500">Nenhum cupom global.</p>
        ) : (
          <table className="min-w-[750px] lg:min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Desconto</th>
                <th className="px-4 py-3 text-left">Usos</th>
                <th className="px-4 py-3 text-left">Validade</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.discount_type === 'percentage' ? `${c.discount_value}%` : `$ ${c.discount_value}`}
                  </td>
                  <td className="px-4 py-3">
                    {c.usage_count}/{c.usage_limit}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(c.expiration_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {(() => { const s = getCouponStatus(c); return <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>; })()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(c.code);
                        setCopiedId(c.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="p-1 mr-1"
                    >
                      {copiedId === c.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button type="button" onClick={() => void deleteCoupon(c.id)} className="p-1 text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
