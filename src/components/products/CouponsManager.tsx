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
import { supabaseAdmin } from '../../lib/supabase-admin';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  description: string | null;
}

interface CouponsManagerProps {
  productId: string;
}

export function CouponsManager({ productId }: CouponsManagerProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    max_uses: null as number | null,
    valid_until: '',
    description: '',
  });

  useEffect(() => {
    loadCoupons();
  }, [productId]);

  async function loadCoupons() {
    try {
      const { data, error } = await supabaseAdmin
        .from('product_coupons')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error loading coupons:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addCoupon() {
    if (!newCoupon.code || newCoupon.discount_value <= 0) {
      alert('Preencha o código e o valor do desconto');
      return;
    }

    try {
      const { error } = await supabaseAdmin
        .from('product_coupons')
        .insert({
          product_id: productId,
          code: newCoupon.code.toUpperCase(),
          discount_type: newCoupon.discount_type,
          discount_value: newCoupon.discount_value,
          max_uses: newCoupon.max_uses,
          valid_from: new Date().toISOString(),
          valid_until: newCoupon.valid_until || null,
          description: newCoupon.description || null,
          is_active: true,
          current_uses: 0,
        });

      if (error) throw error;
      
      setNewCoupon({
        code: '',
        discount_type: 'percentage',
        discount_value: 0,
        max_uses: null,
        valid_until: '',
        description: '',
      });
      
      loadCoupons();
    } catch (error: any) {
      console.error('Error adding coupon:', error);
      alert(`Erro ao criar cupom: ${error.message}`);
    }
  }

  async function toggleCoupon(id: string, isActive: boolean) {
    try {
      const { error } = await supabaseAdmin
        .from('product_coupons')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      loadCoupons();
    } catch (error) {
      console.error('Error toggling coupon:', error);
    }
  }

  async function deleteCoupon(id: string) {
    try {
      const { error } = await supabaseAdmin
        .from('product_coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
    }
  }

  function copyCouponCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCoupon({ ...newCoupon, code });
  }

  if (loading) {
    return <div className="text-center py-8">Carregando cupons...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Criar Novo Cupom</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código do Cupom
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                placeholder="Ex: PROMO2024"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              />
              <button
                onClick={generateRandomCode}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Gerar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Desconto
            </label>
            <select
              value={newCoupon.discount_type}
              onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value as 'percentage' | 'fixed' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="percentage">Porcentagem (%)</option>
              <option value="fixed">Valor Fixo ($)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor do Desconto
            </label>
            <input
              type="number"
              value={newCoupon.discount_value}
              onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) })}
              placeholder={newCoupon.discount_type === 'percentage' ? 'Ex: 10' : 'Ex: 50.00'}
              step={newCoupon.discount_type === 'percentage' ? '1' : '0.01'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Máximo de Usos (opcional)
            </label>
            <input
              type="number"
              value={newCoupon.max_uses || ''}
              onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Ilimitado"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Válido Até (opcional)
            </label>
            <input
              type="date"
              value={newCoupon.valid_until}
              onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={newCoupon.description}
              onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
              placeholder="Ex: Desconto de lançamento"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={addCoupon}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Criar Cupom
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Cupons Ativos ({coupons.filter(c => c.is_active).length})
        </h3>

        {coupons.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">Nenhum cupom criado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`bg-white rounded-lg shadow-sm p-6 border ${
                  coupon.is_active ? 'border-green-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-xl font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                        {coupon.code}
                      </code>
                      <button
                        onClick={() => copyCouponCode(coupon.code, coupon.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Copiar código"
                      >
                        {copiedId === coupon.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    
                    {coupon.description && (
                      <p className="text-sm text-gray-600 mb-2">{coupon.description}</p>
                    )}
                    
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700">
                        <span className="font-semibold">Desconto:</span>{' '}
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : `$ ${coupon.discount_value.toFixed(2)}`}
                      </p>
                      
                      {coupon.max_uses && (
                        <p className="text-gray-700">
                          <span className="font-semibold">Usos:</span>{' '}
                          {coupon.current_uses} / {coupon.max_uses}
                        </p>
                      )}
                      
                      {coupon.valid_until && (
                        <p className="text-gray-700">
                          <span className="font-semibold">Válido até:</span>{' '}
                          {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir este cupom?')) {
                        deleteCoupon(coupon.id);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className={`text-xs font-semibold ${coupon.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                    {coupon.is_active ? 'ATIVO' : 'INATIVO'}
                  </span>
                  <button
                    onClick={() => toggleCoupon(coupon.id, coupon.is_active)}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      coupon.is_active
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {coupon.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
