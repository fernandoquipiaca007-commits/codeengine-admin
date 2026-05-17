import { useState, useEffect } from 'react';
import { Plus, Trash2, Gift } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase-admin';

interface Bonus {
  id: string;
  title: string;
  description: string;
  original_value: number;
  is_active: boolean;
}

interface BonusesManagerProps {
  productId: string;
}

export function BonusesManager({ productId }: BonusesManagerProps) {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBonus, setNewBonus] = useState({
    title: '',
    description: '',
    original_value: 0,
  });

  useEffect(() => {
    loadBonuses();
  }, [productId]);

  async function loadBonuses() {
    try {
      const { data, error } = await supabaseAdmin
        .from('product_bonuses')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true});

      if (error) throw error;
      setBonuses(data || []);
    } catch (error) {
      console.error('Error loading bonuses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addBonus() {
    if (!newBonus.title || !newBonus.description) return;

    try {
      const { error } = await supabaseAdmin.from('product_bonuses').insert({
        product_id: productId,
        title: newBonus.title,
        description: newBonus.description,
        original_value: newBonus.original_value,
        display_order: bonuses.length,
        is_active: true,
      });

      if (error) throw error;
      setNewBonus({ title: '', description: '', original_value: 0 });
      loadBonuses();
    } catch (error) {
      console.error('Error adding bonus:', error);
    }
  }

  async function deleteBonus(id: string) {
    try {
      const { error } = await supabaseAdmin
        .from('product_bonuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadBonuses();
    } catch (error) {
      console.error('Error deleting bonus:', error);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      const { error } = await supabaseAdmin
        .from('product_bonuses')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      loadBonuses();
    } catch (error) {
      console.error('Error toggling bonus:', error);
    }
  }

  if (loading) return <div className="text-center py-8">Carregando bônus...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Bônus</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
            <input
              type="text"
              value={newBonus.title}
              onChange={(e) => setNewBonus({ ...newBonus, title: e.target.value })}
              placeholder="Ex: Comunidade VIP"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
            <textarea
              value={newBonus.description}
              onChange={(e) => setNewBonus({ ...newBonus, description: e.target.value })}
              placeholder="Ex: Acesso vitalício à comunidade..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor Original (R$)
            </label>
            <input
              type="number"
              value={newBonus.original_value}
              onChange={(e) =>
                setNewBonus({ ...newBonus, original_value: parseFloat(e.target.value) })
              }
              placeholder="997.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <button
            onClick={addBonus}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Adicionar Bônus
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bonuses.map((bonus) => (
          <div
            key={bonus.id}
            className={`bg-white rounded-lg shadow-sm p-6 border ${
              bonus.is_active ? 'border-green-200' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <Gift className="w-8 h-8 text-purple-600" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{bonus.title}</h4>
                <p className="text-sm text-gray-600 mt-2">{bonus.description}</p>
                <p className="text-sm font-semibold text-purple-600 mt-2">
                  Valor: R$ {bonus.original_value.toFixed(2)}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <button
                    onClick={() => toggleActive(bonus.id, bonus.is_active)}
                    className={`text-xs px-3 py-1 rounded ${
                      bonus.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {bonus.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Excluir este bônus?')) deleteBonus(bonus.id);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
